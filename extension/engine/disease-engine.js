/**
 * DiseaseEngine
 * Component Layer: Core Logic
 * Responsibility: Evaluate ingredient quantities against disease constraints (DR-001 to DR-006).
 */

const DiseaseEngine = {
  // Disclaimer required by AI-003 to prevent medical advice framing
  DISCLAIMER: "This information is based on standard thresholds and is not medical advice. Consult a healthcare provider.",

  evaluate(data) {
    const warnings = [];

    // DR-001 / DR-004: Diabetes (Focus on Sugars)
    // Threshold: > 10g sugars per 100g
    if (data.sugars > 10) {
      warnings.push({
        disease: "Diabetes",
        condition: "High Sugar Content",
        triggerQuantity: `${data.sugars}g`,
        msg: "Contains high sugar quantities which may spike blood glucose levels."
      });
    }

    // DR-002 / DR-005: Hypertension / CVD (Focus on Sodium & Saturated Fat)
    // Threshold: > 400mg sodium or > 5g saturated fat per 100g
    if (data.sodium > 400) {
      warnings.push({
        disease: "Hypertension / CVD",
        condition: "High Sodium Content",
        triggerQuantity: `${data.sodium}mg`,
        msg: "High sodium quantities are linked to elevated blood pressure."
      });
    }

    if (data.sat_fat > 5) {
      warnings.push({
        disease: "Cardiovascular Disease",
        condition: "High Saturated Fat",
        triggerQuantity: `${data.sat_fat}g`,
        msg: "High saturated fat quantities can increase LDL cholesterol."
      });
    }

    // DR-003 / DR-006: Kidney Disease (Focus on Protein, Sodium, Potassium)
    // Threshold: > 15g protein or > 300mg potassium or > 400mg sodium per 100g
    if (data.protein > 15) {
      warnings.push({
        disease: "Kidney Disease",
        condition: "High Protein Content",
        triggerQuantity: `${data.protein}g`,
        msg: "High protein quantities can strain compromised kidneys."
      });
    }
    if (data.potassium > 300) {
      warnings.push({
        disease: "Kidney Disease",
        condition: "High Potassium Content",
        triggerQuantity: `${data.potassium}mg`,
        msg: "High potassium quantities must be monitored in kidney disease."
      });
    }

    return {
      warnings: warnings,
      disclaimer: this.DISCLAIMER
    };
  }
};

if (typeof module !== "undefined" && module.exports) module.exports = { DiseaseEngine };
