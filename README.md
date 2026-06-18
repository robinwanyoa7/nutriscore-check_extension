# NutriScore Checkout Tool

A modular, high-performance browser extension designed to insert real-time, actionable nutritional insights directly into online grocery e-commerce flows at the point of purchase.

---

## Architectural Overview

The application utilizes a clean design system deployed across three isolated browser runtime environments:

```
src/
├── components/          # Shared, pure layout templates (HTML/CSS/JS)
│   ├── GradeChip.js     # Color-coded A–E nutritional hazard badge
│   ├── NutrientBar.js   # Dynamic macro/micronutrient metric tracker
│   └── theme.css        # Centralized styling variables and design tokens
[cite_start]├── content-script/      # Injected runtime (DOM scraper & inline Shadow DOM) [cite: 18]
├── popup/               # Toolbar action overlay (Quick item scanning)
[cite_start]└── dashboard/           # Full-page analytics (Historical buying trends) [cite: 20]

```

### Multicontext Isolation Strategy

* 
**Inline Widget Section:** Injected via content scripts into active retail tabs. It mounts inside an isolated **Shadow DOM** to guarantee the host website's stylesheets cannot bleed into or break our extension components.


* 
**Popup Section:** A lightweight, self-contained HTML page initialized on toolbar interaction for quick product evaluations.


* 
**Dashboard Section:** A full-browser extension application workspace visualizing aggregate long-term shopping trends from localized historical data arrays.



---

## Feature Set (MVP Scope)

* 
**Autonomous DOM Extraction:** Instantly reads layout-specific ingredient data arrays and product metadata from active grocery viewports.


* **Nutri-Score Mapping Engine:** Balances negative nutritional attributes (energy, sugars, saturated fats, sodium) against positive values (fiber, proteins, fruits/vegetables) per 100g to produce a relative alphanumeric grade from **A (Optimal)** to **E (High Risk)**.
* **Inline Alternative Recommendation:** Detects items carrying poor scores and actively suggests lower-hazard items within the same subcategory.
* 
**Localized Analytical Storage:** Computes and tracks historical data locally using browser storage APIs, mapping consumption trends over time without violating user data privacy.



---

## Tech Stack & Configuration

* 
**Runtime Logic:** Vanilla ECMAScript / TypeScript 


* 
**Layout Engine:** Native HTML5 Templates, Structural CSS3, Tailwind Design Tokens 


* 
**Module Bundler:** Vite with customized multi-entry Rollup compilation maps 



---

## Local Development & Testing Workflow

1. Clone or download this project directory locally.


2. Open Google Chrome and navigate directly to the extension management portal via `chrome://extensions/`.
3. Enable **Developer mode** using the toggle interface located in the top-right corner.
4. Select **Load unpacked** in the top-left section and choose the project build directory.
5. Code updates can be pushed down instantly by selecting the refresh icon on the active extension card interface.

Would you like us to establish the JavaScript structure for your vanilla `NutrientBar` layout engine next?
