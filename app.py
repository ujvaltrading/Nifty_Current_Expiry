from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import time

app = Flask(__name__)
CORS(app)

# ✅ यह चेक करेगा कि सिंबल इंडेक्स है या स्टॉक
def is_index(symbol):
    indices = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'NIFTYNXT50']
    return symbol in indices

@app.route('/option-chain', methods=['GET'])
def option_chain():
    symbol = request.args.get('symbol', 'NIFTY').upper()
    
    if is_index(symbol):
        url = f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol}"
    else:
        url = f"https://www.nseindia.com/api/option-chain-equities?symbol={symbol}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.nseindia.com/",
        "Origin": "https://www.nseindia.com"
    }

    max_retries = 5  # ✅ यहां परिभाषित करें
    retry_delay = 3  # ✅ ट्राई ब्लॉक से पहले

    try:
        for attempt in range(max_retries):
            try:
                session = requests.Session()
                session.get("https://www.nseindia.com", headers=headers, timeout=15)
                res = session.get(url, headers=headers, timeout=25)
                res.raise_for_status()
                data = res.json()
                break
            except requests.exceptions.RequestException as e:
                if attempt == max_retries - 1:
                    return jsonify({"error": f"NSE API Error: {str(e)}"}), 503
                time.sleep(retry_delay)
        
        # ...rest processing code

    except Exception as e:
        return jsonify({"error": f"Server Error: {str(e)}"}), 500
        # ✅ डेटा प्रोसेसिंग (आपका पुराना लॉजिक)
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
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
