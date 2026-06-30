# NutriScore Checkout Tool (Kenya) - Project Blueprint & Reference Guide

This file outlines the engineering design, repository files, and system boundaries built to satisfy the 6-phase development roadmap.

## Project Structure & File Boundaries

### 1. Unified Chrome Option & Content Scripts (`/extension` folder)
* **`manifest.json`**: Manifest V3 compliant setup mapping host-permissions safely to `carrefourkenya.com`, `naivas.online`, `naivas.co.ke`, and `jumia.co.ke`.
* **`background.js`**: Service Worker that intercepts scraping requests, coordinates local-first lookups against custom Kenyan catalog tables, proxies Open Food Facts REST calls, caches responses, and commits logs to IndexedDB.
* **`calculator.js`**: The official mathematical solver executing the revised 2024 Nutri-Score calculation rules (including solid foods exclusion rule if negative points &ge; 11).
* **`db.js`**: Promise-based transactional interface wrapper on IndexedDB handling schema creation and aggregate log retrievals safely.
* **`content.js`**: MutationObserver DOM scanner with specific retailer adapters that injects Shadow DOM badging layers automatically above product grids.
* **`popup.html` / `popup.js`**: Active shopping frame displaying current session checkout health state aggregates.
* **`dashboard.html` / `dashboard.js`**: Standalone analytics dashboard drawing native inline SVG charts from local IndexedDB scans, avoiding external scripts flags.

### 2. Interactive Web Sandbox Simulation Suite (`/src` folder)
* **`App.tsx`**: Host simulator rendering mock Kenyan e-commerce layouts. Clicking the "To Checkout" cart mimics dynamic dynamic scrolls, injecting official NutriScore isolated badges and interactive "Alternative Swaps" hover cards. Includes code viewer/downloaders for each local file component.
