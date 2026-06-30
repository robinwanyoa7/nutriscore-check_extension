const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://naivas.online/',
        'Origin': 'https://naivas.online',
        'x-requested-with': 'XMLHttpRequest',
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  // Try common Magento REST API endpoints used by Naivas (Magento 2 store)
  const endpoints = [
    'https://naivas.online/rest/V1/products?searchCriteria[pageSize]=5&searchCriteria[currentPage]=1',
    'https://naivas.online/rest/default/V1/categories/list?searchCriteria[pageSize]=5',
    'https://naivas.online/graphql',
    // Try sitemap to see real URL patterns
    'https://naivas.online/sitemap.xml',
    // Try their search API
    'https://naivas.online/catalogsearch/result/?q=milk',
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTrying: ${url}`);
      const result = await fetchJson(url);
      console.log(`Status: ${result.status}`);
      if (result.status === 200) {
        console.log(`Response (first 500 chars):\n${result.body.substring(0, 500)}`);
        break;
      }
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  }

  // Also try catalogsearch to see rendered product HTML
  try {
    console.log('\n\nFetching search results page for "milk"...');
    const res = await fetchJson('https://naivas.online/catalogsearch/result/?q=milk');
    console.log(`Status: ${res.status}`);
    if (res.status === 200) {
      const html = res.body;
      // Find product classes
      const classMatches = html.match(/class="([^"]{0,200})"/g) || [];
      const productClasses = new Set();
      classMatches.forEach(m => {
        const val = m.replace(/^class="/, '').replace(/"$/, '');
        if (/product|item|card|thumb|goods|prod|catalog/i.test(val)) {
          productClasses.add(val.trim().substring(0, 120));
        }
      });
      console.log("\n=== Product Classes Found ===");
      [...productClasses].forEach(c => console.log(" -", c));

      // Spot product links
      const productLinks = [...new Set((html.match(/href="https:\/\/naivas\.online\/[^"]+\.html"/g) || []))];
      console.log("\n=== Product Link Patterns ===");
      productLinks.slice(0, 15).forEach(l => console.log(" -", l));
    }
  } catch(e) {
    console.log("Search fetch error:", e.message);
  }
})();
