const ProductService = {
  runtimeCache: new Map(),

  async getProduct(payload) {
    await loadDataCaches();

    const inputName = String(payload?.product_name || "").trim();
    const normalizedName = ProductNormalizer.normalizeProductName(inputName);
    const cacheKey = String(payload?.name_hash || normalizedName || inputName).toLowerCase();

    console.log("NutriScore Engine started");
    console.log(`Products detected: ${inputName ? 1 : 0}`);
    console.log(`Checking product: ${inputName}`);
    console.log("Searching Runtime Cache");

    const runtimeHit = this.runtimeCache.get(cacheKey);
    if (runtimeHit) {
      console.log("Runtime cache hit.");
      return runtimeHit;
    }

    console.log("Searching IndexedDB");
    const dbHit = await this.lookupIndexedDb(cacheKey);
    if (dbHit) {
      this.runtimeCache.set(cacheKey, dbHit);
      console.log("IndexedDB cache hit.");
      return dbHit;
    }

    console.log("Searching Local Database");
    const localProduct = this.lookupLocalProduct(normalizedName, payload?.name_hash);
    if (localProduct) {
      console.log("Product found locally.");
      const scored = await this.scoreProduct(localProduct, false);
      this.runtimeCache.set(cacheKey, scored);
      await this.cacheProduct(scored, cacheKey);
      return scored;
    }

    console.log("Searching Open Food Facts");
    const offResult = await this.lookupOpenFoodFacts(payload);
    if (offResult) {
      console.log("Product found on Open Food Facts.");
      const scored = await this.scoreProduct(offResult, true);
      this.runtimeCache.set(cacheKey, scored);
      await this.cacheProduct(scored, cacheKey);
      return scored;
    }

    console.log("Product not found on Open Food Facts.");
    return {
      status: "NOT_FOUND",
      product_name: inputName,
      nutriscore_grade: "UNKNOWN"
    };
  },

  async lookupIndexedDb(cacheKey) {
    if (typeof NutriScoreDB === "undefined" || !NutriScoreDB.getProduct) return null;
    const cached = await NutriScoreDB.getProduct(cacheKey);
    return cached || null;
  },

  lookupLocalProduct(searchName, originalHash) {
    let product = null;

    if (originalHash && productCache?.has(originalHash)) {
      product = productCache.get(originalHash);
    } else if (productCache?.has(searchName.toLowerCase())) {
      product = productCache.get(searchName.toLowerCase());
    } else {
      const lowercaseQuery = searchName.toLowerCase();
      for (const [key, prod] of productCache.entries()) {
        if (prod?.ProductName && prod.ProductName.toLowerCase().includes(lowercaseQuery)) {
          product = prod;
          break;
        }
      }
    }

    return product;
  },

  async lookupOpenFoodFacts(payload) {
    const searchName = String(payload?.product_name || "").trim();
    const normalizedName = ProductNormalizer.normalizeProductName(searchName);
    const brand = String(payload?.brand || "").trim();
    const barcode = String(payload?.barcode || "").trim();

    let offProduct = null;

    if (barcode) {
      offProduct = await this.withRetry(() => OpenFoodFactsService.searchByBarcode(barcode));
    }

    if (!offProduct) {
      offProduct = await this.withRetry(() => OpenFoodFactsService.searchByExactName(normalizedName));
    }

    if (!offProduct && brand) {
      offProduct = await this.withRetry(() => OpenFoodFactsService.searchByBrand(brand, normalizedName));
    }

    if (!offProduct) {
      offProduct = await this.withRetry(() => OpenFoodFactsService.searchByName(normalizedName));
    }

    if (!offProduct) return null;

    const normalizedOff = OpenFoodFactsService.normalizeProduct(offProduct);
    await OpenFoodFactsService.cacheProduct(normalizedOff);
    return normalizedOff;
  },

  async withRetry(operation, retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const result = await operation();
        if (result) return result;
      } catch (error) {
        console.warn("[NutriScore Worker] Open Food Facts lookup failed:", error.message);
      }
      attempt += 1;
      if (attempt <= retries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
      }
    }
    return null;
  },

  async scoreProduct(product, fromOff) {
    const profile = fromOff
      ? {
          EnergyKJ: product.energy,
          SugarsG: product.sugars,
          SaturatedFatG: product.saturatedFat,
          SodiumMG: product.sodium,
          FibreG: product.fiber,
          ProteinG: product.protein,
          FVLPercent: product.fruitPercentage,
          NovaGroup: product.novaGroup
        }
      : profileCache.get(product.GroceryProductID) || {};

    const calcData = {
      name: product.ProductName || product.name,
      category: product.FSAProductCategoryCode || product.category || "GENERAL_FOOD",
      is_beverage: (product.FSAProductCategoryCode || product.category || "GENERAL_FOOD") === "BEVERAGE",
      is_raw_food: false,
      energy: Number(profile.EnergyKJ || product.energy || 0),
      sugars: Number(profile.SugarsG || product.sugars || 0),
      sat_fat: Number(profile.SaturatedFatG || product.saturatedFat || 0),
      sodium: Number(profile.SodiumMG || product.sodium || 0),
      fiber: Number(profile.FibreG || product.fiber || 0),
      protein: Number(profile.ProteinG || product.protein || 0),
      fruits_veg_pct: Number(profile.FVLPercent || product.fruitPercentage || 0),
      potassium: 0,
      nova_group: Number(profile.NovaGroup || product.novaGroup || 3)
    };

    console.log("Running FoodClassifier...");
    const classResult = FoodClassifier.classify(calcData);
    if (classResult.isExcluded) {
      throw new Error("Product is excluded by FoodClassifier SPF gate.");
    }

    const categoryCode = classResult.fsaCategoryCode;

    console.log("Running ScoreEngine...");
    const scoreResult = ScoreEngine.score(calcData, categoryCode);

    console.log(`Grade: ${scoreResult.grade}`);

    const diseaseResult = DiseaseEngine.evaluate(calcData);

    const targetForAlt = {
      productId: product.GroceryProductID || product.id,
      fsaCategory: categoryCode,
      score: scoreResult.score
    };

    const altsResult = AlternativesEngine.getAlternatives(targetForAlt, []);

    const formattedProduct = {
      productId: product.GroceryProductID || product.id,
      ...calcData,
      score: scoreResult.score,
      grade: scoreResult.grade,
      fsaCategory: scoreResult.fsaCategory,
      nova: scoreResult.nova,
      algorithmVersion: scoreResult.algorithmVersion,
      breakdown: scoreResult.breakdown,
      diseaseWarnings: diseaseResult.warnings,
      diseaseDisclaimer: diseaseResult.disclaimer,
      alternatives: altsResult.alternatives,
      fromOpenFoodFacts: fromOff,
      source: product.source || "Local Database",
      name: calcData.name,
      image: product.image || ""
    };

    return formattedProduct;
  },

  async cacheProduct(product, cacheKey) {
    if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.saveProduct) {
      await NutriScoreDB.saveProduct({
        ...product,
        productId: String(cacheKey)
      }).catch((e) => console.warn(e));
    }

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({
        ["nutriscore-off-cache::" + cacheKey]: product
      });
    }
  }
};

if (typeof window !== "undefined") {
  window.ProductService = ProductService;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ProductService };
}
