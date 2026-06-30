/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener("DOMContentLoaded", () => {
  const scannedList = document.getElementById("scanned-list");
  const avgScoreEl = document.getElementById("avg-score");
  const avgGradeEl = document.getElementById("avg-grade");
  const itemsHeader = document.getElementById("items-header");
  const openDashboardBtn = document.getElementById("open-dashboard");
  const clearScansBtn = document.getElementById("clear-scans-btn");

  const gradeColors = {
    A: "#008246",
    B: "#3cb371",
    C: "#ffcc00",
    D: "#ff6600",
    E: "#e63b2e"
  };

  function updatePopup() {
    chrome.runtime.sendMessage({ action: "GET_ALL_SCANS" }, (response) => {
      if (response && response.success && response.data) {
        const scans = response.data;
        itemsHeader.textContent = `Scanned Products (${scans.length})`;

        if (scans.length === 0) {
          scannedList.innerHTML = `<div class="empty-state">No product scans in this session.<br>Visit Carrefour, Naivas, or Jumia to start.</div>`;
          avgScoreEl.textContent = "--";
          avgGradeEl.textContent = "-";
          avgGradeEl.style.backgroundColor = "#94a3b8";
          return;
        }

        // Render scanned list (max 10 recent scans)
        scannedList.innerHTML = "";
        let scoreSum = 0;

        scans.slice(0, 10).forEach((item) => {
          scoreSum += item.score;
          const li = document.createElement("li");
          li.className = "scanned-item";
          
          li.innerHTML = `
            <div>
              <div class="item-name">${item.name}</div>
              <div class="item-retailer">${item.retailer} • KSh ${item.price || "N/A"}</div>
            </div>
            <div class="item-grade" style="background-color: ${gradeColors[item.grade] || '#cbd5e1'}">${item.grade}</div>
          `;
          scannedList.appendChild(li);
        });

        // Compute average score & grade
        const avgScore = scoreSum / Math.min(scans.length, 10);
        let calculatedGrade = "C";
        if (avgScore <= -1) calculatedGrade = "A";
        else if (avgScore <= 2) calculatedGrade = "B";
        else if (avgScore <= 10) calculatedGrade = "C";
        else if (avgScore <= 18) calculatedGrade = "D";
        else calculatedGrade = "E";

        avgScoreEl.textContent = Math.round(avgScore);
        avgGradeEl.textContent = calculatedGrade;
        avgGradeEl.className = `grade-badge badge-${calculatedGrade}`;
      }
    });
  }

  // Action: Open Standalone Options / Dashboard page
  openDashboardBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("dashboard.html"));
    }
  });

  // Action: Clear history
  clearScansBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your local product scan history? This action cannot be undone.")) {
      chrome.runtime.sendMessage({ action: "CLEAR_HISTORY" }, () => {
        updatePopup();
      });
    }
  });

  // Initial update
  updatePopup();
});
