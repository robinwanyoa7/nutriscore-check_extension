/**
 * AlternativesEngine
 * Component Layer: Core Logic
 * Responsibility: Filter and rank alternative products strictly within the same FSAProductCategory.
 */

const AlternativesEngine = {
  DISCLAIMER: "Alternatives are suggested based on nutritional profile similarity within the same food category. This does not constitute dietary advice.",

  // Mock signature for future expansion. 
  // In a real environment, this searches the DB/cache.
  getAlternatives(targetProduct, allProductsDb) {
    if (!targetProduct || !targetProduct.fsaCategory) {
      return { alternatives: [], disclaimer: this.DISCLAIMER };
    }

    const targetCategory = targetProduct.fsaCategory;
    const targetScore = targetProduct.score;

    // Filter strictly by same FSA category
    let validAlts = allProductsDb.filter(prod => 
      prod.fsaCategory === targetCategory && 
      prod.productId !== targetProduct.productId
    );

    // Filter for strictly better scores (lower is better in FSA-NPS)
    validAlts = validAlts.filter(prod => prod.score < targetScore);

    // Sort by best score (lowest FSA score)
    validAlts.sort((a, b) => a.score - b.score);

    // Limit to top 3
    const topAlts = validAlts.slice(0, 3);

    return {
      alternatives: topAlts,
      disclaimer: this.DISCLAIMER
    };
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = { AlternativesEngine };
