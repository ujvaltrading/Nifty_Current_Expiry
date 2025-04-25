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
      
      // CMP अपडेट
      document.getElementById("cmpValue").textContent = result.underlyingValue?.toFixed(2) || "N/A";
      
      // एक्सपायरी ड्रॉपडाउन
      const expirySelect = document.getElementById("expirySelect");
      expirySelect.innerHTML = result.expiryDates.map(date => 
        `<option value="${date}" ${date === expiry ? "selected" : ""}>${date}</option>`
      ).join("");

      // ATM ढूंढें
      let atmIndex = result.optionData.findIndex(row => 
        Math.abs(row.strikePrice - result.underlyingValue) === 
        Math.min(...result.optionData.map(row => Math.abs(row.strikePrice - result.underlyingValue)))
      );

      // 11 रोज़ दिखाएं (ATM ±5)
      const visibleData = result.optionData.slice(Math.max(0, atmIndex -5), atmIndex +6);

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

      // ट्रिगर प्राइस कैलकुलेशन
      const bestRow = result.optionData.reduce((acc, row) => 
        (row.call?.oiChange > acc.callOI && row.put?.oiChange < acc.putOI) ? 
        { callOI: row.call.oiChange, putOI: row.put.oiChange, row } : acc, 
        { callOI: -Infinity, putOI: Infinity }
      ).row;

      if (bestRow) {
        document.getElementById("autoStrike").value = bestRow.strikePrice;
        const callPerc = bestRow.call?.oiChange < bestRow.put?.oiChange ? 
          (bestRow.call?.ltp * 0.8).toFixed(2) : "No Trade found";
        const putPerc = bestRow.put?.oiChange < bestRow.call?.oiChange ? 
          (bestRow.put?.ltp * 0.8).toFixed(2) : "No Trade found";
        document.getElementById("buyTrigger").value = callPerc;
        document.getElementById("sellTrigger").value = putPerc;
      }

    } catch (error) {
      document.getElementById("optionTable").innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
    }
  }

  // डिफ़ॉल्ट लोड
  loadLiveData(currentSymbol);
});
