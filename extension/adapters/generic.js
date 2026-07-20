/**
 * GenericRetailerAdapter
 * Lightweight fallback adapter for grocery stores that do not provide a retailer-specific adapter.
 * It only performs DOM scraping and badge injection; no scoring or business logic lives here.
 */

const GenericRetailerAdapter = {
  getRetailerCode() {
    return "GENERIC";
  },

  IGNORE_PATTERNS: /(view cart|checkout|add to cart|remove|quantity|continue shopping|wishlist|delivery|payment|pay now|place order|basket|cart)/i,

  hashText(value) {
    const text = String(value || "").trim();
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return String(hash >>> 0);
  },

  normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/\u00A0/g, " ")
      .trim();
  },

  extractPriceFromText(text) {
    const normalized = String(text || "");
    const match = normalized.match(/\d+(?:[.,]\d{1,2})?/);
    if (!match) return 0;
    return Number(match[0].replace(",", "."));
  },

  isNavigationNode(node) {
    if (!node) return false;
    if (node.tagName === "BUTTON") return true;
    if (node.tagName === "A") {
      const href = String(node.getAttribute("href") || "").toLowerCase();
      const text = String(node.textContent || "").toLowerCase();
      return /cart|checkout|wishlist|delivery|payment|pay|remove|continue shopping|add to cart|basket/.test(text) || /cart|checkout|wishlist|delivery|payment|basket/.test(href);
    }
    return false;
  },

  isIgnoredText(text) {
    return this.IGNORE_PATTERNS.test(String(text || ""));
  },

  extractCandidateText(node) {
    const text = this.normalizeText(
      node.getAttribute("title") ||
      node.getAttribute("alt") ||
      node.getAttribute("aria-label") ||
      node.textContent || ""
    );

    return text && text.length > 2 && !this.isIgnoredText(text) ? text : "";
  },

  findTextCandidate(node) {
    if (!node) return "";

    const selectors = [
      'a[title]',
      'img[alt]',
      '[data-testid*="name"]',
      '[class*="title"]',
      '[class*="name"]',
      'h1, h2, h3, h4, h5, h6',
      'a[href]'
    ];

    for (const selector of selectors) {
      const found = node.querySelector(selector);
      if (!found) continue;

      const text = this.extractCandidateText(found);
      if (text) return text;
    }

    return this.extractCandidateText(node);
  },

  findPriceCandidate(node) {
    const selectors = [
      '[data-testid*="price"]',
      '[class*="price"]',
      '[class*="amount"]',
      'span',
      'div'
    ];

    for (const selector of selectors) {
      const found = node.querySelector(selector);
      if (!found) continue;
      const text = this.normalizeText(found.textContent || "");
      const price = this.extractPriceFromText(text);
      if (price > 0 && !this.isIgnoredText(text)) {
        return price;
      }
    }

    return 0;
  },

  findRealProductContainer(node) {
    if (!node) return null;

    let current = node;
    while (current && current !== document.body) {
      if (current.matches('button, a')) {
        return null;
      }

      const title = this.findTextCandidate(current);
      const price = this.findPriceCandidate(current);

      if (title && price > 0 && !this.isIgnoredText(title)) {
        return current;
      }

      if (current.parentElement && !this.isNavigationNode(current.parentElement)) {
        current = current.parentElement;
      } else {
        break;
      }
    }

    return null;
  },

  detectProducts() {
    const products = [];
    const seenNames = new Set();
    const selectors = [
      'article',
      'li',
      'section',
      '[data-product-id]',
      '[data-testid*="product"]',
      '.product-card',
      '.product',
      '.tile',
      '.item-card',
      '.card',
      '.grid-item'
    ];

    const nodes = [...document.querySelectorAll(selectors.join(","))];

    nodes.forEach((node) => {
      if (!node || node.hasAttribute("data-nutriscore-scanned")) return;
      if (this.isNavigationNode(node)) return;

      const container = this.findRealProductContainer(node);
      if (!container) return;

      const title = this.findTextCandidate(container);
      const price = this.findPriceCandidate(container);
      const normalized = this.normalizeText(title);

      if (!normalized || !title || price <= 0 || this.isIgnoredText(normalized)) return;
      if (seenNames.has(normalized.toLowerCase())) return;

      console.log("[NutriScore] Detected:", normalized);
      console.log("[NutriScore] Product:", normalized);
      console.log("[NutriScore] Price:", price);
      console.log("[NutriScore] Normalized:", normalized);

      products.push({
        name: normalized,
        price,
        nameHash: this.hashText(normalized),
        domElement: container
      });

      seenNames.add(normalized.toLowerCase());
    });

    return products;
  },

  injectBadge(card, productResult, price) {
    if (card.querySelector(".nutriscore-badge")) {
      return;
    }

    const grade = String(productResult?.nutriscore_grade || productResult?.grade || "C").toUpperCase();
    const allowedGrades = { A: true, B: true, C: true, D: true, E: true };
    const safeGrade = allowedGrades[grade] ? grade : "C";

    const badgeContainer = document.createElement("div");
    badgeContainer.className = "nutriscore-isolated-root nutriscore-badge";
    badgeContainer.style.position = "absolute";
    badgeContainer.style.top = "8px";
    badgeContainer.style.left = "8px";
    badgeContainer.style.zIndex = "1000";

    const shadow = badgeContainer.attachShadow({ mode: "open" });
    const gradeColors = {
      A: { bg: "#008246", txt: "#fff" },
      B: { bg: "#3cb371", txt: "#fff" },
      C: { bg: "#ffcc00", txt: "#111" },
      D: { bg: "#ff6600", txt: "#fff" },
      E: { bg: "#e63b2e", txt: "#fff" }
    };
    const colors = gradeColors[safeGrade] || gradeColors.C;

    shadow.innerHTML = `
      <style>
        .badge-trigger {
          font-family: Arial, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          border-radius: 4px;
          background: ${colors.bg};
          color: ${colors.txt};
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,.15);
        }
      </style>
      <div class="badge-trigger">NutriScore: ${safeGrade}</div>
    `;

    if (getComputedStyle(card).position === "static") {
      card.style.position = "relative";
    }

    card.appendChild(badgeContainer);
  }
};

window.GenericRetailerAdapter = GenericRetailerAdapter;
