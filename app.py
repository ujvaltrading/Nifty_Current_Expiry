from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/option-chain', methods=['GET'])
def option_chain():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    url = f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol}"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
    }

    try:
        session = requests.Session()
        session.get("https://www.nseindia.com", headers=headers)
        res = session.get(url, headers=headers)
        data = res.json()

        response = {
            "underlyingValue": data["records"]["underlyingValue"],
            "expiryDates": data["records"]["expiryDates"],
            "optionData": []
        }

        for item in data["records"]["data"]:
            ce = item.get("CE", {})
            pe = item.get("PE", {})
            response["optionData"].append({
                "strikePrice": item.get("strikePrice"),
                "call": {
                    "ltp": ce.get("lastPrice", 0),
                    "volume": ce.get("totalTradedVolume", 0),
                    "oiChange": ce.get("changeinOpenInterest", 0)
                },
                "put": {
                    "ltp": pe.get("lastPrice", 0),
                    "volume": pe.get("totalTradedVolume", 0),
                    "oiChange": pe.get("changeinOpenInterest", 0)
                }
            })

        return jsonify(response)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run()
