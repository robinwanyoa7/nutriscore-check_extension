const ProductNormalizer = {
  STORE_TOKENS: [
    "Naivas",
    "Carrefour",
    "Glovo",
    "Uber Eats",
    "Quickmart",
    "Jumia",
    "Greenspoon",
    "Chandarana"
  ],

  PACKAGING_TOKENS: [
    "PET",
    "Bottle",
    "Pack",
    "Tray",
    "Bag",
    "Promo",
    "Offer",
    "Discount",
    "Today's Deal",
    "Special"
  ],

  WEIGHT_PATTERN: /\b\d+(?:[.,]\d+)?\s*(?:g|kg|l|ml|cl|lb|oz|pcs|pack)\b/gi,

  normalizeProductName(rawName) {
    let cleaned = String(rawName || "")
      .replace(/\s+/g, " ")
      .replace(/\u00A0/g, " ")
      .trim();

    if (!cleaned) return "";

    this.STORE_TOKENS.forEach((token) => {
      cleaned = cleaned.replace(new RegExp(`\\b${token}\\b`, "gi"), " ");
    });

    this.PACKAGING_TOKENS.forEach((token) => {
      cleaned = cleaned.replace(new RegExp(`\\b${token}\\b`, "gi"), " ");
    });

    cleaned = cleaned.replace(this.WEIGHT_PATTERN, " ");
    cleaned = cleaned.replace(/\b(?:Offer|Discount|Today's Deal|Special|Promo)\b/gi, " ");
    cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

    return cleaned;
  },

  buildSearchKey(name) {
    return this.normalizeProductName(name).toLowerCase();
  }
};

if (typeof window !== "undefined") {
  window.ProductNormalizer = ProductNormalizer;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ProductNormalizer };
}
