from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/")
def home():
    return "<h2>✅ Welcome to NIFTY50 PTP Option Chain API</h2><p>Use endpoint like: /option-chain?symbol=RELIANCE</p>"

@app.route("/option-chain")
def option_chain():
    try:
        # 1. Get symbol from query string
        symbol = request.args.get("symbol")
        if not symbol:
            return jsonify({"error": "Symbol is required"}), 400

        # 2. Convert to Yahoo format
        yf_symbol = symbol.upper() + ".NS"

        # 3. Fetch data using yfinance
        ticker = yf.Ticker(yf_symbol)
        current_price = ticker.info.get("regularMarketPrice")

        if current_price is None:
            return jsonify({"error": "Could not fetch live data. Check symbol or try again."}), 404

        # 4. Apply your PTP logic
        strike_price = round(current_price / 100) * 100
        expected_price = round(current_price * 1.015, 2)
        trigger = "BUY" if expected_price > current_price else "SELL"

        # 5. Send JSON response
        result = {
            "symbol": symbol.upper(),
            "currentPrice": current_price,
            "strikePrice": strike_price,
            "expectedPrice": expected_price,
            "trigger": trigger
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Port 3000 for Replit/Render
    app.run(host="0.0.0.0", port=3000)
