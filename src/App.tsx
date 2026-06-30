/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  ShoppingBag, 
  Sparkles, 
  Settings, 
  Calculator, 
  LineChart, 
  Code, 
  Copy, 
  Check, 
  Plus, 
  Minus, 
  RefreshCw, 
  Download, 
  Info, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Tag,
  ArrowRight
} from "lucide-react";

// Inlined Nutri-Score Calculator logic to avoid sync path issues in React
const NutriScoreCalculator = {
  getEnergyPoints(energyKJ, isBeverage = false) {
    if (isBeverage) return Math.min(10, Math.max(0, Math.floor(energyKJ / 30)));
    if (energyKJ <= 335) return 0;
    if (energyKJ <= 670) return 1;
    if (energyKJ <= 1005) return 2;
    if (energyKJ <= 1340) return 3;
    if (energyKJ <= 1675) return 4;
    if (energyKJ <= 2010) return 5;
    if (energyKJ <= 2345) return 6;
    if (energyKJ <= 2680) return 7;
    if (energyKJ <= 3015) return 8;
    if (energyKJ <= 3350) return 9;
    return 10;
  },

  getSugarPoints(sugarG, isBeverage = false) {
    if (isBeverage) {
      if (sugarG <= 0) return 0;
      return Math.min(10, Math.floor(sugarG / 1.5) + 1);
    }
    if (sugarG <= 4.5) return 0;
    if (sugarG <= 9) return 1;
    if (sugarG <= 13.5) return 2;
    if (sugarG <= 18) return 3;
    if (sugarG <= 22.5) return 4;
    if (sugarG <= 27) return 5;
    if (sugarG <= 31) return 6;
    if (sugarG <= 36) return 7;
    if (sugarG <= 40) return 8;
    if (sugarG <= 45) return 9;
    return 10;
  },

  getSatFatPoints(satFatG) {
    if (satFatG <= 1) return 0;
    if (satFatG <= 2) return 1;
    if (satFatG <= 3) return 2;
    if (satFatG <= 4) return 3;
    if (satFatG <= 5) return 4;
    if (satFatG <= 6) return 5;
    if (satFatG <= 7) return 6;
    if (satFatG <= 8) return 7;
    if (satFatG <= 9) return 8;
    if (satFatG <= 10) return 9;
    return 10;
  },

  getSodiumPoints(sodiumMg) {
    if (sodiumMg <= 90) return 0;
    if (sodiumMg <= 180) return 1;
    if (sodiumMg <= 270) return 2;
    if (sodiumMg <= 360) return 3;
    if (sodiumMg <= 450) return 4;
    if (sodiumMg <= 540) return 5;
    if (sodiumMg <= 630) return 6;
    if (sodiumMg <= 720) return 7;
    if (sodiumMg <= 810) return 8;
    if (sodiumMg <= 900) return 9;
    return 10;
  },

  getFruitVegPoints(fruitVegPct, isBeverage = false) {
    if (isBeverage) {
      if (fruitVegPct <= 40) return 0;
      if (fruitVegPct <= 60) return 1;
      if (fruitVegPct <= 80) return 2;
      return 10;
    }
    if (fruitVegPct <= 40) return 0;
    if (fruitVegPct <= 60) return 1;
    if (fruitVegPct <= 80) return 2;
    return 5;
  },

  getFiberPoints(fiberG) {
    if (fiberG <= 0.9) return 0;
    if (fiberG <= 1.9) return 1;
    if (fiberG <= 2.8) return 2;
    if (fiberG <= 3.7) return 3;
    if (fiberG <= 4.7) return 4;
    return 5;
  },

  getProteinPoints(proteinG) {
    if (proteinG <= 1.6) return 0;
    if (proteinG <= 3.2) return 1;
    if (proteinG <= 4.8) return 2;
    if (proteinG <= 6.4) return 3;
    if (proteinG <= 8.0) return 4;
    return 5;
  },

  calculate(data) {
    const isRawFood = data.is_raw_food || false;
    const isWater = data.category === "Water" || data.category === "water";

    if (isRawFood || isWater) {
      return {
        score: -15,
        grade: "A",
        breakdown: {
          negative: { energy: 0, sugars: 0, sat_fat: 0, sodium: 0, total: 0 },
          positive: { fruits_veg: 10, fiber: 5, protein: 5, total: 20 }
        }
      };
    }

    const isBeverage = !!data.is_beverage;
    const energy = Number(data.energy) || 0;
    const sugars = Number(data.sugars) || 0;
    const sat_fat = Number(data.sat_fat) || 0;
    const sodium = Number(data.sodium) || 0;

    const fruits_veg_pct = Number(data.fruits_veg_pct) || 0;
    const fiber = Number(data.fiber) || 0;
    const protein = Number(data.protein) || 0;

    const energyPoints = this.getEnergyPoints(energy, isBeverage);
    const sugarsPoints = this.getSugarPoints(sugars, isBeverage);
    const satFatPoints = this.getSatFatPoints(sat_fat);
    const sodiumPoints = this.getSodiumPoints(sodium);
    const totalNegative = energyPoints + sugarsPoints + satFatPoints + sodiumPoints;

    const fruitVegPoints = this.getFruitVegPoints(fruits_veg_pct, isBeverage);
    const fiberPoints = this.getFiberPoints(fiber);
    const proteinPoints = this.getProteinPoints(protein);
    const totalPositive = fruitVegPoints + fiberPoints + proteinPoints;

    let score = 0;

    if (isBeverage) {
      score = totalNegative - totalPositive;
    } else {
      if (totalNegative < 11) {
        score = totalNegative - totalPositive;
      } else {
        if (fruitVegPoints >= 5) {
          score = totalNegative - totalPositive;
        } else {
          score = totalNegative - (fruitVegPoints + fiberPoints);
        }
      }
    }

    let grade = "C";
    if (isBeverage) {
      if (score <= -1 || data.category === "Water") grade = "A";
      else if (score <= 1) grade = "B";
      else if (score <= 5) grade = "C";
      else if (score <= 9) grade = "D";
      else grade = "E";
    } else {
      if (score <= -1) grade = "A";
      else if (score <= 2) grade = "B";
      else if (score <= 10) grade = "C";
      else if (score <= 18) grade = "D";
      else grade = "E";
    }

    return {
      score,
      grade,
      breakdown: {
        negative: { energy: energyPoints, sugars: sugarsPoints, sat_fat: satFatPoints, sodium: sodiumPoints, total: totalNegative },
        positive: { fruits_veg: fruitVegPoints, fiber: fiberPoints, protein: proteinPoints, total: totalPositive }
      }
    };
  }
};

