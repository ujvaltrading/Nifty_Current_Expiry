document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");
  const symbolName = document.getElementById("stockName");

  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;
    const matched = symbolMap.filter(item => item.name.toLowerCase().includes(val));
    matched.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.onclick = () => {
        input.value = item.name;
        symbolName.textContent = item.symbol;
        suggestions.innerHTML = "";
        loadLiveData(item.symbol);
      };
      suggestions.appendChild(li);
    });
  });

  async function loadLiveData(symbol) {
    try {
      const res = await fetch(`https://nifty-oi-calc.onrender.com/option-chain?symbol=${symbol}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const result = await res.json();
      
      // CMP प्रोसेसिंग
      const cmp = result.underlyingValue || 0;
      document.getElementById("cmpValue").textContent = cmp.toFixed(2);
      document.getElementById("cmpChange").textContent = ""; 

      // टेबल डेटा अपडेट
      const table = document.getElementById("optionTable");
      table.innerHTML = "";

      let atmIndex = -1;
      let closestDiff = Infinity;
      let bestRow = null;
      let highestOI = -Infinity;
      let lowestOI = Infinity;

      // ATM और बेस्ट रो की गणना
      result.optionData.forEach((row, idx) => {
        const diff = Math.abs(row.strikePrice - cmp);
        if (diff < closestDiff) {
          closestDiff = diff;
          atmIndex = idx;
        }

        if (row.call?.oiChange > highestOI && row.put?.oiChange < lowestOI) {
          bestRow = row;
          highestOI = row.call.oiChange;
          lowestOI = row.put.oiChange;
        }
      });

      // टेबल भरें
      result.optionData.forEach((row, idx) => {
        const tr = document.createElement("tr");
        if (idx === atmIndex) tr.classList.add("highlight");
        tr.innerHTML = `
          <td>${row.call?.oiChange || 0}</td>
          <td>${row.call?.volume || 0}</td>
          <td>${row.call?.ltp || 0}</td>
          <td>${row.strikePrice}</td>
          <td>${row.put?.ltp || 0}</td>
          <td>${row.put?.volume || 0}</td>
          <td>${row.put?.oiChange || 0}</td>
        `;
        table.appendChild(tr);
      });

      // ट्रिगर प्राइस अपडेट
      if (bestRow) {
        document.getElementById("autoStrike").value = bestRow.strikePrice;
        const callOI = bestRow.call?.oiChange || 0;
        const putOI = bestRow.put?.oiChange || 0;
        const diff = Math.abs(callOI - putOI);
        const perc = diff / Math.max(callOI, putOI) * 100 || 0;

        if (callOI < putOI) {
          document.getElementById("buyTrigger").value = (bestRow.call?.ltp - (bestRow.call?.ltp * perc / 100)).toFixed(2) || "N/A";
          document.getElementById("sellTrigger").value = "No Trade found";
        } else {
          document.getElementById("sellTrigger").value = (bestRow.put?.ltp - (bestRow.put?.ltp * perc / 100)).toFixed(2) || "N/A";
          document.getElementById("buyTrigger").value = "No Trade found";
        }
      }

    } catch (error) {
      console.error("API Error:", error);
      document.getElementById("cmpValue").textContent = "Error";
      document.getElementById("optionTable").innerHTML = "<tr><td colspan='7'>Data not available</td></tr>";
    }
  }

  window.openTV = () => {
    const symbol = symbolName.textContent.trim().toUpperCase();
    window.open(`https://in.tradingview.com/symbols/NSE-${symbol}/`, "_blank");
  };

  loadLiveData("NIFTY"); // डिफ़ॉल्ट लोड
});
