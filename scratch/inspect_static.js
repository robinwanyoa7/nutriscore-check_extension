const https = require('https');

function fetchPage(url, redirects = 0) {
  if (redirects > 5) { console.error("Too many redirects"); return; }
  
  const parsed = new URL(url);
  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'identity',
    }
  };

  console.log(`Fetching: ${url}`);

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    // Follow redirects
    if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
      const nextUrl = res.headers.location.startsWith('http') 
        ? res.headers.location 
        : `https://${parsed.hostname}${res.headers.location}`;
      console.log(`Redirecting to: ${nextUrl}`);
      return fetchPage(nextUrl, redirects + 1);
    }

    let html = '';
    res.on('data', (chunk) => html += chunk);
    res.on('end', () => {
      console.log(`HTML length: ${html.length} bytes`);

      // Look for product-related class names
      const classMatches = html.match(/class="([^"]{0,200})"/g) || [];
      const productClasses = new Set();
      classMatches.forEach(m => {
        const val = m.replace(/^class="/, '').replace(/"$/, '');
        if (/product|item|card|thumb|goods|prod|catalog|listing|article/i.test(val)) {
          productClasses.add(val.trim().substring(0, 120));
        }
      });

      console.log("\n=== PRODUCT-RELATED CLASSES ===");
      Array.from(productClasses).slice(0, 40).forEach(c => console.log(" -", c));

      // Alpine x-data
      const xDataMatches = html.match(/x-data="([^"]{0,200})"/g) || [];
      console.log("\n=== ALPINE x-data ATTRS ===");
      xDataMatches.slice(0, 20).forEach(m => console.log(" -", m.substring(0, 160)));

      // Any data-* with product
      const dataAttrs = html.match(/data-[a-z-]+=["'][^"']{1,60}["']/g) || [];
      const productDataAttrs = [...new Set(dataAttrs.filter(a => /product|sku|id/i.test(a)))];
      console.log("\n=== PRODUCT DATA ATTRS ===");
      productDataAttrs.slice(0, 20).forEach(a => console.log(" -", a));

      // Spot product links
      const productLinks = [...new Set(html.match(/href="\/[a-z0-9-]+\.html/g) || [])];
      console.log("\n=== .HTML PRODUCT LINKS (Magento-style) ===");
      productLinks.slice(0, 15).forEach(l => console.log(" -", l));

      // Look for any product-related Alpine arrays/loops
      const forMatches = html.match(/x-for="[^"]{0,150}"/g) || [];
      console.log("\n=== ALPINE x-for LOOPS ===");
      forMatches.slice(0, 10).forEach(m => console.log(" -", m.substring(0, 160)));

      // Save raw HTML snippet around first "product"
      const productIdx = html.toLowerCase().indexOf('product');
      if (productIdx > 0) {
        console.log("\n=== RAW HTML around first 'product' occurrence ===");
        console.log(html.substring(Math.max(0, productIdx - 200), productIdx + 600));
      }
    });
  });

  req.on('error', e => console.error("Request error:", e.message));
  req.end();
}

// Try the www version which often skips Cloudflare redirect
fetchPage('https://www.naivas.online/grocery');
