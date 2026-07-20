/**
 * Naivas Retailer Adapter
 * Implements IRetailerAdapter contract
 */

const NaivasAdapter = {
  getRetailerCode() {
    return "NAIVAS";
  },

  hashText(value) {
    return Array.from(String(value || ""))
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(16);
  },

  detectProducts() {
    const products = [];

    if (!window.location.pathname.includes("/cart")) {
      return products;
    }

    const cartSelectors = [
      ".flex.gap-6.items-center.w-10\\/12",
      ".cart-item",
      "[data-testid='cart-item']",
      ".items-center"
    ];

    const cartItemNodes = cartSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector))
    );

    const uniqueItems = cartItemNodes.filter((item, index, arr) => {
      return arr.indexOf(item) === index;
    });

    uniqueItems.forEach((item) => {
      if (item.hasAttribute("data-nutriscore-scanned")) return;

      const nameEl = item.querySelector(
        'a[wire\\:click^="redirectToProductPage"][title], a[title], a[href*="/product/"]'
      );

      if (!nameEl) return;

      const name = nameEl.getAttribute("title") || nameEl.textContent.trim();
      if (!name) return;

      const priceEl = item.querySelector(".font-extrabold, .price, [data-testid='price']");
      const price = parseFloat(
        (priceEl?.textContent || "0").replace(/[^0-9.]/g, "")
      );

      products.push({
        domElement: item,
        name,
        price,
        nameHash: this.hashText(name),
        domElementRef: item
      });
    });

    console.log("[NutriScore] Cart Products:", products);
    return products;
  },

  injectBadge(card, productResult, price) {
    if (card.querySelector(".nutriscore-badge")) {
      return;
    }

    const badgeContainer = document.createElement("div");
    badgeContainer.className = "nutriscore-isolated-root nutriscore-badge";
    badgeContainer.style.position = "absolute";
    badgeContainer.style.top = "8px";
    badgeContainer.style.left = "8px";
    badgeContainer.style.zIndex = "1000";

    // 2. Open a Shadow Root to fully isolate styling from host retailer CSS resets
    const shadow = badgeContainer.attachShadow({ mode: "open" });

    // 3. Inject CSS rules and DOM elements into the Shadow DOM
    const colors = {
      A: { bg: "var(--ns-grade-a, #008246)", txt: "#ffffff", desc: "Excellent Nutritional Quality" },
      B: { bg: "var(--ns-grade-b, #3cb371)", txt: "#ffffff", desc: "Good Nutritional Quality" },
      C: { bg: "var(--ns-grade-c, #ffcc00)", txt: "#111111", desc: "Moderate Nutritional Quality" },
      D: { bg: "var(--ns-grade-d, #ff6600)", txt: "#ffffff", desc: "Poor Nutritional Quality" },
      E: { bg: "var(--ns-grade-e, #e63b2e)", txt: "#ffffff", desc: "Very Low Nutritional Quality" }
    };

    const info = colors[productResult.nutriscore_grade] || colors.C;

    // Build the Disease Warnings HTML
    let diseaseHTML = '';
    if (productResult.diseaseWarnings && productResult.diseaseWarnings.length > 0) {
      diseaseHTML = `
        <div class="ns-disease-warnings">
          <div class="ns-disease-title">⚠️ Dietary Warnings</div>
          ${productResult.diseaseWarnings.map(w => `
            <div class="ns-disease-pill">
              <strong>${this.escapeHTML(w.disease)}</strong>: ${this.escapeHTML(w.condition)} (${this.escapeHTML(w.triggerQuantity)})
            </div>
          `).join('')}
          <div class="ns-disease-disclaimer">${this.escapeHTML(productResult.diseaseDisclaimer || "")}</div>
        </div>
      `;
    }

    const styles = `
      .badge-trigger {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: ${info.bg};
        color: ${info.txt};
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.5px;
        padding: 4px 8px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: transform 0.15s ease;
      }
      .badge-trigger:hover {
        transform: scale(1.05);
      }
      .flyout-panel {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 6px;
        width: 260px;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #333333;
        font-size: 12px;
        z-index: 1000;
        border: 1px solid #eaeaea;
      }
      .flyout-panel.visible {
        display: block;
      }
      .header {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 8px;
        border-bottom: 1px solid #eee;
        padding-bottom: 6px;
      }
      .nova-badge {
        display: inline-block;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .metric-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px dashed #f0f0f0;
      }
      .ns-disease-warnings {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 2px solid #ffebeb;
      }
      .ns-disease-title {
        font-weight: bold;
        color: #d32f2f;
        margin-bottom: 4px;
      }
      .ns-disease-pill {
        background: #ffebee;
        color: #c62828;
        padding: 4px 6px;
        border-radius: 4px;
        margin-bottom: 4px;
        font-size: 10px;
      }
      .ns-disease-disclaimer {
        font-size: 9px;
        color: #757575;
        margin-top: 4px;
        font-style: italic;
      }
    `;

    // Only inject breakdown metrics if they exist
    let breakdownHTML = '';
    const breakdown = productResult.score_details;
    if (breakdown) {
      breakdownHTML = `
        <div class="metric-row"><span>Negative Points</span> <span>${breakdown.N_Points ?? '-'}</span></div>
        <div class="metric-row"><span>Positive Points</span> <span>${breakdown.P_Points ?? '-'}</span></div>
      `;
    }

    shadow.innerHTML = `
      <style>${styles}</style>
      <div class="badge-trigger">
        NutriScore: ${this.escapeHTML(productResult.nutriscore_grade)}
      </div>
      <div class="flyout-panel">
        <div class="header">${this.escapeHTML(productResult.product_name)}</div>
        <div class="nova-badge">NOVA Group: ${this.escapeHTML(productResult.nova?.toString() || "?")}</div>
        ${breakdownHTML}
        ${diseaseHTML}
      </div>
    `;

    // Toggle Flyout functionality
    const trigger = shadow.querySelector(".badge-trigger");
    const panel = shadow.querySelector(".flyout-panel");

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      panel.classList.toggle("visible");
    });

    document.addEventListener("click", (e) => {
      if (e.composedPath && !e.composedPath().includes(badgeContainer)) {
        panel.classList.remove("visible");
      }
    });

    if (getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }
    card.appendChild(badgeContainer);
  },

  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
};

window.RetailerAdapter = NaivasAdapter;