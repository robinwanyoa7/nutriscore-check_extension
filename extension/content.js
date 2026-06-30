/**
 * Content Script
 * Component Layer: Client / Frontend Extension Layer
 * Responsibility: MutationObserver, DOM Scraping (via Adapter), Messaging
 * Constraints: NO business logic. NO categorisation. NO score math.
 */

class NutriScoreContentEngine {
  constructor() {
    this.adapter = window.RetailerAdapter || null;
    this.processedElements = new Set();
    this.observer = null;
    this.debounceTimer = null;
  }

  init() {
    if (!this.adapter) {
      console.warn("[NutriScore Engine] No RetailerAdapter loaded. Aborting.");
      return;
    }
    console.log(`[NutriScore Engine] Initializing observer for ${this.adapter.getRetailerCode()}...`);
    this.scanAndInject();

    // Set up MutationObserver for lazy items with 150ms debounce
    this.observer = new MutationObserver((mutations) => {
      let shouldScan = mutations.some(m => m.addedNodes.length > 0);
      if (shouldScan) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.scanAndInject();
        }, 150);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  scanAndInject() {
    if (!this.adapter) return;

    const products = this.adapter.detectProducts();

    products.forEach((prodInfo) => {
      const card = prodInfo.domElement;
      
      // Mark immediately to prevent race conditions during async fetches
      card.setAttribute("data-nutriscore-scanned", "pending");
      this.processedElements.add(card);

      // Request product parsing/lookup via Service Worker using V3 Topology Schema
      chrome.runtime.sendMessage(
        { 
          action: "CHECK_PRODUCT_SCORE",
          retailer: this.adapter.getRetailerCode(),
          payload: {
            product_name: prodInfo.name,
            name_hash: prodInfo.nameHash
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("[NutriScore Engine] Message failed: ", chrome.runtime.lastError);
            card.removeAttribute("data-nutriscore-scanned");
            this.processedElements.delete(card);
            return;
          }

          if (response && response.status === "SUCCESS" && response.data) {
            const product = response.data;
            card.setAttribute("data-nutriscore-scanned", "complete");
            card.setAttribute("data-nutriscore-grade", product.nutriscore_grade);

            // Delegate UI rendering back to the adapter
            this.adapter.injectBadge(card, product, prodInfo.price);
          } else {
            card.setAttribute("data-nutriscore-scanned", "failed");
          }
        }
      );
    });
  }
}

// Wait for adapter to load if it's injected before us
setTimeout(() => {
  const engine = new NutriScoreContentEngine();
  engine.init();
}, 500);
