/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("scans-log-body");
  const metricScans = document.getElementById("metric-scans");
  const metricAvgScore = document.getElementById("metric-avg-score");
  const metricAvgLabel = document.getElementById("metric-avg-label");
  const metricSwaps = document.getElementById("metric-swaps");
  const metricHealthGrade = document.getElementById("metric-health-grade");
  const gradeVisualBar = document.getElementById("grade-visual-bar");
  const gradeBreakdownNumbers = document.getElementById("grade-breakdown-numbers");
  const resetBtn = document.getElementById("reset-data-btn");

  const gradeColors = {
    A: "#008246",
    B: "#3cb371",
    C: "#ffcc00",
    D: "#ff6600",
    E: "#e63b2e"
  };

  const gradeDescs = {
    A: "Excellent Profile",
    B: "Good Profile",
    C: "Standard Profile",
    D: "Low Profile",
    E: "Poor Profile"
  };

  function loadDashboard() {
    chrome.runtime.sendMessage({ action: "GET_ALL_SCANS" }, (response) => {
      if (response && response.success && response.data) {
        const scans = response.data;
        metricScans.textContent = scans.length;

        // Count mock swaps if high-grade scans have fallback links clicked
        // We can mock this as number of A/B scans or items swapped
        const swapsCount = scans.filter(s => s.grade === 'A' || s.grade === 'B').length;
        metricSwaps.textContent = Math.round(swapsCount * 0.4); // Mock ratio as swaps

        if (scans.length === 0) {
          metricAvgScore.textContent = "--";
          metricAvgLabel.textContent = "No data yet";
          metricHealthGrade.textContent = "--";
          metricHealthGrade.style.color = "#64748b";
          tableBody.innerHTML = `<tr><td colspan="7" class="no-data">No product scans found in IndexedDB history.</td></tr>`;
          gradeVisualBar.innerHTML = "";
          gradeBreakdownNumbers.innerHTML = "<p class='no-data' style='padding:10px 0;'>No grade stats</p>";
          drawEmptyChart();
          return;
        }

        // Render logs
        tableBody.innerHTML = "";
        let scoreSum = 0;
        const distribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };

        scans.forEach((item) => {
          scoreSum += item.score;
          distribution[item.grade] = (distribution[item.grade] || 0) + 1;

          const tr = document.createElement("tr");
          const nut = item.nutritionalData || {};
          tr.innerHTML = `
            <td style="font-weight: 600; color: #0f172a;">${item.name}</td>
            <td style="color: #64748b;">${item.retailer}</td>
            <td style="font-weight: 700; text-align: center;">${item.score}</td>
            <td><span class="mini-badge bg-${item.grade}">${item.grade}</span></td>
            <td>${nut.sat_fat !== undefined ? Number(nut.sat_fat).toFixed(1) + "g" : "N/A"}</td>
            <td>${nut.sugars !== undefined ? Number(nut.sugars).toFixed(1) + "g" : "N/A"}</td>
            <td>${nut.sodium !== undefined ? Math.round(nut.sodium) + "mg" : "N/A"}</td>
          `;
          tableBody.appendChild(tr);
        });

        // average score
        const avgScore = scoreSum / scans.length;
        metricAvgScore.textContent = avgScore.toFixed(1);

        let finalGrade = "C";
        if (avgScore <= -1) finalGrade = "A";
        else if (avgScore <= 2) finalGrade = "B";
        else if (avgScore <= 10) finalGrade = "C";
        else if (avgScore <= 18) finalGrade = "D";
        else finalGrade = "E";

        metricAvgLabel.textContent = gradeDescs[finalGrade];
        metricHealthGrade.textContent = finalGrade;
        metricHealthGrade.style.color = gradeColors[finalGrade];

        // Draw grade distribution bars
        renderDistribution(distribution, scans.length);

        // Draw the SVG trend chart
        drawTrendChart(scans);
      }
    });
  }

  function renderDistribution(dist, total) {
    gradeVisualBar.innerHTML = "";
    gradeBreakdownNumbers.innerHTML = "";

    const keys = ["A", "B", "C", "D", "E"];
    keys.forEach((key) => {
      const count = dist[key] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;

      // 1. Sidebar detailed row
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.fontSize = "12px";
      row.innerHTML = `
        <span style="font-weight:700; display:flex; align-items:center; gap:6px;">
          <span style="width:12px; height:12px; background:${gradeColors[key]}; display:inline-block; border-radius:3px;"></span>
          Grade ${key}
        </span>
        <span style="color:#64748b; font-weight:600;">${count} items (${Math.round(pct)}%)</span>
      `;
      gradeBreakdownNumbers.appendChild(row);

      // 2. Segment bar
      if (pct > 0) {
        const seg = document.createElement("div");
        seg.className = "grade-bar-segment";
        seg.style.width = `${pct}%`;
        seg.style.backgroundColor = gradeColors[key];
        seg.textContent = key;
        gradeVisualBar.appendChild(seg);
      }
    });
  }

  function drawEmptyChart() {
    const container = document.getElementById("trend-chart-container");
    container.innerHTML = `<div class="no-data">Insufficient scans to render trend line. Log grocery basket items to populate curves.</div>`;
  }

  function drawTrendChart(scans) {
    // Reverse scans array to plot chronologically (left to right)
    const points = [...scans].reverse().map((s, index) => ({
      x: index,
      y: s.score,
      name: s.name
    }));

    if (points.length < 2) {
      drawEmptyChart();
      return;
    }

    const container = document.getElementById("trend-chart-container");
    container.innerHTML = `<svg id="trend-svg" width="100%" height="100%" style="overflow: visible; padding: 20px 10px;"></svg>`;
    const svg = document.getElementById("trend-svg");

    const width = Math.max(container.clientWidth || 800, 400) - 40;
    const height = 210;

    // Set SVG viewBox
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    const padding = { top: 15, right: 30, bottom: 25, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max scores
    const yValues = points.map(p => p.y);
    const minY = Math.min(...yValues, -5); // Lock baseline to support good values
    const maxY = Math.max(...yValues, 20); // Lock ceiling to match E grade
    const yRange = maxY - minY;

    // Map point values to pixel positions
    const mappedPoints = points.map((p, i) => {
      const xPct = points.length > 1 ? i / (points.length - 1) : 0.5;
      const x = padding.left + (xPct * chartWidth);
      const yPct = 1 - ((p.y - minY) / yRange);
      const y = padding.top + (yPct * chartHeight);
      return { x, y, val: p.y, label: p.name };
    });

    // 1. Draw horizontal grade limit zones
    const gradeBoundaries = [
      { score: -1, color: "rgba(0, 130, 70, 0.05)", label: "Solid A" },
      { score: 2, color: "rgba(60, 179, 113, 0.05)", label: "Good B" },
      { score: 10, color: "rgba(255, 204, 0, 0.05)", label: "Moderate C" },
      { score: 18, color: "rgba(255, 102, 0, 0.05)", label: "Poor D" },
      { score: 30, color: "rgba(230, 59, 46, 0.05)", label: "Crit E" }
    ];

    let prevY = padding.top + chartHeight;
    gradeBoundaries.forEach((boundary) => {
      const mappedVal = padding.top + (1 - ((boundary.score - minY) / yRange)) * chartHeight;
      const boundedY = Math.max(padding.top, Math.min(mappedVal, padding.top + chartHeight));
      
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", padding.left);
      rect.setAttribute("y", boundedY);
      rect.setAttribute("width", chartWidth);
      rect.setAttribute("height", Math.abs(prevY - boundedY));
      rect.setAttribute("fill", boundary.color);
      svg.appendChild(rect);
      prevY = boundedY;
    });

    // 2. Draw axis lines
    const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    xAxis.setAttribute("x1", padding.left);
    xAxis.setAttribute("y1", padding.top + chartHeight);
    xAxis.setAttribute("x2", padding.left + chartWidth);
    xAxis.setAttribute("y2", padding.top + chartHeight);
    xAxis.setAttribute("stroke", "#cbd5e1");
    xAxis.setAttribute("stroke-width", "1.5");
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    yAxis.setAttribute("x1", padding.left);
    yAxis.setAttribute("y1", padding.top);
    yAxis.setAttribute("x2", padding.left);
    yAxis.setAttribute("y2", padding.top + chartHeight);
    yAxis.setAttribute("stroke", "#cbd5e1");
    yAxis.setAttribute("stroke-width", "1.5");
    svg.appendChild(yAxis);

    // 3. Draw grid lines & Y ticks
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const yVal = minY + (yRange * (i / yTicks));
      const yPct = 1 - ((yVal - minY) / yRange);
      const y = padding.top + (yPct * chartHeight);

      const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      gridLine.setAttribute("x1", padding.left);
      gridLine.setAttribute("y1", y);
      gridLine.setAttribute("x2", padding.left + chartWidth);
      gridLine.setAttribute("y2", y);
      gridLine.setAttribute("stroke", "#f1f5f9");
      gridLine.setAttribute("stroke-width", "1");
      svg.appendChild(gridLine);

      const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      yLabel.setAttribute("x", padding.left - 10);
      yLabel.setAttribute("y", y + 4);
      yLabel.setAttribute("font-size", "10px");
      yLabel.setAttribute("fill", "#64748b");
      yLabel.setAttribute("text-anchor", "end");
      yLabel.setAttribute("font-weight", "600");
      yLabel.textContent = Math.round(yVal);
      svg.appendChild(yLabel);
    }

    // 4. Draw connecting path line
    let pathD = `M ${mappedPoints[0].x} ${mappedPoints[0].y}`;
    for (let i = 1; i < mappedPoints.length; i++) {
      pathD += ` L ${mappedPoints[i].x} ${mappedPoints[i].y}`;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#059669");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    // 5. Draw interactive dots
    mappedPoints.forEach((p, i) => {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", p.x);
      circle.setAttribute("cy", p.y);
      circle.setAttribute("r", "5");
      circle.setAttribute("fill", "#ffffff");
      circle.setAttribute("stroke", "#059669");
      circle.setAttribute("stroke-width", "2.5");
      circle.style.cursor = "pointer";

      // Append hover tooltip support
      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${p.label}\nNutri-Score: ${p.val}`;
      circle.appendChild(title);

      svg.appendChild(circle);

      // Add X axis label index ticks
      if (i % Math.max(1, Math.round(mappedPoints.length / 8)) === 0) {
        const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xLabel.setAttribute("x", p.x);
        xLabel.setAttribute("y", padding.top + chartHeight + 16);
        xLabel.setAttribute("font-size", "9px");
        xLabel.setAttribute("fill", "#64748b");
        xLabel.setAttribute("text-anchor", "middle");
        xLabel.setAttribute("font-weight", "600");
        xLabel.textContent = `Scan #${i + 1}`;
        svg.appendChild(xLabel);
      }
    });
  }

  resetBtn.addEventListener("click", () => {
    if (confirm("Reset layout data? This will flush your local product scans from IndexedDB.")) {
      chrome.runtime.sendMessage({ action: "CLEAR_HISTORY" }, () => {
        loadDashboard();
      });
    }
  });

  loadDashboard();
});