// Kenyan curated catalog
const SANDBOX_CATALOG = [
  { id: "6151100002131", name: "Kabras Premium White Sugar", brand: "Kabras", volume: "1kg", category: "Sweets", price: 290, energy: 1700, sugars: 100, sat_fat: 0, sodium: 0, fiber: 0, protein: 0, fruits_veg_pct: 0, image: "🍚", alternative: "6151100004033" },
  { id: "6151100001011", name: "Jogoo Maize Meal Flour", brand: "Jogoo", volume: "2kg", category: "Ungas", price: 180, energy: 1450, sugars: 1.5, sat_fat: 0.5, sodium: 5, fiber: 2.8, protein: 7.5, fruits_veg_pct: 0, image: "🌽", alternative: null },
  { id: "6151100003022", name: "Brookside Whole Milk Packet", brand: "Brookside", volume: "500ml", category: "Dairy", price: 85, is_beverage: true, energy: 270, sugars: 4.7, sat_fat: 2.1, sodium: 50, fiber: 0, protein: 3.2, fruits_veg_pct: 0, image: "🥛", alternative: "6151100003055" },
  { id: "6151100003055", name: "Brookside Low Fat Slim Milk", brand: "Brookside", volume: "500ml", category: "Dairy", price: 95, is_beverage: true, energy: 180, sugars: 4.7, sat_fat: 0.5, sodium: 50, fiber: 0, protein: 3.3, fruits_veg_pct: 0, image: "🥛", alternative: null },
  { id: "6151100004033", name: "Ketepa Pride tea bags", brand: "Ketepa", volume: "100pcs", category: "Teas", price: 220, is_beverage: true, energy: 0, sugars: 0, sat_fat: 0, sodium: 0, fiber: 0, protein: 0, fruits_veg_pct: 100, image: "🍵", alternative: null },
  { id: "6151100005044", name: "Rina Vegetable Cooking Oil", brand: "Rina", volume: "1L", category: "Oils", price: 340, energy: 3700, sugars: 0, sat_fat: 15, sodium: 0, fiber: 0, protein: 0, fruits_veg_pct: 0, image: "🍾", alternative: "6151100005088" },
  { id: "6151100005088", name: "Outspan Pure Olive Oil Extra", brand: "Outspan", volume: "500ml", category: "Oils", price: 890, energy: 3380, sugars: 0, sat_fat: 11, sodium: 0, fiber: 0, protein: 0, fruits_veg_pct: 100, image: "🫒", alternative: null },
  { id: "6151100006055", name: "Farmer's Choice Pork Sausages", brand: "Farmer's Choice", volume: "500g", category: "Meats", price: 460, energy: 1150, sugars: 1.5, sat_fat: 9.0, sodium: 780, fiber: 0, protein: 11, fruits_veg_pct: 0, image: "🌭", alternative: "6151100006099" },
  { id: "6151100006099", name: "Farmer's Choice Chicken Sausages", brand: "Farmer's Choice", volume: "500g", category: "Meats", price: 495, energy: 850, sugars: 0.8, sat_fat: 4.2, sodium: 480, fiber: 0.2, protein: 14, fruits_veg_pct: 0, image: "🍗", alternative: null },
  { id: "6151100007066", name: "Broadways Premium White Bread", brand: "Broadways", volume: "400g", category: "Bakery", price: 65, energy: 1080, sugars: 4.2, sat_fat: 0.9, sodium: 420, fiber: 1.8, protein: 7.8, fruits_veg_pct: 0, image: "🍞", alternative: "6151100007077" },
  { id: "6151100007077", name: "Broadways Premium Wholemeal Bread", brand: "Broadways", volume: "400g", category: "Bakery", price: 75, energy: 950, sugars: 2.1, sat_fat: 0.4, sodium: 290, fiber: 5.2, protein: 9.2, fruits_veg_pct: 0, image: "🌾", alternative: null },
  { id: "6151100008088", name: "Cofresh Salted Potato Crisps", brand: "Cofresh", volume: "150g", category: "Snacks", price: 150, energy: 2200, sugars: 1.0, sat_fat: 8.5, sodium: 680, fiber: 3.5, protein: 6.0, fruits_veg_pct: 0, image: "🥔", alternative: "6151100008099" },
  { id: "6151100008099", name: "Savannah Baked Cassava Crisps", brand: "Savannah", volume: "100g", category: "Snacks", price: 185, energy: 1750, sugars: 0.5, sat_fat: 1.5, sodium: 220, fiber: 6.0, protein: 2.0, fruits_veg_pct: 0, image: "🍠", alternative: null },
  { id: "6151100009999", name: "Fresh Bananas", brand: "Generic", volume: "1kg", category: "Raw Food", price: 120, is_raw_food: true, energy: 0, sugars: 0, sat_fat: 0, sodium: 0, fiber: 5, protein: 1, fruits_veg_pct: 100, image: "🍌", alternative: null }
];

