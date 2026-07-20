/**
 * Content Script
 * Component Layer: Client / Frontend Extension Layer
 * Responsibility: MutationObserver, DOM Scraping (via Adapter), Messaging
 * Constraints: NO business logic. NO categorisation. NO score math.
 */

class NutriScoreContentEngine {
  constructor() {
    this.adapter = this.resolveAdapter();
    this.processedElements = new Set();
    this.observer = null;
    this.debounceTimer = null;
  }

  resolveAdapter() {
    const hostname = (window.location.hostname || "").toLowerCase();

    if (window.RetailerAdapter && /naivas/.test(hostname)) {
      return window.RetailerAdapter;
    }

    if (window.GenericRetailerAdapter) {
      return window.GenericRetailerAdapter;
    }

    return window.RetailerAdapter || null;
  }

  init() {
    if (!this.adapter) {
      console.warn("[NutriScore Engine] No RetailerAdapter or GenericRetailerAdapter loaded. Aborting.");
      return;
    }

    const retailerCode = this.adapter.getRetailerCode?.();
    console.log("[NutriScore Engine] Using adapter:", retailerCode || "GENERIC");

    if (retailerCode === "NAIVAS" && !window.location.pathname.includes("/cart")) {
      console.log("[NutriScore] Not on cart page.");
      return;
    }

    console.log(
      `[NutriScore Engine] Initializing observer for ${this.adapter.getRetailerCode()}...`
    );

    this.scanAndInject();

    this.observer = new MutationObserver((mutations) => {
      const shouldScan = mutations.some((m) => m.addedNodes.length > 0);

      if (shouldScan) {
        clearTimeout(this.debounceTimer);

        this.debounceTimer = setTimeout(() => {
          this.scanAndInject();
        }, 150);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  scanAndInject() {
    if (!this.adapter) return;

    const products = this.adapter.detectProducts();
    console.log("[NutriScore Engine] Detected products:", products);

    products.forEach((prodInfo) => {
      const card = prodInfo.domElement;

      if (!card || card.hasAttribute("data-nutriscore-scanned")) {
        return;
      }

      console.log("[NutriScore Engine] Product sent:", prodInfo.name);
      card.setAttribute("data-nutriscore-scanned", "pending");

      chrome.runtime.sendMessage(
        {
          action: "CHECK_PRODUCT_SCORE",
          retailer: this.adapter.getRetailerCode(),
          payload: {
            product_name: prodInfo.name,
            name_hash: prodInfo.nameHash,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[NutriScore Engine] Message failed:",
              chrome.runtime.lastError
            );

            card.removeAttribute("data-nutriscore-scanned");
            return;
          }

          if (response?.status === "SUCCESS" && response.data) {
            card.setAttribute("data-nutriscore-scanned", "complete");
            card.setAttribute(
              "data-nutriscore-grade",
              response.data.nutriscore_grade
            );

            this.adapter.injectBadge(
              card,
              response.data,
              prodInfo.price
            );
            console.log("[NutriScore Engine] Badge injected:", response.data.nutriscore_grade);
          } else {
            console.warn("[NutriScore Engine] Product failed:", prodInfo.name, response);
            card.setAttribute("data-nutriscore-scanned", "failed");
          }
        }
      );
    });
  }
}

// Start the engine
setTimeout(() => {
  const engine = new NutriScoreContentEngine();
  engine.init();
}, 500);