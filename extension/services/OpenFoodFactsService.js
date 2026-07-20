const OpenFoodFactsService = {
  async searchByBarcode(barcode) {
    if (!barcode) return null;
    return this.searchByName(String(barcode), "barcode");
  },

  async searchByExactName(name) {
    const normalized = ProductNormalizer.normalizeProductName(name);
    if (!normalized) return null;

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(normalized)}&json=1&page_size=5`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const products = Array.isArray(data?.products) ? data.products : [];

    return products.find((product) => {
      const candidate = String(product?.product_name || "").toLowerCase();
      return candidate.includes(normalized.toLowerCase());
    }) || null;
  },

  async searchByBrand(brand, name) {
    const query = `${brand || ""} ${name || ""}`.trim();
    if (!query) return null;
    return this.searchByName(query);
  },

  async searchByName(name) {
    const normalized = ProductNormalizer.normalizeProductName(name);
    if (!normalized) return null;

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(normalized)}&json=1&page_size=5`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const products = Array.isArray(data?.products) ? data.products : [];

    if (!products.length) return null;

    const scored = products.map((product) => {
      const productName = String(product?.product_name || "").toLowerCase();
      const normalizedLower = normalized.toLowerCase();
      let score = 0;

      if (productName === normalizedLower) score += 100;
      else if (productName.includes(normalizedLower)) score += 60;
      else if (normalizedLower.includes(productName)) score += 45;
      else score += 20;

      if (product?.brands && product.brands.toLowerCase().includes(normalizedLower.split(" ")[0])) score += 10;

      return { product, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    return best && best.score >= 20 ? best.product : null;
  },

  normalizeProduct(offProduct) {
    const nutriments = offProduct?.nutriments || {};
    const productName = offProduct?.product_name || offProduct?.product_name_en || "Unknown Product";
    const brand = offProduct?.brands || "Unknown";
    const category = offProduct?.categories || offProduct?.category || "GENERAL_FOOD";

    return {
      id: String(offProduct?.code || `off_${Date.now()}`),
      barcode: String(offProduct?.code || ""),
      name: ProductNormalizer.normalizeProductName(productName),
      brand,
      category: category.toLowerCase().includes("beverage") ? "BEVERAGE" : "GENERAL_FOOD",
      energy: Number(nutriments["energy-kj_100g"] ?? nutriments["energy_100g"] ?? 0),
      sugars: Number(nutriments["sugars_100g"] ?? 0),
      saturatedFat: Number(nutriments["saturated-fat_100g"] ?? 0),
      sodium: Number(nutriments["sodium_100g"] ?? 0) * 1000,
      fiber: Number(nutriments["fiber_100g"] ?? nutriments["fibres_100g"] ?? 0),
      protein: Number(nutriments["proteins_100g"] ?? 0),
      fruitPercentage: Number(nutriments["fruits-vegetables-nuts-estimate-from-ingredients_100g"] ?? 0),
      novaGroup: Number(offProduct?.nova_group || 3),
      nutriScore: offProduct?.nutriscore_grade || "UNKNOWN",
      source: "Open Food Facts",
      image: offProduct?.image_front_url || "",
      price: 0
    };
  },

  async cacheProduct(product) {
    if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.saveProduct) {
      await NutriScoreDB.saveProduct(product);
    }
    return product;
  }
};

if (typeof window !== "undefined") {
  window.OpenFoodFactsService = OpenFoodFactsService;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OpenFoodFactsService };
}
