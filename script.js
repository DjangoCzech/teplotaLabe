// Configuration
const PROXY_URL = "https://api.allorigins.win/raw?url=";
const DATA_URL = "https://hydro.chmi.cz/hppsoldv/hpps_prfdata.php?seq=307338";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Chart instances
let temperatureChart = null;
let waterLevelChart = null;
let flowChart = null;

// Fetch and parse data from ČHMÚ
async function fetchData() {
  try {
    const response = await fetch(PROXY_URL + encodeURIComponent(DATA_URL));
    const html = await response.text();
    return parseData(html);
  } catch (error) {
    console.error("Error fetching data:", error);
    showError("Nepodařilo se načíst data. Zkuste to prosím později.");
    return null;
  }
}

// Parse HTML data
function parseData(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find the measured data table with class "tborder center_text"
  const tables = doc.querySelectorAll("div.tborder.center_text");
  let dataTable = null;

  // Get the first table with class "tborder center_text" (measured data)
  if (tables.length > 0) {
    dataTable = tables[0];
  }

  if (!dataTable) {
    console.error("Data table not found");
    return null;
  }

  const rows = dataTable.querySelectorAll("tr");
  const data = [];

  // Skip header row (first row)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll("td");

    if (cells.length >= 4) {
      const dateTime = cells[0].textContent.trim();
      const level = cells[1].textContent.trim();
      const flow = cells[2].textContent.trim();
      const temp = cells[3].textContent.trim();

      if (dateTime && dateTime !== "" && !dateTime.includes("Datum")) {
        data.push({
          dateTime: dateTime,
          level: level || "-",
          flow: flow || "-",
          temperature: temp || "-",
        });
      }
    }
  }

  return data;
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

  // Filter data with temperature values (last 48 hours)
  const tempData = data
    .filter((d) => d.temperature !== "-" && d.temperature !== "")
    .slice(0, 48)
    .reverse();

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

  // Get last 48 data points
  const levelData = data
    .filter((d) => d.level !== "-")
    .slice(0, 48)
    .reverse();

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

  // Get last 48 data points
  const flowData = data
    .filter((d) => d.flow !== "-")
    .slice(0, 48)
    .reverse();

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
