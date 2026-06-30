const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  console.log("Launching Edge...");
  // Launch Edge on Windows
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: "new"
  });
  const page = await browser.newPage();
  
  // Set a standard user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0');

  console.log("Navigating to Naivas Online...");
  try {
    await page.goto('https://naivas.online', { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    console.log("Navigation timeout or error, proceeding anyway...");
  }

  // Simulate injecting the content script
  await page.evaluate(() => {
    const RETAILER_ADAPTERS = {
      naivas: {
        productSelector: ".product-box, .product-thumb, .thumbnail, .simple-card, [class*='product']",
        nameSelector: ".product-title, .title, h4, .name, .desc .desc-title, h3",
        priceSelector: ".price, .price-new, .price-box, .amount",
        categorySelector: ".breadcrumb, .page-title-wrapper, .breadcrumbs",
      }
    };
    const adapter = RETAILER_ADAPTERS.naivas;

    const cards = document.querySelectorAll(adapter.productSelector);
    let results = [];
    cards.forEach((card, index) => {
      const nameEl = card.querySelector(adapter.nameSelector);
      if (nameEl && index < 10) { 
        results.push(nameEl.textContent.trim());
      }
    });

    return results;
  }).then((results) => {
    console.log("Found products on page:");
    if (results && results.length > 0) {
      results.forEach(res => console.log("- " + res));
      console.log("\n✅ Test successful: Product selectors successfully grabbed items from the real DOM.");
    } else {
      console.log("❌ No products found using the current selectors. We may need to update naivas.online selectors.");
    }
  });

  await browser.close();
})();
