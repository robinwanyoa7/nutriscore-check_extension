/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Production-ready Promise-based IndexedDB Wrapper for Chrome Extensions
const NutriScoreDB = {
  DB_NAME: "NutriScoreCheckoutDB",
  DB_VERSION: 2,
  db: null,

  // Initialize DB & Create Object Stores if they do not exist
  init() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        return resolve(this.db);
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // 1. Cached Products Store (caches OpenFoodFacts lookups)
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "productId" });
        }

        // 2. Scans History Store (for direct grocery shopping audits)
        if (!db.objectStoreNames.contains("scans")) {
          const scanStore = db.createObjectStore("scans", { keyPath: "id", autoIncrement: true });
          scanStore.createIndex("timestamp", "timestamp", { unique: false });
          scanStore.createIndex("retailer", "retailer", { unique: false });
          scanStore.createIndex("productId", "productId", { unique: false });
        }

        // 3. User Historical / Summarized Trends Storage
        if (!db.objectStoreNames.contains("user_history")) {
          db.createObjectStore("user_history", { keyPath: "dateCode" }); // e.g., "2026-W25" or "2026-06-19"
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB opening failed:", event.target.error);
        reject(event.target.error);
      };
    });
  },

  // Save product details
  saveProduct(product) {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("products", "readwrite");
        const store = transaction.objectStore("products");
        const request = store.put(product);

        request.onsuccess = () => resolve(product);
        request.onerror = (e) => reject(e.target.error);
      });
    });
  },

  // Retrieve cached product info
  getProduct(productId) {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("products", "readonly");
        const store = transaction.objectStore("products");
        const request = store.get(String(productId));

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    });
  },

  // Log scan event
  logScan(productId, productName, score, grade, retailer, price = 0, nutritionalData = {}) {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["scans", "user_history"], "readwrite");
        
        // Log individual scan
        const scanStore = transaction.objectStore("scans");
        const scanObj = {
          productId: String(productId),
          name: productName,
          score: Number(score),
          grade: String(grade),
          retailer: String(retailer),
          price: Number(price),
          timestamp: new Date().getTime(),
          nutritionalData
        };
        const scanRequest = scanStore.add(scanObj);

        // Update longitudinal stats aggregates
        const historyStore = transaction.objectStore("user_history");
        const dateCode = new Date().toISOString().split('T')[0]; // Store daily aggregates

        const getHistoryRequest = historyStore.get(dateCode);

        getHistoryRequest.onsuccess = () => {
          let dayHist = getHistoryRequest.result || {
            dateCode,
            totalScans: 0,
            gradesDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0 },
            accumulatedNutrients: { energy: 0, sugars: 0, sat_fat: 0, sodium: 0, fiber: 0, protein: 0 },
            averageScoreSum: 0
          };

          dayHist.totalScans += 1;
          dayHist.gradesDistribution[grade] = (dayHist.gradesDistribution[grade] || 0) + 1;
          dayHist.averageScoreSum += score;
          
          if (nutritionalData) {
            dayHist.accumulatedNutrients.energy += Number(nutritionalData.energy) || 0;
            dayHist.accumulatedNutrients.sugars += Number(nutritionalData.sugars) || 0;
            dayHist.accumulatedNutrients.sat_fat += Number(nutritionalData.sat_fat) || 0;
            dayHist.accumulatedNutrients.sodium += Number(nutritionalData.sodium) || 0;
            dayHist.accumulatedNutrients.fiber += Number(nutritionalData.fiber) || 0;
            dayHist.accumulatedNutrients.protein += Number(nutritionalData.protein) || 0;
          }

          historyStore.put(dayHist);
        };

        transaction.oncomplete = () => {
          resolve(scanObj);
        };

        transaction.onerror = (e) => {
          console.error("Failed to log scan to DB:", e.target.error);
          reject(e.target.error);
        };
      });
    });
  },

  // Retrieve all logged scans
  getAllScans() {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("scans", "readonly");
        const store = transaction.objectStore("scans");
        const request = store.getAll();

        request.onsuccess = () => {
          // Sort scans by timestamp descending
          const sorted = (request.result || []).sort((a, b) => b.timestamp - a.timestamp);
          resolve(sorted);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    });
  },

  // Retrieve daily trends
  getHistoricalTrends() {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction("user_history", "readonly");
        const store = transaction.objectStore("user_history");
        const request = store.getAll();

        request.onsuccess = () => {
          const sorted = (request.result || []).sort((a, b) => a.dateCode.localeCompare(b.dateCode));
          resolve(sorted);
        };
        request.onerror = (e) => reject(e.target.error);
      });
    });
  },

  clearScans() {
    return this.init().then((db) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["scans", "user_history"], "readwrite");
        const scansStore = transaction.objectStore("scans");
        const historyStore = transaction.objectStore("user_history");

        scansStore.clear();
        historyStore.clear();

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (e) => reject(e.target.error);
      });
    });
  }
};

// Global exports
if (typeof window !== "undefined") {
  window.NutriScoreDB = NutriScoreDB;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NutriScoreDB };
}
