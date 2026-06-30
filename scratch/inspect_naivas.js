const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  console.log("Navigating to Naivas Online grocery section...");
  await page.goto('https://naivas.online/grocery', { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for some basic content
  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(() => {
    // Dump top-level classes to understand page structure
    const body = document.body;
    const allTags = ['article', 'li', 'div', 'a', 'section'];
    const report = {};

    // Find common product patterns
    const candidates = [
      '.product-card', '.product-item', '.product-box', '.product-thumb',
      '.thumbnail', '.simple-card', '.card', '[data-product-id]',
      '[class*="product"]', '[class*="item-card"]', '[class*="prod"]',
      'article', '.product', '.goods-item',
      // Magento-style
      '.product-item-info', '.product-items li', '.item.product',
      // Vue/React common patterns
      '[class*="ProductCard"]', '[class*="product-card"]',
      // Grid cells
      '.grid > div', '.products > li', '.products-grid li'
    ];

    candidates.forEach(sel => {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          // Check if these have text content suggesting product names
          const sample = Array.from(els).slice(0, 3).map(el => ({
            tag: el.tagName,
            classes: el.className.toString().substring(0, 80),
            text: el.textContent.trim().substring(0, 60),
            children: el.children.length
          }));
          report[sel] = { count: els.length, samples: sample };
        }
      } catch(e) {}
    });

    // Also dump any elements with class names containing "product"
    const allEls = document.querySelectorAll('*');
    const productClasses = new Set();
    allEls.forEach(el => {
      const cls = el.className;
      if (typeof cls === 'string' && cls.toLowerCase().includes('product')) {
        productClasses.add(cls.substring(0, 100));
      }
    });
    
    return { 
      report, 
      productClasses: Array.from(productClasses).slice(0, 30),
      title: document.title,
      url: window.location.href
    };
  });

  console.log("\n=== PAGE INFO ===");
  console.log("URL:", result.url);
  console.log("Title:", result.title);

  console.log("\n=== SELECTOR MATCHES ===");
  Object.entries(result.report).forEach(([sel, data]) => {
    console.log(`\n[${sel}] — ${data.count} elements`);
    data.samples.forEach((s, i) => {
      console.log(`  Sample ${i+1}: <${s.tag}> class="${s.classes}" children=${s.children}`);
      console.log(`    Text: "${s.text}"`);
    });
  });

  console.log("\n=== CLASSES WITH 'product' ===");
  result.productClasses.forEach(c => console.log(" -", c));

  await browser.close();
})();
