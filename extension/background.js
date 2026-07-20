/**
 * Background service worker
 * Thin coordinator: keep engine architecture intact while delegating retrieval and OFF normalization to services.
 */
importScripts(
  "db.js",
  "engine/food-classifier.js",
  "engine/score-engine.js",
  "engine/disease-engine.js",
  "engine/alternatives-engine.js",
  "services/ProductNormalizer.js",
  "services/OpenFoodFactsService.js",
  "services/ProductService.js"
);

console.log("NutriScore V3 Service Worker (Component Architecture) active.");

let productCache = null;
let profileCache = null;
let allProductsArray = [];

async function loadDataCaches() {
  if (productCache && profileCache) return;

  try {
    const productsRes = await fetch(chrome.runtime.getURL("data/grocery_products.json"));
    const productsArray = await productsRes.json();
    allProductsArray = productsArray;

    productCache = new Map();
    productsArray.forEach((p) => {
      if (p._originalHash) productCache.set(p._originalHash, p);
      if (p.ProductName) productCache.set(String(p.ProductName).toLowerCase(), p);
    });

    const profilesRes = await fetch(chrome.runtime.getURL("data/nutritional_profiles.json"));
    const profilesArray = await profilesRes.json();
    profileCache = new Map();
    profilesArray.forEach((p) => {
      profileCache.set(p.GroceryProductID, p);
    });

    console.log(`[NutriScore Worker] Loaded ${productCache.size} products and ${profileCache.size} profiles.`);
  } catch (error) {
    console.error("[NutriScore Worker] Failed to load data caches:", error);
    productCache = new Map();
    profileCache = new Map();
  }
}

loadDataCaches();

async function getProductInfo(payload) {
  return ProductService.getProduct(payload);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Service Worker received message action:", message.action);

  if (message.action === "CHECK_PRODUCT_SCORE") {
    getProductInfo(message.payload)
      .then((prod) => {
        if (prod?.status === "NOT_FOUND") {
          sendResponse({
            status: "NOT_FOUND",
            data: {
              product_name: message.payload.product_name,
              nutriscore_grade: "UNKNOWN"
            }
          });
          return;
        }

        if (typeof NutriScoreDB !== "undefined" && NutriScoreDB.logScan && prod?.grade) {
          const currentRetailer = message.retailer || "Unknown Retailer";
          NutriScoreDB.logScan(
            prod.productId,
            prod.name,
            prod.score,
            prod.grade,
            currentRetailer,
            0,
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
        console.warn("[NutriScore Worker] Processing failed:", err.message);
        sendResponse({
          status: "NOT_FOUND",
          data: {
            product_name: message.payload.product_name,
            nutriscore_grade: "UNKNOWN"
          },
          error: err.message
        });
      });

    return true;
  }

  if (message.action === "LOG_SCAN") {
    if (typeof NutriScoreDB === "undefined" || !NutriScoreDB.logScan) {
      sendResponse({ success: false, error: "IndexedDB logging unavailable" });
      return true;
    }

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