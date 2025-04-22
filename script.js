// Placeholder for live NSE scraping and trigger logic (to be enhanced)
document.addEventListener("DOMContentLoaded", () => {
  const buyTrigger = document.getElementById("buyTrigger");
  const sellTrigger = document.getElementById("sellTrigger");
  const optionTable = document.getElementById("optionTable");
  const cmpValue = document.getElementById("cmpValue");
  const cmpChange = document.getElementById("cmpChange");
  const autoStrike = document.getElementById("autoStrike");

  const sampleData = [
    { callOI: 10000, callVol: 2000, callLTP: 150, strike: 19800, putLTP: 12.5, putVol: 1800, putOI: 800 },
    { callOI: 20000, callVol: 3000, callLTP: 120, strike: 19850, putLTP: 30.5, putVol: 1500, putOI: 600 },
    { callOI: 18000, callVol: 2500, callLTP: 100, strike: 19900, putLTP: 45.0, putVol: 900, putOI: 300 },
    { callOI: 9000, callVol: 1900, callLTP: 200, strike: 19750, putLTP: 9.0, putVol: 1400, putOI: 500 }
  ];

  const cmp = 19860.25;
  cmpValue.textContent = cmp.toFixed(2);
  cmpChange.textContent = "+115.75 (+0.59%)";

  let closestDiff = Infinity;
  let atmIndex = -1;

  sampleData.forEach((row, idx) => {
    const diff = Math.abs(row.strike - cmp);
    if (diff < closestDiff) {
      closestDiff = diff;
      atmIndex = idx;
    }
  });

  let bestRow = null;
  let highestOI = -Infinity;
  let lowestOI = Infinity;

  sampleData.forEach(row => {
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
      <td>${row.strike}</td>
      <td>${row.putLTP}</td><td>${row.putVol}</td><td>${row.putOI}</td>
    `;
    optionTable.appendChild(tr);
  });

  autoStrike.value = bestRow.strike;

  const oiDiff = Math.abs(bestRow.callOI - bestRow.putOI);
  const oiPerc = (oiDiff / Math.max(bestRow.callOI, bestRow.putOI)) * 100;
  if (bestRow.callOI < bestRow.putOI) {
    buyTrigger.value = (bestRow.callLTP - (bestRow.callLTP * oiPerc / 100)).toFixed(2);
    sellTrigger.value = "No Trade found";
  } else {
    sellTrigger.value = (bestRow.putLTP - (bestRow.putLTP * oiPerc / 100)).toFixed(2);
    buyTrigger.value = "No Trade found";
  }
});