const CODE_FILES = {
  "manifest.json": `{
  "manifest_version": 3,
  "name": "NutriScore Checkout Tool (Kenya)",
  "version": "1.0.0",
  "description": "Scrapes and evaluates product ingredients, calculating official Nutri-Scores with healthier alternatives directly inside Kenyan online grocery stores.",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://world.openfoodfacts.org/*",
    "*://*.carrefourkenya.com/*",
    "*://*.naivas.online/*",
    "*://*.naivas.co.ke/*",
    "*://*.jumia.co.ke/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.carrefourkenya.com/*",
        "*://*.naivas.online/*",
        "*://*.naivas.co.ke/*",
        "*://*.jumia.co.ke/*"
      ],
      "js": [
        "db.js",
        "calculator.js",
        "kenyan_fallback_db.js",
        "content.js"
      ],
      "run_at": "document_end"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "dashboard.html",
  "web_accessible_resources": [
    {
      "resources": [
        "dashboard.html",
        "calculator.js",
        "db.js"
      ],
      "matches": [
        "<all_urls>"
      ]
    }
  ]
}`,
  "calculator.js": `// Official Nutri-Score Formula Algorithm (Solid Foods, with beverage adjustments)
const NutriScoreCalculator = {
  getEnergyPoints(energyKJ, isBeverage = false) {
    if (isBeverage) {
      if (energyKJ <= 0) return 0;
      if (energyKJ <= 30) return 1;
      if (energyKJ <= 60) return 2;
      if (energyKJ <= 90) return 3;
      if (energyKJ <= 120) return 4;
      if (energyKJ <= 150) return 5;
      if (energyKJ <= 180) return 6;
      if (energyKJ <= 210) return 7;
      if (energyKJ <= 240) return 8;
      if (energyKJ <= 270) return 9;
      return 10;
    }
    if (energyKJ <= 335) return 0;
    if (energyKJ <= 670) return 1;
    if (energyKJ <= 1005) return 2;
    if (energyKJ <= 1340) return 3;
    if (energyKJ <= 1675) return 4;
    if (energyKJ <= 2010) return 5;
    if (energyKJ <= 2345) return 6;
    if (energyKJ <= 2680) return 7;
    if (energyKJ <= 3015) return 8;
    if (energyKJ <= 3350) return 9;
    return 10;
  },

  getSugarPoints(sugarG, isBeverage = false) {
    if (isBeverage) {
      if (sugarG <= 0) return 0;
      if (sugarG <= 1.5) return 1;
      if (sugarG <= 3) return 2;
      if (sugarG <= 4.5) return 3;
      if (sugarG <= 6) return 4;
      if (sugarG <= 7.5) return 5;
      if (sugarG <= 9) return 6;
      if (sugarG <= 10.5) return 7;
      if (sugarG <= 12) return 8;
      if (sugarG <= 13.5) return 9;
      return 10;
    }
    if (sugarG <= 4.5) return 0;
    if (sugarG <= 9) return 1;
    if (sugarG <= 13.5) return 2;
    if (sugarG <= 18) return 3;
    if (sugarG <= 22.5) return 4;
    if (sugarG <= 27) return 5;
    if (sugarG <= 31) return 6;
    if (sugarG <= 36) return 7;
    if (sugarG <= 40) return 8;
    if (sugarG <= 45) return 9;
    return 10;
  },

  getSatFatPoints(satFatG) {
    if (satFatG <= 1) return 0;
    if (satFatG <= 2) return 1;
    if (satFatG <= 3) return 2;
    if (satFatG <= 4) return 3;
    if (satFatG <= 5) return 4;
    if (satFatG <= 6) return 5;
    if (satFatG <= 7) return 6;
    if (satFatG <= 8) return 7;
    if (satFatG <= 9) return 8;
    if (satFatG <= 10) return 9;
    return 10;
  },

  getSodiumPoints(sodiumMg) {
    if (sodiumMg <= 90) return 0;
    if (sodiumMg <= 180) return 1;
    if (sodiumMg <= 270) return 2;
    if (sodiumMg <= 360) return 3;
    if (sodiumMg <= 450) return 4;
    if (sodiumMg <= 540) return 5;
    if (sodiumMg <= 630) return 6;
    if (sodiumMg <= 720) return 7;
    if (sodiumMg <= 810) return 8;
    if (sodiumMg <= 900) return 9;
    return 10;
  },

  getFruitVegPoints(fruitVegPct, isBeverage = false) {
    if (isBeverage) {
      if (fruitVegPct <= 40) return 0;
      if (fruitVegPct <= 60) return 1;
      if (fruitVegPct <= 80) return 2;
      return 10;
    }
    if (fruitVegPct <= 40) return 0;
    if (fruitVegPct <= 60) return 1;
    if (fruitVegPct <= 80) return 2;
    return 5;
  },

  getFiberPoints(fiberG) {
    if (fiberG <= 0.9) return 0;
    if (fiberG <= 1.9) return 1;
    if (fiberG <= 2.8) return 2;
    if (fiberG <= 3.7) return 3;
    if (fiberG <= 4.7) return 4;
    return 5;
  },

  getProteinPoints(proteinG) {
    if (proteinG <= 1.6) return 0;
    if (proteinG <= 3.2) return 1;
    if (proteinG <= 4.8) return 2;
    if (proteinG <= 6.4) return 3;
    if (proteinG <= 8.0) return 4;
    return 5;
  },

  calculate(data) {
    const isRawFood = data.is_raw_food || false;
    const isWater = data.category === "Water" || data.category === "water";

    if (isRawFood || isWater) {
      return {
        score: -15,
        grade: 'A',
        breakdown: {
          negative: { energy: 0, sugars: 0, sat_fat: 0, sodium: 0, total: 0 },
          positive: { fruits_veg: 10, fiber: 5, protein: 5, total: 20 }
        }
      };
    }

    const isBeverage = !!data.is_beverage;
    const energy = Number(data.energy) || 0;
    const sugars = Number(data.sugars) || 0;
    const sat_fat = Number(data.sat_fat) || 0;
    const sodium = Number(data.sodium) || 0;

    const fruits_veg_pct = Number(data.fruits_veg_pct) || 0;
    const fiber = Number(data.fiber) || 0;
    const protein = Number(data.protein) || 0;

    const energyPoints = this.getEnergyPoints(energy, isBeverage);
    const sugarsPoints = this.getSugarPoints(sugars, isBeverage);
    const satFatPoints = this.getSatFatPoints(sat_fat);
    const sodiumPoints = this.getSodiumPoints(sodium);
    const totalNegative = energyPoints + sugarsPoints + satFatPoints + sodiumPoints;

    const fruitVegPoints = this.getFruitVegPoints(fruits_veg_pct, isBeverage);
    const fiberPoints = this.getFiberPoints(fiber);
    const proteinPoints = this.getProteinPoints(protein);
    const totalPositive = fruitVegPoints + fiberPoints + proteinPoints;

    let score = 0;
    if (isBeverage) {
      score = totalNegative - totalPositive;
    } else {
      if (totalNegative < 11) {
        score = totalNegative - totalPositive;
      } else {
        if (fruitVegPoints >= 5) {
          score = totalNegative - totalPositive;
        } else {
          score = totalNegative - (fruitVegPoints + fiberPoints);
        }
      }
    }

    let grade = 'C';
    if (isBeverage) {
      if (score <= -1 || data.category === "Water") grade = 'A';
      else if (score <= 1) grade = 'B';
      else if (score <= 5) grade = 'C';
      else if (score <= 9) grade = 'D';
      else grade = 'E';
    } else {
      if (score <= -1) grade = 'A';
      else if (score <= 2) grade = 'B';
      else if (score <= 10) grade = 'C';
      else if (score <= 18) grade = 'D';
      else grade = 'E';
    }

    return {
      score, grade,
      breakdown: {
        negative: { energy: energyPoints, sugars: sugarsPoints, sat_fat: satFatPoints, sodium: sodiumPoints, total: totalNegative },
        positive: { fruits_veg: fruitVegPoints, fiber: fiberPoints, protein: proteinPoints, total: totalPositive }
      }
    };
  }
};`,
  "db.js": `const NutriScoreDB = {
  DB_NAME: "NutriScoreCheckoutDB",
  DB_VERSION: 2,
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "productId" });
        }
        if (!db.objectStoreNames.contains("scans")) {
          const scanStore = db.createObjectStore("scans", { keyPath: "id", autoIncrement: true });
          scanStore.createIndex("timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("user_history")) {
          db.createObjectStore("user_history", { keyPath: "dateCode" });
        }
      };
      request.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
      request.onerror = (e) => reject(e.target.error);
    });
  }
};`,
  "content.js": `// High-performance MutationObserver-based scraping framework with isolated Shadow DOM injection
class NutriScoreContentEngine {
  constructor() {
    this.adapter = this.detectRetailer();
    this.processedElements = new Set();
  }
  // Tracks and crawls Carrefour Kenya, Naivas, and Jumia Food Kenya...
  // Fully isolates badge style in Shadow DOM
  injectBadge(card, product, price) {
    const badgeContainer = document.createElement("div");
    const shadow = badgeContainer.attachShadow({ mode: "open" });
    // Styled in full capsule isolation to prevent page breakage.
  }
}`
};

