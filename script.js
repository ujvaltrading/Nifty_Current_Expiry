// Assuming input box has id="searchInput" and suggestions container has id="suggestions"
const searchInput = document.getElementById("searchInput");
const suggestionsContainer = document.getElementById("suggestions");

// Load symbolMap
let symbolMap = {};
fetch('symbolMap.js')
  .then(res => res.text())
  .then(js => {
    eval(js); // populate symbolMap
  });

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  suggestionsContainer.innerHTML = "";

  if (!query) return;

  const filtered = Object.keys(symbolMap).filter(key =>
    key.toLowerCase().includes(query)
  );

  filtered.forEach(symbol => {
    const div = document.createElement("div");
    div.textContent = symbol;
    div.onclick = () => {
      searchInput.value = symbol;
      suggestionsContainer.innerHTML = "";
      // Trigger your stock data logic here
      const actualSymbol = symbolMap[symbol];
      if (actualSymbol) {
        loadStockData(actualSymbol); // <- your existing function
      }
    };
    suggestionsContainer.appendChild(div);
  });
});

// Hide suggestions on click outside
document.addEventListener("click", (e) => {
  if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
    suggestionsContainer.innerHTML = "";
  }
});
  function openTV() {
    const symbol = document.getElementById("stockName").textContent.trim().toUpperCase();
    window.open(`https://in.tradingview.com/symbols/NSE-${symbol}/`, "_blank");
  }

  function loadData() {
    const sampleData = [
      { callOI: 10000, callVol: 2000, callLTP: 150, strike: 19800, putLTP: 12.5, putVol: 1800, putOI: 800 },
      { callOI: 20000, callVol: 3000, callLTP: 120, strike: 19850, putLTP: 30.5, putVol: 1500, putOI: 600 },
      { callOI: 18000, callVol: 2500, callLTP: 100, strike: 19900, putLTP: 45.0, putVol: 900, putOI: 300 },
      { callOI: 9000, callVol: 1900, callLTP: 200, strike: 19750, putLTP: 9.0, putVol: 1400, putOI: 500 }
    ];
    const cmp = 19860.25;
    document.getElementById("cmpValue").textContent = cmp.toFixed(2);
    document.getElementById("cmpChange").textContent = "+115.75 (+0.59%)";

    let closestDiff = Infinity;
    let atmIndex = -1;
    const table = document.getElementById("optionTable");
    table.innerHTML = "";

    let bestRow = null;
    let highestOI = -Infinity;
    let lowestOI = Infinity;

    sampleData.forEach((row, idx) => {
      const diff = Math.abs(row.strike - cmp);
      if (diff < closestDiff) {
        closestDiff = diff;
        atmIndex = idx;
      }

      if (row.callOI > highestOI && row.putOI < lowestOI) {
        bestRow = row;
        highestOI = row.callOI;
        lowestOI = row.putOI;
      }
    });

    sampleData.forEach((row, idx) => {
      const tr = document.createElement("tr");
      if (idx === atmIndex) tr.classList.add("highlight");
      tr.innerHTML = `
        <td>${row.callOI}</td><td>${row.callVol}</td><td>${row.callLTP}</td>
        <td>${row.strike}</td><td>${row.putLTP}</td><td>${row.putVol}</td><td>${row.putOI}</td>
      `;
      table.appendChild(tr);
    });

    document.getElementById("autoStrike").value = bestRow.strike;
    const diff = Math.abs(bestRow.callOI - bestRow.putOI);
    const perc = (diff / Math.max(bestRow.callOI, bestRow.putOI)) * 100;

    if (bestRow.callOI < bestRow.putOI) {
      document.getElementById("buyTrigger").value = (bestRow.callLTP - (bestRow.callLTP * perc / 100)).toFixed(2);
      document.getElementById("sellTrigger").value = "No Trade found";
    } else {
      document.getElementById("sellTrigger").value = (bestRow.putLTP - (bestRow.putLTP * perc / 100)).toFixed(2);
      document.getElementById("buyTrigger").value = "No Trade found";
    }
  }

  loadData();
});
