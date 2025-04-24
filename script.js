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
      const res = await fetch("https://7536f3ad-b6e9-4e93-bb26-e824e95a3ed7-00-28ope58z5rl6f.pike.replit.dev/api/data");

      const result = await res.json();

      const cmp = result.underlyingValue || result.strikePrice || 0;
      const optionData = result.optionData || [];

      document.getElementById("cmpValue").textContent = cmp ? cmp.toFixed(2) : "N/A";
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

        // ✅ Extra live info display
        document.getElementById("strike").textContent = "Strike Price: " + bestRow.strikePrice;
        document.getElementById("callVol").textContent = "Call Volume: " + bestRow.call.volume;
        document.getElementById("putOi").textContent = "Put OI Change: " + bestRow.put.oiChange;
      }

    } catch (error) {
      console.error("API Error:", error);
    }
  }

  window.openTV = () => {
    const symbol = symbolName.textContent.trim().toUpperCase();
    window.open(`https://in.tradingview.com/symbols/NSE-${symbol}/`, "_blank");
  };

  loadLiveData("NIFTY"); // ✅ default load
});
