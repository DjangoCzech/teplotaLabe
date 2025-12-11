// Configuration
const API_URL = "api.php"; // Local PHP API endpoint
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Chart instances
let temperatureChart = null;
let waterLevelChart = null;
let flowChart = null;

// Time range for charts (in hours, or 'all')
let chartTimeRange = 48; // Default 48 hours

// Fetch data from local PHP API
async function fetchData(limit = null) {
  try {
    // Always fetch maximum data to allow switching between ranges
    if (limit === null) {
      limit = 500; // Maximum allowed by API
    }

    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const url = `${API_URL}?limit=${limit}&_t=${timestamp}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const json = await response.json();

    if (!json.success) {
      throw new Error(json.error || "Failed to fetch data");
    }

    return json.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    showError("Nepodařilo se načíst data. Zkuste to prosím později.");
    return null;
  }
}

// Update flood status based on water level
function updateFloodStatus(level) {
  const statusDiv = document.getElementById("currentStatus");
  if (!statusDiv) return;

  const levelNum = parseFloat(level);
  if (isNaN(levelNum)) {
    statusDiv.innerHTML = `
      <div class="level-item level-normal">
        <span class="level-name">Nedá se určit</span>
        <span class="level-value">-</span>
      </div>
    `;
    return;
  }

  let statusHtml = "";

  if (levelNum > 659) {
    statusHtml = `
      <div class="level-item level-extreme">
        <span class="level-name">🔴 3. SPA (extrémní povodeň)</span>
        <span class="level-value">Aktuální stav: ${level} cm</span>
      </div>
    `;
  } else if (levelNum > 450) {
    statusHtml = `
      <div class="level-item level-3">
        <span class="level-name">🔴 3. SPA (ohrožení)</span>
        <span class="level-value">Aktuální stav: ${level} cm</span>
      </div>
    `;
  } else if (levelNum > 400) {
    statusHtml = `
      <div class="level-item level-2">
        <span class="level-name">🟠 2. SPA (pohotovost)</span>
        <span class="level-value">Aktuální stav: ${level} cm</span>
      </div>
    `;
  } else if (levelNum > 350) {
    statusHtml = `
      <div class="level-item level-1">
        <span class="level-name">🟡 1. SPA (bdělost)</span>
        <span class="level-value">Aktuální stav: ${level} cm</span>
      </div>
    `;
  } else if (levelNum < 54) {
    statusHtml = `
      <div class="level-item level-drought">
        <span class="level-name">🟤 Sucho</span>
        <span class="level-value">Aktuální stav: ${level} cm (< 54 cm)</span>
      </div>
    `;
  } else {
    statusHtml = `
      <div class="level-item level-normal">
        <span class="level-name">🟢 Normální stav</span>
        <span class="level-value">Aktuální stav: ${level} cm</span>
      </div>
    `;
  }

  statusDiv.innerHTML = statusHtml;
}

// Update main statistics
function updateMainStats(data) {
  if (!data || data.length === 0) return;

  // Get the latest measurement with temperature
  let latestWithTemp = data.find(
    (d) => d.temperature !== "-" && d.temperature !== ""
  );
  let latest = data[0];

  // Update temperature
  if (latestWithTemp) {
    document.getElementById(
      "temperature"
    ).innerHTML = `${latestWithTemp.temperature} <span class="unit">°C</span>`;
    document.getElementById(
      "temp-time"
    ).textContent = `Měřeno: ${latestWithTemp.dateTime}`;
  }

  // Update water level
  if (latest.level !== "-") {
    document.getElementById(
      "water-level"
    ).innerHTML = `${latest.level} <span class="unit">cm</span>`;
    document.getElementById(
      "level-time"
    ).textContent = `Měřeno: ${latest.dateTime}`;

    // Update flood status
    updateFloodStatus(latest.level);
  }

  // Update flow rate
  if (latest.flow !== "-") {
    document.getElementById(
      "flow-rate"
    ).innerHTML = `${latest.flow} <span class="unit">m³/s</span>`;
    document.getElementById(
      "flow-time"
    ).textContent = `Měřeno: ${latest.dateTime}`;
  }

  // Update last update time
  document.getElementById("lastUpdate").textContent = new Date().toLocaleString(
    "cs-CZ"
  );
}

// Update data table
function updateDataTable(data) {
  const tbody = document.getElementById("tableBody");
  if (!data || data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="loading-cell">Žádná data k dispozici</td></tr>';
    return;
  }

  // Show last 24 measurements
  const displayData = data.slice(0, 24);
  tbody.innerHTML = displayData
    .map(
      (row) => `
        <tr>
            <td>${row.dateTime}</td>
            <td>${row.level}</td>
            <td>${row.flow}</td>
            <td>${row.temperature}</td>
        </tr>
    `
    )
    .join("");
}

// Create/update temperature chart
function updateTemperatureChart(data) {
  const ctx = document.getElementById("temperatureChart");
  if (!ctx) return;

  // Filter data with temperature values
  let tempData = data.filter(
    (d) => d.temperature !== "-" && d.temperature !== ""
  );

  // Apply time range based on actual time difference
  if (chartTimeRange !== "all") {
    const now = new Date();
    const cutoffTime = new Date(
      now.getTime() - chartTimeRange * 60 * 60 * 1000
    );

    tempData = tempData.filter((d) => {
      // Parse Czech date format: "DD.MM.YYYY HH:MM"
      const parts = d.dateTime.match(
        /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/
      );
      if (parts) {
        const recordDate = new Date(
          parts[3],
          parts[2] - 1,
          parts[1],
          parts[4],
          parts[5]
        );
        return recordDate >= cutoffTime;
      }
      return true;
    });
  }

  tempData = tempData.reverse();

  const labels = tempData.map((d) => {
    const parts = d.dateTime.split(" ");
    return parts.length >= 2
      ? parts[0].substring(0, 5) + " " + parts[1]
      : d.dateTime;
  });
  const temperatures = tempData.map((d) => parseFloat(d.temperature));

  if (temperatureChart) {
    temperatureChart.destroy();
  }

  temperatureChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Teplota [°C]",
          data: temperatures,
          borderColor: "#f5576c",
          backgroundColor: "rgba(245, 87, 108, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxRotation: 45,
            minRotation: 45,
          },
          grid: { color: "#334155" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

// Create/update water level chart
function updateWaterLevelChart(data) {
  const ctx = document.getElementById("waterLevelChart");
  if (!ctx) return;

  // Filter data with level values
  let levelData = data.filter((d) => d.level !== "-");

  // Apply time range based on actual time difference
  if (chartTimeRange !== "all") {
    const now = new Date();
    const cutoffTime = new Date(
      now.getTime() - chartTimeRange * 60 * 60 * 1000
    );

    levelData = levelData.filter((d) => {
      const parts = d.dateTime.match(
        /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/
      );
      if (parts) {
        const recordDate = new Date(
          parts[3],
          parts[2] - 1,
          parts[1],
          parts[4],
          parts[5]
        );
        return recordDate >= cutoffTime;
      }
      return true;
    });
  }

  levelData = levelData.reverse();

  const labels = levelData.map((d) => {
    const parts = d.dateTime.split(" ");
    return parts.length >= 2
      ? parts[0].substring(0, 5) + " " + parts[1]
      : d.dateTime;
  });
  const levels = levelData.map((d) => parseFloat(d.level));

  if (waterLevelChart) {
    waterLevelChart.destroy();
  }

  waterLevelChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Stav hladiny [cm]",
          data: levels,
          borderColor: "#4facfe",
          backgroundColor: "rgba(79, 172, 254, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxRotation: 45,
            minRotation: 45,
          },
          grid: { color: "#334155" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

// Create/update flow rate chart
function updateFlowChart(data) {
  const ctx = document.getElementById("flowChart");
  if (!ctx) return;

  // Filter data with flow values
  let flowData = data.filter((d) => d.flow !== "-");

  // Apply time range based on actual time difference
  if (chartTimeRange !== "all") {
    const now = new Date();
    const cutoffTime = new Date(
      now.getTime() - chartTimeRange * 60 * 60 * 1000
    );

    flowData = flowData.filter((d) => {
      const parts = d.dateTime.match(
        /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/
      );
      if (parts) {
        const recordDate = new Date(
          parts[3],
          parts[2] - 1,
          parts[1],
          parts[4],
          parts[5]
        );
        return recordDate >= cutoffTime;
      }
      return true;
    });
  }

  flowData = flowData.reverse();

  const labels = flowData.map((d) => {
    const parts = d.dateTime.split(" ");
    return parts.length >= 2
      ? parts[0].substring(0, 5) + " " + parts[1]
      : d.dateTime;
  });
  const flows = flowData.map((d) => parseFloat(d.flow));

  if (flowChart) {
    flowChart.destroy();
  }

  flowChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Průtok [m³/s]",
          data: flows,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxRotation: 45,
            minRotation: 45,
          },
          grid: { color: "#334155" },
        },
        y: {
          ticks: { color: "#94a3b8" },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

// Show error message
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error";
  errorDiv.textContent = message;

  const container = document.querySelector(".container");
  container.insertBefore(errorDiv, container.firstChild);

  setTimeout(() => errorDiv.remove(), 5000);
}

// Update only charts with current data
function updateAllCharts() {
  if (currentData) {
    updateTemperatureChart(currentData);
    updateWaterLevelChart(currentData);
    updateFlowChart(currentData);
  }
}

// Main update function
async function updateData() {
  const data = await fetchData();
  if (data) {
    currentData = data; // Store data for modal use
    updateMainStats(data);
    updateDataTable(data);
    updateTemperatureChart(data);
    updateWaterLevelChart(data);
    updateFlowChart(data);
  }
}

// Modal functionality
let modalChart = null;
let currentData = null;

function openModal(chartType) {
  const modal = document.getElementById("chartModal");
  const modalTitle = document.getElementById("modalTitle");

  if (chartType === "temperature") {
    modalTitle.textContent = "🌡️ Graf teploty vody - posledních 24 hodin";
    createModalChart("temperature");
  } else if (chartType === "level") {
    modalTitle.textContent = "📏 Graf stavu hladiny - posledních 24 hodin";
    createModalChart("level");
  } else if (chartType === "flow") {
    modalTitle.textContent = "💧 Graf průtoku - posledních 24 hodin";
    createModalChart("flow");
  }

  modal.classList.add("show");
}

function closeModal() {
  const modal = document.getElementById("chartModal");
  modal.classList.remove("show");
  if (modalChart) {
    modalChart.destroy();
    modalChart = null;
  }
}

function createModalChart(type) {
  if (!currentData) return;

  const ctx = document.getElementById("modalChart");
  if (!ctx) return;

  if (modalChart) {
    modalChart.destroy();
  }

  let filteredData, labels, values, label, color, bgColor;

  if (type === "temperature") {
    filteredData = currentData
      .filter((d) => d.temperature !== "-" && d.temperature !== "")
      .slice(0, 24)
      .reverse();
    labels = filteredData.map((d) => {
      const parts = d.dateTime.split(" ");
      return parts.length >= 2
        ? parts[0].substring(0, 5) + " " + parts[1]
        : d.dateTime;
    });
    values = filteredData.map((d) => parseFloat(d.temperature));
    label = "Teplota [°C]";
    color = "#f5576c";
    bgColor = "rgba(245, 87, 108, 0.1)";
  } else if (type === "level") {
    filteredData = currentData
      .filter((d) => d.level !== "-")
      .slice(0, 24)
      .reverse();
    labels = filteredData.map((d) => {
      const parts = d.dateTime.split(" ");
      return parts.length >= 2
        ? parts[0].substring(0, 5) + " " + parts[1]
        : d.dateTime;
    });
    values = filteredData.map((d) => parseFloat(d.level));
    label = "Stav hladiny [cm]";
    color = "#4facfe";
    bgColor = "rgba(79, 172, 254, 0.1)";
  } else if (type === "flow") {
    filteredData = currentData
      .filter((d) => d.flow !== "-")
      .slice(0, 24)
      .reverse();
    labels = filteredData.map((d) => {
      const parts = d.dateTime.split(" ");
      return parts.length >= 2
        ? parts[0].substring(0, 5) + " " + parts[1]
        : d.dateTime;
    });
    values = filteredData.map((d) => parseFloat(d.flow));
    label = "Průtok [m³/s]";
    color = "#10b981";
    bgColor = "rgba(16, 185, 129, 0.1)";
  }

  modalChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: values,
          borderColor: color,
          backgroundColor: bgColor,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#cbd5e1", font: { size: 14 } },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: color,
          borderWidth: 2,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            maxRotation: 45,
            minRotation: 45,
            font: { size: 12 },
          },
          grid: { color: "#334155" },
        },
        y: {
          ticks: {
            color: "#94a3b8",
            font: { size: 12 },
          },
          grid: { color: "#334155" },
        },
      },
    },
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  updateData();
  setInterval(updateData, REFRESH_INTERVAL);

  // Add click listener to temperature card
  const temperatureCard = document.querySelector(".temperature-card");
  if (temperatureCard) {
    temperatureCard.addEventListener("click", () => {
      openModal("temperature");
    });
  }

  // Add click listener to water level card
  const levelCard = document.querySelector(".level-card");
  if (levelCard) {
    levelCard.addEventListener("click", () => {
      openModal("level");
    });
  }

  // Add click listener to flow card
  const flowCard = document.querySelector(".flow-card");
  if (flowCard) {
    flowCard.addEventListener("click", () => {
      openModal("flow");
    });
  }

  // Time range selector handlers
  const rangeButtons = document.querySelectorAll(".range-btn");
  rangeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      // Remove active class from all buttons
      rangeButtons.forEach((b) => b.classList.remove("active"));

      // Add active class to clicked button
      btn.classList.add("active");

      // Get the range value
      const range = btn.getAttribute("data-range");
      chartTimeRange = range === "all" ? "all" : parseInt(range);

      // Fetch new data with appropriate limit
      const data = await fetchData();
      if (data) {
        currentData = data;
        updateAllCharts();
      }
    });
  });

  // Modal close handlers
  const modal = document.getElementById("chartModal");
  const closeBtn = document.querySelector(".modal-close");

  closeBtn.addEventListener("click", closeModal);

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // ESC key to close modal
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });
});
