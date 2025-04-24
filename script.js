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
        loadLiveData(item.symbol); // ✅ LIVE NSE DATA
      };
      suggestions.appendChild(li);
    });
  });

  async function loadLiveData(symbol) {
    try {
      const res = await fetch(`https://nifty50-oi-calculator.onrender.com/option-chain?symbol=${symbol}`);
      const result = await res.json();

      const cmp = result.underlyingValue || 0;
      const optionData = result.optionData || [];

      document.getElementById("cmpValue").textContent = cmp.toFixed(2);
      document.getElementById("cmpChange").textContent = ""; // आप चाहें तो change percentage भी ला सकते हैं

      const table = document.getElementById("optionTable");
      table.innerHTML = "";

      let atmIndex = -1;
      let closestDiff = Infinity;

      let bestRow = null;
      let highestOI = -Infinity;
      let lowestOI = Infinity;

      optionData.forEach((row, idx) => {
        const diff = Math.abs(row.strikePrice - cmp);
        if (diff < closestDiff) {
          closestDiff = diff;
          atmIndex = idx;
        }

        if (row.call.oiChange > highestOI && row.put.oiChange < lowestOI) {
          bestRow = row;
          highestOI = row.call.oiChange;
          lowestOI = row.put.oiChange;
        }
      });

      optionData.forEach((row, idx) => {
        const tr = document.createElement("tr");
        if (idx === atmIndex) tr.classList.add("highlight");
        tr.innerHTML = `
          <td>${row.call.oiChange}</td><td>${row.call.volume}</td><td>${row.call.ltp}</td>
          <td>${row.strikePrice}</td><td>${row.put.ltp}</td><td>${row.put.volume}</td><td>${row.put.oiChange}</td>
        `;
        table.appendChild(tr);
      });

      if (bestRow) {
        document.getElementById("autoStrike").value = bestRow.strikePrice;
        const diff = Math.abs(bestRow.call.oiChange - bestRow.put.oiChange);
        const perc = (diff / Math.max(bestRow.call.oiChange, bestRow.put.oiChange)) * 100;

        if (bestRow.call.oiChange < bestRow.put.oiChange) {
          document.getElementById("buyTrigger").value = (bestRow.call.ltp - (bestRow.call.ltp * perc / 100)).toFixed(2);
          document.getElementById("sellTrigger").value = "No Trade found";
        } else {
          document.getElementById("sellTrigger").value = (bestRow.put.ltp - (bestRow.put.ltp * perc / 100)).toFixed(2);
          document.getElementById("buyTrigger").value = "No Trade found";
        }
      } else {
        console.warn("No bestRow found for trigger calculations.");
        document.getElementById("buyTrigger").value = "N/A";
        document.getElementById("sellTrigger").value = "N/A";
      }

    } catch (error) {
      console.error("API Error:", error);
      alert("Data fetch karne mein dikkat aa gayi. Kripya thodi der baad try karein.");
    }
  }

  window.openTV = () => {
    const symbol = symbolName.textContent.trim().toUpperCase();
    window.open(`https://in.tradingview.com/symbols/NSE-${symbol}/`, "_blank");
  };

  loadLiveData("NIFTY"); // ✅ default load
});
