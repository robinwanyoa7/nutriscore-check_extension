const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// ─────────────────────────────────────────────
// KENYAN STAPLES LOCAL DICTIONARY (Strategy 3)
// Enriched with explicit metrics per specs (Data Dictionary)
// ─────────────────────────────────────────────
const KENYAN_STAPLES = {
  "maize_meal": {
    pattern: /\b(maize meal|ugali|jogoo|soko|pembe)\b/i,
    fsaCategory: "GENERAL_FOOD",
    profile: {
      EnergyKJ: 1470,
      SugarsG: 1.2,
      SaturatedFatG: 0.4,
      SodiumMG: 2, 
      ProteinG: 7.5,
      FibreG: 3.8,
      FVLPercent: 0,
      DataSourceCode: "KENYAN_FALLBACK",
      FibreGEstimated: true
    }
  },
  "refined_sugar": {
    pattern: /\b(sugar|sukari|kabras|ndhiwa)\b/i,
    fsaCategory: "GENERAL_FOOD",
    profile: {
      EnergyKJ: 1700,
      SugarsG: 100.0,
      SaturatedFatG: 0.0,
      SodiumMG: 0,
      ProteinG: 0.0,
      FibreG: 0.0,
      FVLPercent: 0,
      DataSourceCode: "KENYAN_FALLBACK",
      FibreGEstimated: false
    }
  },
  "cooking_oil": {
    pattern: /\b(oil|golden drop|rina|fresh fri|salit|elianto)\b/i,
    fsaCategory: "ADDED_FAT",
    profile: {
      EnergyKJ: 3700,
      SugarsG: 0.0,
      SaturatedFatG: 14.0, // Varies, baseline 14%
      SodiumMG: 0,
      ProteinG: 0.0,
      FibreG: 0.0,
      FVLPercent: 0,
      DataSourceCode: "KENYAN_FALLBACK",
      FibreGEstimated: false
    }
  },
  "milk": {
    pattern: /\b(milk|tuzo|brookside|kcc|daima|fino)\b/i,
    fsaCategory: "BEVERAGE",
    profile: {
      EnergyKJ: 250,
      SugarsG: 4.8,
      SaturatedFatG: 2.0,
      SodiumMG: 40,
      ProteinG: 3.2,
      FibreG: 0.0,
      FVLPercent: 0,
      DataSourceCode: "KENYAN_FALLBACK",
      FibreGEstimated: false
    }
  }
};

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function generateUUID(hashKey) {
  // Generate a deterministic UUID based on the hashKey (name_hash)
  const hash = crypto.createHash('md5').update(hashKey).digest('hex');
  return `${hash.substring(0,8)}-${hash.substring(8,12)}-4${hash.substring(13,16)}-a${hash.substring(17,20)}-${hash.substring(20,32)}`;
}

// Extract volume (Strategy 4)
function extractVolume(text) {
  const volumeRegex = /(\d+(?:\.\d+)?)\s*(kg|g|ltr|l|ml)\b/i;
  const match = text.match(volumeRegex);
  if (!match) return { value: null, unit: null };
  
  let val = parseFloat(match[1]);
  let unit = match[2].toLowerCase();
  
  if (unit === 'kg') { val *= 1000; unit = 'g'; }
  if (unit === 'l' || unit === 'ltr') { val *= 1000; unit = 'ml'; }
  
  return { value: val, unit: unit };
}

// Clean corrupted names (Strategy 1)
function cleanScrapedName(item) {
  if (/% off/i.test(item.product_name) || /save/i.test(item.product_name) || item.product_name.length < 4) {
    const parts = item.source_url.split('/');
    let slug = parts[parts.length - 1] || parts[parts.length - 2];
    if (slug) {
        return slug.replace(/-/g, ' ').replace(/\b\d+g|\b\d+kg|\b\d+l|\b\d+ltr/i, '').trim();
    }
  }
  return item.product_name;
}

// ─────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────
async function main() {
  const inputPath = path.join(__dirname, '../naivas_database.json');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  const groceryProducts = [];
  const nutritionalProfiles = [];
  
  console.log(`Processing ${data.length} items...`);
  
  data.forEach((item, index) => {
    const cleanName = cleanScrapedName(item);
    const volume = extractVolume(item.product_name + " " + item.source_url);
    const groceryProductId = generateUUID(item.name_hash);
    
    // Check fallback dict
    let matchedProfile = null;
    let matchedFsaCategory = "GENERAL_FOOD";
    
    for (const [key, staple] of Object.entries(KENYAN_STAPLES)) {
      if (staple.pattern.test(cleanName)) {
        matchedProfile = staple.profile;
        matchedFsaCategory = staple.fsaCategory;
        break;
      }
    }
    
    // Create GroceryProduct record
    const groceryProduct = {
      GroceryProductID: groceryProductId,
      ProductName: cleanName,
      BrandName: null, // Hard to extract reliably without NLP
      BaseVolumeValue: volume.value,
      BaseVolumeUnit: volume.unit,
      RetailerCode: "NAIVAS",
      RetailerProductUrl: item.source_url,
      ExtractedAt: item.extracted_at,
      FSAProductCategoryCode: matchedFsaCategory,
      _originalHash: item.name_hash // useful for linking back from content script
    };
    groceryProducts.push(groceryProduct);
    
    // Create NutritionalProfile record if matched
    if (matchedProfile) {
      const profile = {
        NutritionalProfileID: generateUUID(groceryProductId + "_profile"),
        GroceryProductID: groceryProductId,
        EnergyKJ: matchedProfile.EnergyKJ,
        SugarsG: matchedProfile.SugarsG,
        SaturatedFatG: matchedProfile.SaturatedFatG,
        SodiumMG: matchedProfile.SodiumMG,
        ProteinG: matchedProfile.ProteinG,
        FibreG: matchedProfile.FibreG,
        FVLPercent: matchedProfile.FVLPercent,
        DataSourceCode: matchedProfile.DataSourceCode,
        FibreGEstimated: matchedProfile.FibreGEstimated,
        LastUpdated: new Date().toISOString()
      };
      nutritionalProfiles.push(profile);
    }
  });
  
  const outDir = path.join(__dirname, '../extension/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  fs.writeFileSync(path.join(outDir, 'grocery_products.json'), JSON.stringify(groceryProducts, null, 2));
  fs.writeFileSync(path.join(outDir, 'nutritional_profiles.json'), JSON.stringify(nutritionalProfiles, null, 2));
  
  console.log(`Exported ${groceryProducts.length} GroceryProducts.`);
  console.log(`Exported ${nutritionalProfiles.length} NutritionalProfiles (from Kenyan Fallback Dict).`);
}

main().catch(console.error);