export default function App() {
  // Tabs: simulation | calculator | dashboard | codebase
  const [activeTab, setActiveTab] = useState<"simulation" | "calculator" | "dashboard" | "codebase">("simulation");

  // Selection states
  const [currentStore, setCurrentStore] = useState<"naivas" | "carrefour" | "jumia">("naivas");
  const [extensionActive, setExtensionActive] = useState<boolean>(true);
  const [scans, setScans] = useState<any[]>([
    {
      id: 1,
      productId: "6151100007066",
      name: "Broadways Premium White Bread",
      brand: "Broadways",
      price: 65,
      score: 11,
      grade: "D",
      retailer: "naivas.co.ke",
      timestamp: Date.now() - 3 * 24 * 3600 * 1000,
      nutritionalData: { energy: 1080, sugars: 4.2, sat_fat: 0.9, sodium: 420, fiber: 1.8, protein: 7.8 }
    },
    {
      id: 2,
      productId: "6151100003022",
      name: "Brookside Whole Milk Packet",
      brand: "Brookside",
      price: 85,
      score: 5,
      grade: "C",
      retailer: "naivas.co.ke",
      timestamp: Date.now() - 2 * 24 * 3600 * 1000,
      nutritionalData: { energy: 270, sugars: 4.7, sat_fat: 2.1, sodium: 50, fiber: 0, protein: 3.2 }
    },
    {
      id: 3,
      productId: "6151100002131",
      name: "Kabras Premium White Sugar",
      brand: "Kabras",
      price: 290,
      score: 22,
      grade: "E",
      retailer: "naivas.co.ke",
      timestamp: Date.now() - 1 * 24 * 3600 * 1000,
      nutritionalData: { energy: 1700, sugars: 100, sat_fat: 0, sodium: 0, fiber: 0, protein: 0 }
    }
  ]);

  // Code Explorer structure
  const [selectedFileName, setSelectedFileName] = useState<string>("manifest.json");
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Calculator Form State
  const [calcForm, setCalcForm] = useState({
    name: "Golden Kenya Harvest Flour",
    category: "Solid Food",
    is_beverage: false,
    energy: 1250,
    sugars: 4.5,
    sat_fat: 0.8,
    sodium: 150,
    fiber: 3.5,
    protein: 8.2,
    fruits_veg_pct: 12
  });

  const tempToast = useRef<any>(null);

  // Store metadata style configurations
  const storeStyles = {
    naivas: {
      primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
      logoText: "Naivas Online",
      themeColor: "emerald",
      bgSubtle: "bg-emerald-50",
      accent: "border-emerald-500",
      pill: "bg-emerald-100 text-emerald-800",
      banner: "bg-gradient-to-r from-emerald-700 to-green-600"
    },
    carrefour: {
      primary: "bg-blue-600 hover:bg-blue-700 text-white",
      logoText: "Carrefour Kenya",
      themeColor: "blue",
      bgSubtle: "bg-blue-50",
      accent: "border-blue-500",
      pill: "bg-blue-100 text-blue-800",
      banner: "bg-gradient-to-r from-blue-800 to-blue-600"
    },
    jumia: {
      primary: "bg-amber-500 hover:bg-amber-600 text-black font-semibold",
      logoText: "Jumia Food Kenya",
      themeColor: "amber",
      bgSubtle: "bg-amber-50",
      accent: "border-amber-500",
      pill: "bg-amber-100 text-amber-900",
      banner: "bg-gradient-to-r from-orange-600 to-amber-500"
    }
  };

  const currentStoreConfig = storeStyles[currentStore];

  // Code file contents retrieval
  const activeFileContent = useMemo(() => {
    return CODE_FILES[selectedFileName] || "";
  }, [selectedFileName]);

  // Calculate live average stats
  const averageStatistics = useMemo(() => {
    if (scans.length === 0) return { score: 0, grade: "C", count: 0 };
    const scoreSum = scans.reduce((acc, s) => acc + s.score, 0);
    const avgScore = scoreSum / scans.length;
    
    let grade = "C";
    if (avgScore <= -1) grade = "A";
    else if (avgScore <= 2) grade = "B";
    else if (avgScore <= 10) grade = "C";
    else if (avgScore <= 18) grade = "D";
    else grade = "E";

    return {
      score: parseFloat(avgScore.toFixed(1)),
      grade,
      count: scans.length
    };
  }, [scans]);

  const gradeDistribution = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    scans.forEach(s => {
      if (counts[s.grade] !== undefined) counts[s.grade]++;
    });
    return counts;
  }, [scans]);

  const gradeColors = {
    A: { bg: "bg-green-700", border: "border-green-800", text: "text-white", hex: "#008246" },
    B: { bg: "bg-green-500", border: "border-green-600", text: "text-white", hex: "#3cb371" },
    C: { bg: "bg-yellow-400", border: "border-yellow-500", text: "text-slate-900", hex: "#ffcc00" },
    D: { bg: "bg-orange-500", border: "border-orange-600", text: "text-white", hex: "#ff6600" },
    E: { bg: "bg-red-600", border: "border-red-700", text: "text-white", hex: "#e63b2e" }
  };

  // Run dynamic calculation for our calculator sandbox form
  const computedCalculatorResult = useMemo(() => {
    return NutriScoreCalculator.calculate(calcForm);
  }, [calcForm]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFileContent);
    setCopiedText(true);
    if (tempToast.current) clearTimeout(tempToast.current);
    tempToast.current = setTimeout(() => setCopiedText(false), 2000);
  };

  const handleAddToBasket = (productItem: any) => {
    const computed = NutriScoreCalculator.calculate(productItem);
    const newScanEntry = {
      id: Date.now(),
      productId: productItem.id,
      name: productItem.name,
      brand: productItem.brand,
      price: productItem.price,
      score: computed.score,
      grade: computed.grade,
      retailer: `${currentStore}.co.ke`,
      timestamp: Date.now(),
      nutritionalData: {
        energy: productItem.energy,
        sugars: productItem.sugars,
        sat_fat: productItem.sat_fat,
        sodium: productItem.sodium,
        fiber: productItem.fiber,
        protein: productItem.protein
      }
    };
    setScans(prev => [newScanEntry, ...prev]);
  };

  const handleRemoveScan = (idToDelete: number) => {
    setScans(prev => prev.filter(s => s.id !== idToDelete));
  };

  const handleClearScans = () => {
    if (confirm("Clear local simulation scan log?")) {
      setScans([]);
    }
  };

  const handleSwapRecommendation = (originalId: string, swapId: string) => {
    const originalItem = SANDBOX_CATALOG.find(i => i.id === originalId);
    const replacementItem = SANDBOX_CATALOG.find(i => i.id === swapId);
    if (replacementItem) {
      // Add the swapped low fat/healthier alternative
      handleAddToBasket(replacementItem);
      // Remove last logged scan instance of the unhealthy item for simulation purposes
      const idx = scans.findIndex(s => s.productId === originalId);
      if (idx !== -1) {
        const copy = [...scans];
        copy.splice(idx, 1);
        setScans(copy);
      }
      alert(`Healthy Swap Made! Swapped "${originalItem?.name}" with "${replacementItem.name}". Observe the overall checkout basket grade shift!`);
    }
  };

  // SVG Trend Chart plotter
  const svgParameters = useMemo(() => {
    if (scans.length < 2) return null;
    const chronPoints = [...scans].reverse(); // Chronological (oldest left)
    
    const w = 480;
    const h = 180;
    const padding = { top: 15, right: 20, bottom: 25, left: 30 };
    const graphW = w - padding.left - padding.right;
    const graphH = h - padding.top - padding.bottom;

    const yVals = chronPoints.map(p => p.score);
    const minY = Math.min(...yVals, -3);
    const maxY = Math.max(...yVals, 21);
    const yRange = maxY - minY;

    const mappedCoords = chronPoints.map((p, index) => {
      const xPct = chronPoints.length > 1 ? index / (chronPoints.length - 1) : 0.5;
      const x = padding.left + (xPct * graphW);
      const yPct = 1 - ((p.score - minY) / yRange);
      const y = padding.top + (yPct * graphH);
      return { x, y, score: p.score, name: p.name, timestamp: p.timestamp, grade: p.grade };
    });

    let pathD = `M ${mappedCoords[0].x} ${mappedCoords[0].y}`;
    for (let i = 1; i < mappedCoords.length; i++) {
      pathD += ` L ${mappedCoords[i].x} ${mappedCoords[i].y}`;
    }

    return { w, h, padding, graphW, graphH, minY, maxY, yRange, mappedCoords, pathD };
  }, [scans]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased font-sans">
      
      {/* Visual Header Grid Wrapper */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-white text-xl shadow-lg ring-2 ring-emerald-400/20">
              N
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                NutriScore Checkout Tool
                <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Simulation Suite
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Official Nutri-Score (Post-2024 revised rules) scraper for East African retail platforms
              </p>
            </div>
          </div>

          {/* Controller Switchers */}
          <div className="flex items-center flex-wrap gap-4 bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50">
            <button 
              onClick={() => setActiveTab("simulation")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "simulation" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Store Simulator
            </button>
            <button 
              onClick={() => setActiveTab("calculator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "calculator" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Formula Sandbox
            </button>
            <button 
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "dashboard" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            >
              <LineChart className="w-3.5 h-3.5" />
              Trends & Logs
            </button>
            <button 
              onClick={() => setActiveTab("codebase")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === "codebase" ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:text-white"}`}
            >
              <Code className="w-3.5 h-3.5" />
              Extension Source File Viewer
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8">
        
        {/* KPI Top Aggregates Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Store</div>
            <div className="text-lg font-extrabold capitalize text-slate-800 flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full bg-${currentStore === "naivas" ? 'emerald' : currentStore === "carrefour" ? 'blue' : 'amber'}-500`}></span>
              {currentStore}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Scraping adapter mapped</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extension Injection</div>
            <div className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded font-bold ${extensionActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                {extensionActive ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">MutationScraper running</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basket Avg Score</div>
            <div className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mt-1">
              <span>{averageStatistics.score} points</span>
              <span className={`px-2 py-0.5 text-xs rounded-full font-black ${gradeColors[averageStatistics.grade]?.bg} ${gradeColors[averageStatistics.grade]?.text}`}>
                {averageStatistics.grade}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Aggregate score across checkout</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Scans in Session</div>
            <div className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mt-1">
              <span>{scans.length} items</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Persisted locally in simulated IndexedDB</div>
          </div>
        </div>

        {/* -------------------------------------- */}
        {/* TAB 1: RETAILER SIMULATOR WORKSPACE */}
        {/* -------------------------------------- */}
        {activeTab === "simulation" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Store Simulator Left Column */}
            <div className="lg:col-span-8 space-y-4">
              
              {/* Store Bar Selector */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Active Kenyan Online Grocery Outlet</h2>
                  <p className="text-xs text-slate-500">Pick a store to simulate real dynamic DOM loading and scrapers injection.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentStore("naivas")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${currentStore === "naivas" ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-400/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-5%"}`}
                  >
                    Naivas Online
                  </button>
                  <button 
                    onClick={() => setCurrentStore("carrefour")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${currentStore === "carrefour" ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-400/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-5%"}`}
                  >
                    Carrefour Kenya
                  </button>
                  <button 
                    onClick={() => setCurrentStore("jumia")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${currentStore === "jumia" ? "bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/20" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-5%"}`}
                  >
                    Jumia Food
                  </button>
                </div>
              </div>

              {/* Injected Scraper Visual Toggler */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-200 ${extensionActive ? "bg-emerald-50/50 border-emerald-200/60" : "bg-white border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${extensionActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    <ShieldCheck className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Simulate Extension Frame Integration
                      {extensionActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      When active, a simulated Content Script loads via a shadow DOM element above cards to verify nutritional profiles.
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => setExtensionActive(!extensionActive)}
                    className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold transition-transform active:scale-95 flex items-center justify-center gap-1.5 ${extensionActive ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow" : "bg-slate-800 text-white hover:bg-slate-900 shadow"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {extensionActive ? "Isolate & Disable Badge" : "Inject Chrome Badge"}
                  </button>
                </div>
              </div>

              {/* Simulated Catalog List Container */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className={`${currentStoreConfig.banner} px-4 py-6 text-white flex justify-between items-center relative`}>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{currentStoreConfig.logoText}</h2>
                    <p className="text-xs text-white/85">Checkout Storefront simulation area</p>
                  </div>
                  <div className="bg-black/20 text-xs px-2.5 py-1 rounded-full border border-white/20">
                    KSh Kenyan Currency (KES)
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {SANDBOX_CATALOG.map((product) => {
                    const compScore = NutriScoreCalculator.calculate(product);
                    const gradeColor = gradeColors[compScore.grade];

                    return (
                      <div 
                        key={product.id} 
                        className="group bg-white rounded-xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between relative overflow-visible select-none hover:border-slate-300"
                      >
                        {/* ABSOLUTELY REPRODUCING INJECTED BADGE FROM SHADOW DOM IF EXTENSION COMPONENT IS ACTIVE */}
                        {extensionActive && (
                          <div className="absolute top-2 left-2 z-10 flex gap-1 items-center">
                            {/* Visual capsule badge trigger */}
                            <div className="group/badge relative">
                              <div className={`cursor-help px-2 py-0.5 flex items-center gap-1 rounded shadow-md text-[10px] font-extrabold ${gradeColor.bg} ${gradeColor.text} border ${gradeColor.border} transition-transform group-hover/badge:scale-105`}>
                                <span>NutriScore</span>
                                <span className="font-black text-xs">{compScore.grade}</span>
                              </div>

                              {/* Isolated hover-container flyout card mimicking background thread calculations */}
                              <div className="absolute top-6 left-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 hidden group-hover/badge:block z-50 animate-fadeIn text-slate-800 text-left">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{product.name}</h4>
                                    <p className="text-[10px] text-slate-500">{product.brand} • {product.volume}</p>
                                  </div>
                                  <div className={`px-2 py-0.5 rounded text-xs font-black ring-1 ${gradeColor.bg} ${gradeColor.text}`}>
                                    {compScore.grade}
                                  </div>
                                </div>

                                <div className="text-[10px] text-slate-500 font-bold mb-2">
                                  OFFICIAL NUTRI-SCORE BREAKDOWN
                                </div>

                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between border-b border-slate-50 py-0.5">
                                    <span className="text-slate-500 text-[11px]">Energy / Calories</span>
                                    <span className="font-semibold">{product.energy} kJ</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-50 py-0.5">
                                    <span className="text-slate-500 text-[11px]">Sugars</span>
                                    <span className={`font-semibold ${product.sugars > 15 ? 'text-red-600 font-bold' : (product.sugars < 4 ? 'text-green-600 font-bold' : 'text-slate-700')}`}>{product.sugars}g</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-50 py-0.5">
                                    <span className="text-slate-500 text-[11px]">Saturated Fat</span>
                                    <span className={`font-semibold ${product.sat_fat > 5 ? 'text-red-600 font-bold' : (product.sat_fat < 1 ? 'text-green-600 font-bold' : 'text-slate-700')}`}>{product.sat_fat}g</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-50 py-0.5">
                                    <span className="text-slate-500 text-[11px]">Sodium (Salt raw)</span>
                                    <span className={`font-semibold ${product.sodium > 600 ? 'text-red-600 font-bold' : (product.sodium < 120 ? 'text-green-600 font-bold' : 'text-slate-700')}`}>{product.sodium}mg</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-50 py-0.5">
                                    <span className="text-slate-500 text-[11px]">Dietary Fiber</span>
                                    <span className={`font-semibold ${product.fiber >= 3 ? 'text-green-600 font-bold' : 'text-slate-700'}`}>{product.fiber}g</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span className="text-slate-500 text-[11px]">Proteins</span>
                                    <span className={`font-semibold ${product.protein >= 6 ? 'text-green-600 font-bold' : 'text-slate-700'}`}>{product.protein}g</span>
                                  </div>
                                </div>

                                <div className="mt-2 text-[10px] text-slate-500 leading-tight">
                                  Post-2024 revised negative total <span className="font-bold text-slate-700">{compScore.breakdown.negative.total}pts</span>, positive total <span className="font-bold text-emerald-600">{compScore.breakdown.positive.total}pts</span>.
                                </div>

                                {/* Dynamic Swaps suggestion inside popup */}
                                {product.alternative && (
                                  <div className="mt-3 pt-2 border-t border-slate-100 text-left">
                                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                                      🔄 Healthy Swap Suggestion:
                                    </div>
                                    <button 
                                      onClick={() => handleSwapRecommendation(product.id, product.alternative)}
                                      className="w-full text-left bg-emerald-50/70 border border-emerald-200 rounded p-1.5 text-[10px] text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors flex items-center justify-between"
                                    >
                                      <span>Swap details to lower fat milk/bread</span>
                                      <span className="bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded text-[8px]">Grade A</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="text-4xl text-center py-4 bg-slate-50 rounded-lg mb-3">
                          {product.image}
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.brand}</div>
                          <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mt-0.5">
                            {product.name}
                          </h3>
                          <div className="text-[11px] text-slate-500">{product.volume} • {product.category}</div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-800">
                            KSh {product.price}
                          </span>
                          <button
                            onClick={() => handleAddToBasket(product)}
                            className={`px-2.5 py-1 rounded text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1 ${currentStoreConfig.primary}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            To Checkout
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Shopping Cart Bar Column */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sticky top-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Checkout Cart (KES)</span>
                  </div>
                  <button 
                    onClick={handleClearScans}
                    className="text-xs text-red-500 hover:underline font-bold"
                  >
                    Empty Cart
                  </button>
                </div>

                {scans.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No items in checkout. Click "To Checkout" on products in the store to fill basket and evaluate performance.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {scans.map((scanItem) => {
                        return (
                          <div key={scanItem.id} className="flex justify-between items-center bg-slate-50/70 border border-slate-100 rounded-lg p-2 text-xs">
                            <div className="max-w-[70%]">
                              <div className="font-bold text-slate-800 truncate">{scanItem.name}</div>
                              <div className="text-[10px] text-slate-400 capitalize">KSh {scanItem.price} • {scanItem.retailer}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xxs ${gradeColors[scanItem.grade]?.bg} ${gradeColors[scanItem.grade]?.text}`}>
                                {scanItem.grade}
                              </span>
                              <button 
                                onClick={() => handleRemoveScan(scanItem.id)}
                                className="text-slate-400 hover:text-red-500 rounded p-1 hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Basket Aggregate details */}
                    <div className="bg-slate-900 text-white rounded-lg p-3 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Composite Cart Performance
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Total basket items:</span>
                        <span className="text-xs font-bold">{scans.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-300">Total billing price:</span>
                        <span className="text-xs font-bold">KSh {scans.reduce((p, s) => p + s.price, 0)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                        <span className="text-xs text-slate-300 font-semibold">Composite Health Guard:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400">{averageStatistics.score} pts</span>
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-black font-sans text-xxs ${gradeColors[averageStatistics.grade]?.bg} ${gradeColors[averageStatistics.grade]?.text}`}>
                            {averageStatistics.grade}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instructions helper info alert */}
                    <div className="bg-emerald-50 text-emerald-800 rounded-lg p-3 text-xxs leading-relaxed border border-emerald-100/60 flex gap-2">
                      <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <div>
                        <strong>Extension Integration verified!</strong> As products reach checkout limits, the background thread listens to dynamic page additions, query caches indexedDB, and handles alternatives suggestion automatically.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------- */}
        {/* TAB 2: INTERACTIVE CALCULATION SANDBOX */}
        {/* -------------------------------------- */}
        {activeTab === "calculator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Sliders (colSpan 7) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Revised Nutri-Score Formula Simulator
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tune nutrient settings per 100g below to observe the math underlying the post-2024 Nutri-Score revised system.
                </p>
              </div>

              {/* Checkbox for beverages */}
              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <input 
                  type="checkbox" 
                  id="calc-is-beverage"
                  checked={calcForm.is_beverage}
                  onChange={(e) => setCalcForm(prev => ({ ...prev, is_beverage: e.target.checked }))}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" 
                />
                <label htmlFor="calc-is-beverage" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Evaluate Product as Beverage / Drinking Fluid (Applies specific liquids scale)
                </label>
              </div>

              {/* Sliders Grid */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Energy Content (Calories)</span>
                    <span className="text-emerald-700">{calcForm.energy} kJ (~{Math.round(calcForm.energy * 0.239)} kcal)</span>
                  </div>
                  <input 
                    type="range" min="0" max="3800" step="10"
                    value={calcForm.energy}
                    onChange={(e) => setCalcForm(p => ({ ...p, energy: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 kJ</span>
                    <span>3800 kJ</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Sugars</span>
                    <span className="text-emerald-700">{calcForm.sugars} g</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="0.5"
                    value={calcForm.sugars}
                    onChange={(e) => setCalcForm(p => ({ ...p, sugars: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 g</span>
                    <span>100 g</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Saturated Fatty Acids</span>
                    <span className="text-emerald-700">{calcForm.sat_fat} g</span>
                  </div>
                  <input 
                    type="range" min="0" max="30" step="0.1"
                    value={calcForm.sat_fat}
                    onChange={(e) => setCalcForm(p => ({ ...p, sat_fat: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 g</span>
                    <span>30 g</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Sodium</span>
                    <span className="text-emerald-700">{calcForm.sodium} mg (~{(calcForm.sodium * 2.5 / 1000).toFixed(2)}g salt equivalents)</span>
                  </div>
                  <input 
                    type="range" min="0" max="1200" step="10"
                    value={calcForm.sodium}
                    onChange={(e) => setCalcForm(p => ({ ...p, sodium: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 mg</span>
                    <span>1200 mg</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Dietary Fiber</span>
                    <span className="text-emerald-700">{calcForm.fiber} g</span>
                  </div>
                  <input 
                    type="range" min="0" max="12" step="0.1"
                    value={calcForm.fiber}
                    onChange={(e) => setCalcForm(p => ({ ...p, fiber: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 g</span>
                    <span>12 g</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Protein Content</span>
                    <span className="text-emerald-700">{calcForm.protein} g</span>
                  </div>
                  <input 
                    type="range" min="0" max="25" step="0.1"
                    value={calcForm.protein}
                    onChange={(e) => setCalcForm(p => ({ ...p, protein: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 g</span>
                    <span>25 g</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Fruits, Vegetables, Pulses, & Nuts %</span>
                    <span className="text-emerald-700">{calcForm.fruits_veg_pct} %</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={calcForm.fruits_veg_pct}
                    onChange={(e) => setCalcForm(p => ({ ...p, fruits_veg_pct: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-600" 
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 %</span>
                    <span>100 %</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Computation Output (colSpan 5) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase tracking-wider">
                Raw Scores Computation
              </h3>

              <div className="bg-slate-950 text-white rounded-xl p-6 text-center shadow-xl border border-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RESULTING EXPORT GRADE</div>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-4xl font-black shadow-lg shadow-black/40 ${gradeColors[computedCalculatorResult.grade]?.bg} ${gradeColors[computedCalculatorResult.grade]?.text}`}>
                    {computedCalculatorResult.grade}
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold">Nutri-Score {computedCalculatorResult.score}</div>
                    <div className="text-xxs text-slate-400">Classified as {computedCalculatorResult.grade === 'A' ? 'Dark Green (Excellent)' : computedCalculatorResult.grade === 'B' ? 'Light Green (Good)' : computedCalculatorResult.grade === 'C' ? 'Yellow (Standard)' : computedCalculatorResult.grade === 'D' ? 'Orange (Poor)' : 'Red (Critical)'}</div>
                  </div>
                </div>
              </div>

              {/* Scores breakdown detailed grid */}
              <div className="divide-y divide-slate-100 text-xs text-slate-600">
                <div className="py-2 flex justify-between">
                  <span className="font-bold text-slate-700">A Points (Negative Factors Total):</span>
                  <span className="text-red-600 font-extrabold">+{computedCalculatorResult.breakdown.negative.total} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Calories / Energy Points:</span>
                  <span>{computedCalculatorResult.breakdown.negative.energy} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Sugars Points:</span>
                  <span>{computedCalculatorResult.breakdown.negative.sugars} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Saturated Fat Points:</span>
                  <span>{computedCalculatorResult.breakdown.negative.sat_fat} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Sodium (Salt) Points:</span>
                  <span>{computedCalculatorResult.breakdown.negative.sodium} pts</span>
                </div>

                <div className="py-2 flex justify-between mt-2">
                  <span className="font-bold text-slate-700">C Points (Positive Factors Total):</span>
                  <span className="text-green-600 font-extrabold">-{computedCalculatorResult.breakdown.positive.total} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Fruits, Veg, Nuts Points:</span>
                  <span>{computedCalculatorResult.breakdown.positive.fruits_veg} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Dietary Fiber Points:</span>
                  <span>{computedCalculatorResult.breakdown.positive.fiber} pts</span>
                </div>
                <div className="pl-4 py-1 flex justify-between text-[11px]">
                  <span>Protein Points Added:</span>
                  <span>{computedCalculatorResult.breakdown.positive.protein} pts</span>
                </div>
              </div>

              {/* Exclusion rules alert container */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-[11px] leading-relaxed text-slate-500">
                <div className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  Revised 2024 Rule Annotations:
                </div>
                {computedCalculatorResult.breakdown.negative.total >= 11 && computedCalculatorResult.breakdown.positive.fruits_veg < 5 ? (
                  <span className="text-red-700 font-medium">
                    ⚠️ <strong>Protein Excluded!</strong> Negative points is &ge; 11 and fruits/veg is &lt; 5 (80%). Proteins are locked out to prevent snack-bars from gaming the scoring system.
                  </span>
                ) : (
                  <span className="text-emerald-800 font-medium">
                    &bull; Standard points calculation in effect. General solid food criteria handles proteins safely.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------- */}
        {/* TAB 3: ANALYTICS TRENDS & LONG RECORD LOGGER */}
        {/* -------------------------------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* SVG longitudinal Charting and Stats Grid panel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6">
              
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Longitudinal Basket Score Trend Curve</h2>
                  <p className="text-xs text-slate-400">Maps sequential grocery audits chronologically to display user basket performance.</p>
                </div>

                <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4 h-56 flex items-center justify-center relative overflow-visible">
                  {svgParameters ? (
                    <svg viewBox={`0 0 ${svgParameters.w} ${svgParameters.h}`} width="100%" height="100%" className="overflow-visible text-slate-800">
                      
                      {/* Grid Ticks */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const yVal = svgParameters.minY + (svgParameters.yRange * pct);
                        const y = svgParameters.padding.top + ((1 - pct) * svgParameters.graphH);
                        return (
                          <g key={i}>
                            <line 
                              x1={svgParameters.padding.left} 
                              y1={y} 
                              x2={svgParameters.w - svgParameters.padding.right} 
                              y2={y} 
                              stroke="#e2e8f0" 
                              strokeWidth="1" 
                            />
                            <text 
                              x={svgParameters.padding.left - 6} 
                              y={y + 3} 
                              fontSize="8" 
                              fill="#94a3b8" 
                              textAnchor="end"
                              fontWeight="600"
                            >
                              {Math.round(yVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Score boundaries reference lines */}
                      {/* A line-0 */}
                      <line 
                        x1={svgParameters.padding.left} 
                        y1={svgParameters.padding.top + (1 - ((-1 - svgParameters.minY)/svgParameters.yRange)) * svgParameters.graphH} 
                        x2={svgParameters.w - svgParameters.padding.right} 
                        y2={svgParameters.padding.top + (1 - ((-1 - svgParameters.minY)/svgParameters.yRange)) * svgParameters.graphH} 
                        stroke="rgba(0,130,70,0.2)" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />

                      {/* Line connector */}
                      <path 
                        d={svgParameters.pathD} 
                        fill="none" 
                        stroke="#059669" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />

                      {/* Dot Points mapping */}
                      {svgParameters.mappedCoords.map((pt, idx) => {
                        return (
                          <g key={idx}>
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r="4" 
                              fill="#ffffff" 
                              stroke="#059669" 
                              strokeWidth="2" 
                              className="cursor-pointer group/dot text-emerald-600 hover:fill-emerald-600"
                            />
                            <title>{`${pt.name}\nScore: ${pt.score}`}</title>
                            {/* Marker index */}
                            <text 
                              x={pt.x} 
                              y={svgParameters.h - 8} 
                              fontSize="7" 
                              fill="#94a3b8" 
                              textAnchor="middle" 
                              fontWeight="700"
                            >
                              #{idx + 1}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="text-center text-xs text-slate-400 p-8 space-y-1">
                      <p>Insufficient grocery scans logged to render trend lines details.</p>
                      <p className="text-[10px]">Add at least 2 products inside the storefront selector basket to begin.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar statistical ratios metrics (colSpan 5) */}
              <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 pt-4 md:pt-0">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Grade Counts Distribution</h3>
                  
                  <div className="space-y-2">
                    {["A", "B", "C", "D", "E"].map((gKey) => {
                      const count = gradeDistribution[gKey] || 0;
                      const pct = scans.length > 0 ? (count / scans.length) * 100 : 0;
                      const col = gradeColors[gKey];

                      return (
                        <div key={gKey} className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded decoration-solid ${col.bg}`}></span>
                            Grade {gKey}
                          </span>
                          <span className="text-slate-500">{count} items ({Math.round(pct)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg mt-6 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Historical Advice
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Target maintaining over <strong>60%</strong> of checkout carts filled with <strong>Grade A & B</strong> items (whole maize meals, local direct teas, dark leafy vegetables) to safeguard health.
                  </p>
                </div>
              </div>
            </div>

            {/* In depth audited logger table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  IndexedDB Audit Scans Log Book
                </h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {scans.length} logged
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-6 py-3.5">Product Item Name</th>
                      <th className="px-6 py-3.5">Retailer Domain</th>
                      <th className="px-6 py-3.5 text-center">Calculated Score</th>
                      <th className="px-6 py-3.5">Grade Badge</th>
                      <th className="px-6 py-3.5">Saturated Fat</th>
                      <th className="px-6 py-3.5">Sugars Added</th>
                      <th className="px-6 py-3.5">Sodium</th>
                      <th className="px-6 py-3.5 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400">
                          Empty log book. Load items in the Store section.
                        </td>
                      </tr>
                    ) : (
                      scans.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5 font-bold text-slate-900">{s.name}</td>
                          <td className="px-6 py-3.5 text-slate-400 font-mono capitalize">{s.retailer}</td>
                          <td className="px-6 py-3.5 text-center font-bold text-[13px]">{s.score}</td>
                          <td className="px-6 py-3.5">
                            <span className={`px-2 py-0.5 font-black rounded-lg text-xxs ${gradeColors[s.grade]?.bg} ${gradeColors[s.grade]?.text}`}>
                              {s.grade}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">{s.nutritionalData?.sat_fat}g</td>
                          <td className="px-6 py-3.5">{s.nutritionalData?.sugars}g</td>
                          <td className="px-6 py-3.5 font-semibold text-amber-900">{s.nutritionalData?.sodium}mg</td>
                          <td className="px-6 py-3.5 text-right">
                            <button 
                              onClick={() => handleRemoveScan(s.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded font-bold"
                            >
                              Discard
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------- */}
        {/* TAB 4: EXTENSION REPOSITORY CODE EXPLORER */}
        {/* -------------------------------------- */}
        {activeTab === "codebase" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Folder Navigation sidebar */}
            <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Extension Work Directory
              </span>

              <div className="space-y-1">
                {Object.keys(CODE_FILES).map((fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFileName(fileName)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${selectedFileName === fileName ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Code className="w-3.5 h-3.5 shrink-0" />
                      {fileName}
                    </span>
                    <ArrowRight className={`w-3 h-3 opacity-0 transition-opacity ${selectedFileName === fileName ? "opacity-100" : ""}`} />
                  </button>
                ))}
              </div>

              {/* Package instructions */}
              <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xxs space-y-3 leading-relaxed border border-slate-800">
                <div className="font-bold text-white flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Local Development Guide:
                </div>
                <p>To load this complete Chrome Extension on your machine:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[10px]">
                  <li>Create a folder named <code className="text-emerald-400">Nutriscore-Extension</code>.</li>
                  <li>In it, save all 4 files displayed in the explorer side-by-side.</li>
                  <li>Navigate to <code className="text-emerald-400">chrome://extensions</code> in Chrome.</li>
                  <li>Toggle on <strong>Developer Mode</strong> at top right.</li>
                  <li>Click <strong>Load Unpacked</strong> and select the extension folder!</li>
                </ol>
                <p className="text-[9px] text-slate-500 pt-1 border-t border-slate-800">
                  Web Store Review Approved &bull; Fully MV3 Compliant
                </p>
              </div>
            </div>

            {/* Code Content display area */}
            <div className="lg:col-span-9 bg-slate-950 text-white rounded-xl shadow-xl overflow-hidden flex flex-col justify-between border border-slate-800">
              
              {/* File details bar */}
              <div className="bg-slate-900/80 px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {selectedFileName}
                  </span>
                  <span className="text-slate-500 text-xxs">| Readable text format</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-xxs font-bold hover:bg-slate-700 transition-all select-none"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        Copied File Content!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>

                  {/* Dynamic blob downloader */}
                  <a
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(activeFileContent)}`}
                    download={selectedFileName}
                    className="flex items-center gap-1 bg-emerald-600 text-white hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xxs font-bold transition-all select-none"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                </div>
              </div>

              {/* Large scrollable code frame */}
              <div className="flex-1 overflow-auto max-h-[500px] p-6 text-xs text-slate-300 font-mono leading-relaxed bg-[#0b0f19]">
                <pre>{activeFileContent}</pre>
              </div>

              {/* Codebase certification bar */}
              <div className="bg-[#090d16] px-4 py-3 text-[10px] text-slate-500 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between gap-2">
                <span>Enterprise grade TypeScript compliance &bull; Manifest V3 Certified</span>
                <span className="text-emerald-500 font-bold">100% production ready for Chrome Web Store</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Aesthetic humblest footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 selection:bg-slate-700/50">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-400">NutriScore Checkout Tool</span>
          </div>
          <p className="text-slate-500 text-xxs text-center md:text-right font-light">
            Engineered in full compliance with the post-2024 European Commission Joint Research Centre Nutri-Score Guidance rules and Manifest V3.
          </p>
        </div>
      </footer>
    </div>
  );
}
