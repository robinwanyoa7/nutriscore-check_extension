/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Import Core Logic Layer engines
importScripts(
  "db.js", 
  "engine/food-classifier.js", 
  "engine/score-engine.js", 
  "engine/disease-engine.js",
  "engine/alternatives-engine.js"
);

console.log("NutriScore V3 Service Worker (Component Architecture) active.");

// In-memory cache for O(1) lookups
let productCache = null;
let profileCache = null;
let allProductsArray = []; // Used for AlternativesEngine

async function loadDataCaches() {
  if (productCache && profileCache) return;
  
  try {
    const productsRes = await fetch(chrome.runtime.getURL("data/grocery_products.json"));
    const productsArray = await productsRes.json();
    allProductsArray = productsArray;
    productCache = new Map();
    productsArray.forEach(p => {
      if (p._originalHash) productCache.set(p._originalHash, p);
      // Also map by clean name for fallback
      productCache.set(p.ProductName.toLowerCase(), p);
    });

    const profilesRes = await fetch(chrome.runtime.getURL("data/nutritional_profiles.json"));
    const profilesArray = await profilesRes.json();
    profileCache = new Map();
    profilesArray.forEach(p => {
      profileCache.set(p.GroceryProductID, p);
    });
    
    console.log(`[NutriScore Worker] Loaded ${productCache.size} products and ${profileCache.size} profiles.`);
  } catch (error) {
    console.error("[NutriScore Worker] Failed to load data caches:", error);
    productCache = new Map();
    profileCache = new Map();
  }
}

// Ensure caches are loaded on startup
loadDataCaches();

// Crypto hash helper to match Python/Node hashes if needed
async function hashName(name) {
  const msgBuffer = new TextEncoder().encode(name);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getProductInfo(payload) {
  await loadDataCaches();
  const searchName = payload.product_name;
  const originalHash = payload.name_hash;

  let groceryProduct = null;
  
  // 1. O(1) Lookup by exact hash if provided
  if (originalHash && productCache.has(originalHash)) {
    groceryProduct = productCache.get(originalHash);
  } else if (productCache.has(searchName.toLowerCase())) {
    // 2. Lookup by exact name
    groceryProduct = productCache.get(searchName.toLowerCase());
  } else {
    // 3. Fallback to partial name matching for standard local database
    const lowercaseQuery = searchName.toLowerCase();
    for (const [key, prod] of productCache.entries()) {
      if (prod.ProductName && prod.ProductName.toLowerCase().includes(lowercaseQuery)) {
        groceryProduct = prod;
        break;
      }
    }
  }

  if (!groceryProduct) {
    throw new Error("Product not found in normalized database.");
  }

  const profile = profileCache.get(groceryProduct.GroceryProductID) || {};

  // Map to unified evaluation object
  const calcData = {
    name: groceryProduct.ProductName,
    category: groceryProduct.FSAProductCategoryCode || "GENERAL_FOOD",
    is_beverage: groceryProduct.FSAProductCategoryCode === "BEVERAGE",
    is_raw_food: false,
    energy: profile.EnergyKJ || 0,
    sugars: profile.SugarsG || 0,
    sat_fat: profile.SaturatedFatG || 0,
    sodium: profile.SodiumMG || 0,
    fiber: profile.FibreG || 0,
    protein: profile.ProteinG || 0,
    fruits_veg_pct: profile.FVLPercent || 0,
    potassium: 0, // Fallback if missing
    nova_group: 3
  };

  // 1. FoodClassifier [AC-007, AC-008]
  const classResult = FoodClassifier.classify(calcData);
  if (classResult.isExcluded) {
    throw new Error("Product is excluded by FoodClassifier SPF gate.");
  }
  const categoryCode = classResult.fsaCategoryCode;

  // 2. ScoreEngine [AC-009, AC-010]
  const scoreResult = ScoreEngine.score(calcData, categoryCode);

  // 3. DiseaseEngine [AC-011, AC-012]
  const diseaseResult = DiseaseEngine.evaluate(calcData);

  // 4. AlternativesEngine [AC-013, AC-014]
  const targetForAlt = {
    productId: groceryProduct.GroceryProductID,
    fsaCategory: categoryCode,
    score: scoreResult.score
  };
  // To avoid circular dependency loading all products fully, pass just the necessary DB subset.
  // In a real app we might pass a reference to IndexedDB, here we pass the loaded arrays if needed.
  // Note: For this mockup, alternatives calculation is left simple.
  const altsResult = AlternativesEngine.getAlternatives(targetForAlt, []); 

  const formattedProduct = {
    productId: groceryProduct.GroceryProductID,
    ...calcData,
    score:             scoreResult.score,
    grade:             scoreResult.grade,
    fsaCategory:       scoreResult.fsaCategory,
    nova:              scoreResult.nova,
    algorithmVersion:  scoreResult.algorithmVersion,
    breakdown:         scoreResult.breakdown,
    diseaseWarnings:   diseaseResult.warnings,
    diseaseDisclaimer: diseaseResult.disclaimer,
    alternatives:      altsResult.alternatives
  };

  // Cache in products DB asynchronously (Analytics [AC-004])
  if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.saveProduct) {
    NutriScoreDB.saveProduct(formattedProduct).catch(e => console.warn(e));
  }
  
  return formattedProduct;
}

// Background Listener - Synced for Content Engine Routing
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Service Worker received message action:", message.action);

  if (message.action === "CHECK_PRODUCT_SCORE") {
    getProductInfo(message.payload)
      .then((prod) => {
        // Log the scan tracking event details automatically to local IndexedDB
        if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.logScan) {
          const currentRetailer = message.retailer || "Unknown Retailer";
          NutriScoreDB.logScan(
            prod.productId,
            prod.name,
            prod.score,
            prod.grade,
            currentRetailer,
            0, // Optional Price field
            prod
          ).catch((e) => console.warn("[NutriScore Worker] Scan logging skipped:", e.message));
        }

        sendResponse({ 
          status: "SUCCESS", 
          data: {
            product_name: prod.name,
            nutriscore_grade: prod.grade,
            score_details: prod.breakdown,
            diseaseWarnings: prod.diseaseWarnings,
            diseaseDisclaimer: prod.diseaseDisclaimer,
            ...prod
          }
        });
      })
      .catch((err) => {
        console.warn(`[NutriScore Worker] Processing failed:`, err.message);
        sendResponse({ 
          status: "NOT_FOUND", 
          data: {
            product_name: message.payload.product_name,
            nutriscore_grade: "UNKNOWN"
          },
          error: err.message 
        });
      });

    return true; // Strict Manifest V3 evasion: Keeps the message channel alive during async fetch/DB lookups
  }

  // --- Analytical Dashboard Data Hooks ---
  if (message.action === "LOG_SCAN") {
    NutriScoreDB.logScan(
      message.productId,
      message.name,
      message.score,
      message.grade,
      message.retailer,
      message.price,
      message.nutritionalData
    )
      .then((scanObj) => sendResponse({ success: true, data: scanObj }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
