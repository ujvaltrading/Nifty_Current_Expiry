document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");
  const suggestions = document.getElementById("suggestions");
  const symbolName = document.getElementById("stockName");
  let currentSymbol = "NIFTY";
  let currentExpiry = "";

  // सर्च फ़ंक्शन
  input.addEventListener("input", () => {
    const val = input.value.toLowerCase();
    suggestions.innerHTML = "";
    if (val.length < 2) return;
    const matched = symbolMap.filter(item => item.name.toLowerCase().includes(val));
    matched.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.onclick = () => {
        currentSymbol = item.symbol;
        input.value = item.name;
        symbolName.textContent = item.symbol;
        suggestions.innerHTML = "";
        loadLiveData(currentSymbol, currentExpiry);
      };
      suggestions.appendChild(li);
    });
  });

  // एक्सपायरी चेंज इवेंट
  document.getElementById("expirySelect").addEventListener("change", function() {
    currentExpiry = this.value;
    loadLiveData(currentSymbol, currentExpiry);
  });

  // डेटा लोड करें
  async function loadLiveData(symbol, expiry = "") {
    try {
      let url = `https://nifty-oi-calc.onrender.com/option-chain?symbol=${symbol}`;
      if (expiry) url += `&expiry=${encodeURIComponent(expiry)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Data not found for ${symbol}`);
      
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // CMP अपडेट
      document.getElementById("cmpValue").textContent = result.underlyingValue?.toFixed(2) || "N/A";

      // एक्सपायरी ड्रॉपडाउन
      const expirySelect = document.getElementById("expirySelect");
      expirySelect.innerHTML = result.expiryDates.map(date => 
        `<option value="${date}" ${date === expiry ? "selected" : ""}>${date}</option>`
      ).join("");

      // ATM ढूंढें
      let atmIndex = -1;
      let closestDiff = Infinity;
      result.optionData.forEach((row, idx) => {
        const diff = Math.abs(row.strikePrice - result.underlyingValue);
        if (diff < closestDiff) {
          closestDiff = diff;
          atmIndex = idx;
        }
      });

      // 11 रोज़ दिखाएं (ATM ±5)
      const start = Math.max(0, atmIndex - 5);
      const end = Math.min(result.optionData.length, atmIndex + 6);
      const visibleData = result.optionData.slice(start, end);

      // टेबल अपडेट
      const table = document.getElementById("optionTable");
      table.innerHTML = visibleData.map(row => `
        <tr ${row.strikePrice === result.optionData[atmIndex]?.strikePrice ? 'class="highlight"' : ''}>
          <td>${row.call?.oiChange || 0}</td>
          <td>${row.call?.volume || 0}</td>
          <td>${row.call?.ltp || 0}</td>
          <td>${row.strikePrice}</td>
          <td>${row.put?.ltp || 0}</td>
          <td>${row.put?.volume || 0}</td>
          <td>${row.put?.oiChange || 0}</td>
        </tr>
      `).join("");

      // PTP लॉजिक (मूल वर्ज़न)
      let bestRow = null;
      let highestCallOI = -Infinity;
      let lowestPutOI = Infinity;
      result.optionData.forEach(row => {
        if (row.call?.oiChange > highestCallOI && row.put?.oiChange < lowestPutOI) {
          bestRow = row;
          highestCallOI = row.call.oiChange;
          lowestPutOI = row.put.oiChange;
        }
      });

      if (bestRow) {
        document.getElementById("autoStrike").value = bestRow.strikePrice;
        const callOI = bestRow.call?.oiChange || 0;
        const putOI = bestRow.put?.oiChange || 0;
        const diff = Math.abs(callOI - putOI);
        const perc = diff / Math.max(callOI, putOI) * 100 || 0;

        // मूल PTP कैलकुलेशन
        if (callOI < putOI) {
          document.getElementById("buyTrigger").value = (bestRow.call?.ltp - (bestRow.call?.ltp * perc / 100)).toFixed(2) || "N/A";
          document.getElementById("sellTrigger").value = "No Trade found";
        } else {
          document.getElementById("sellTrigger").value = (bestRow.put?.ltp - (bestRow.put?.ltp * perc / 100)).toFixed(2) || "N/A";
          document.getElementById("buyTrigger").value = "No Trade found";
        }
      }

    } catch (error) {
      document.getElementById("optionTable").innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
    }
  }

  // डिफ़ॉल्ट लोड
  loadLiveData(currentSymbol);
});
