/**
 * FoodClassifier Engine
 * Component Layer: Core Logic
 * Responsibility: Detect FSAProductCategory and run SPF Exclusion Gate.
 */

const FoodClassifier = {
  FSA_CATEGORY: {
    GENERAL_FOOD: "GENERAL_FOOD",
    RED_MEAT:     "RED_MEAT",
    CHEESE:       "CHEESE",
    ADDED_FAT:    "ADDED_FAT",
    BEVERAGE:     "BEVERAGE"
  },

  // SPF-excluded categories per BR-104 & EV-SCI-007
  // EXPLICITLY REMOVED logic for fitness, children < 2, and pregnancy per user constraints.
  SPF_EXCLUDED_KEYWORDS: [
    "supplement", "multivitamin", "vitamin tablet", "meal replacement", "dietary supplement"
  ],

  classify(data) {
    // 1. Exclusion Gate
    const combined = ((data.name || "") + " " + (data.category || "")).toLowerCase();
    const isExcluded = this.SPF_EXCLUDED_KEYWORDS.some(kw => combined.includes(kw));

    if (isExcluded) {
      return { isExcluded: true, fsaCategoryCode: null };
    }

    // 2. FSA Category Classification
    if (data.is_beverage || /\b(juice|drink|soda|water|tea|coffee|milk drink|smoothie|squash)\b/.test(combined)) {
      return { isExcluded: false, fsaCategoryCode: this.FSA_CATEGORY.BEVERAGE };
    }

    if (/\b(beef|lamb|pork|mutton|goat|venison|game meat|red meat|mince|steak|burger|sausage|salami|bacon|ham|hotdog|biltong)\b/.test(combined)) {
      return { isExcluded: false, fsaCategoryCode: this.FSA_CATEGORY.RED_MEAT };
    }

    if (/\b(cheese|cheddar|mozzarella|gouda|parmesan|brie|cream cheese|processed cheese)\b/.test(combined)) {
      return { isExcluded: false, fsaCategoryCode: this.FSA_CATEGORY.CHEESE };
    }

    if (/\b(oil|butter|margarine|lard|ghee|shortening|fat spread|cooking fat)\b/.test(combined)) {
      return { isExcluded: false, fsaCategoryCode: this.FSA_CATEGORY.ADDED_FAT };
    }

    return { isExcluded: false, fsaCategoryCode: this.FSA_CATEGORY.GENERAL_FOOD };
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = { FoodClassifier };
