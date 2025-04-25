document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");
  const symbolName = document.getElementById("stockName");
  let currentSymbol = "NIFTY"; // ग्लोबल वेरिएबल

  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;
    const matched = symbolMap.filter(item => item.name.toLowerCase().includes(val));
    matched.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.onclick = () => {
        currentSymbol = item.symbol; // सिम्बल अपडेट
        input.value = item.name;
        symbolName.textContent = item.symbol;
        suggestions.innerHTML = "";
        loadLiveData(currentSymbol);
      };
      suggestions.appendChild(li);
    });
  });

  // एक्सपायरी चेंज इवेंट
  document.getElementById("expirySelect").addEventListener("change", function() {
    const selectedExpiry = this.value;
    if (selectedExpiry === "Select Expiry") return;
    loadLiveData(currentSymbol, selectedExpiry);
  });

  async function loadLiveData(symbol, expiry = "") {
    try {
      let url = `https://nifty-oi-calc.onrender.com/option-chain?symbol=${symbol}`;
      if (expiry) url += `&expiry=${encodeURIComponent(expiry)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const result = await res.json();
      
      // CMP अपडेट
      const cmp = result.underlyingValue || 0;
      document.getElementById("cmpValue").textContent = cmp.toFixed(2);
      document.getElementById("cmpChange").textContent = ""; 

      // एक्सपायरी डेट ड्रॉपडाउन
      const expirySelect = document.getElementById("expirySelect");
      expirySelect.innerHTML = '<option>Select Expiry</option>';
      result.expiryDates.forEach(date => {
        const option = document.createElement("option");
        option.textContent = date;
        option.value = date;
        expirySelect.appendChild(option);
      });

      // ATM ढूंढें
      let atmIndex = -1;
      let closestDiff = Infinity;
      result.optionData.forEach((row, idx) => {
        const diff = Math.abs(row.strikePrice - cmp);
        if (diff < closestDiff) {
          closestDiff = diff;
          atmIndex = idx;
        }
      });

      // सिर्फ 11 रोज़ दिखाएं (ATM ±5)
      const start = Math.max(0, atmIndex - 5);
      const end = Math.min(result.optionData.length, atmIndex + 6);
      const visibleData = result.optionData.slice(start, end);

      // टेबल अपडेट
      const table = document.getElementById("optionTable");
      table.innerHTML = "";
      visibleData.forEach((row) => {
        const tr = document.createElement("tr");
        if (row.strikePrice === result.optionData[atmIndex]?.strikePrice) {
          tr.classList.add("highlight");
        }
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

      // ट्रिगर प्राइस लॉजिक
      let bestRow = null;
      let highestOI = -Infinity;
      let lowestOI = Infinity;
      result.optionData.forEach(row => {
        if (row.call?.oiChange > highestOI && row.put?.oiChange < lowestOI) {
          bestRow = row;
          highestOI = row.call.oiChange;
          lowestOI = row.put.oiChange;
        }
      });

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

  loadLiveData(currentSymbol); // डिफ़ॉल्ट लोड
});
