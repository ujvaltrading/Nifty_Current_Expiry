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
    
    # ✅ सही API चुनें (इंडेक्स या स्टॉक के लिए)
    if is_index(symbol):
        url = f"https://www.nseindia.com/api/option-chain-indices?symbol={symbol}"
    else:
        url = f"https://www.nseindia.com/api/option-chain-equities?symbol={symbol}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive"
    }

    try:
        # ✅ 3 बार रिट्राई करने का लॉजिक
        max_retries = 3
        for _ in range(max_retries):
            try:
                session = requests.Session()
                # ✅ पहले NSE की मुख्य वेबसाइट विजिट करें (Cookies के लिए)
                session.get("https://www.nseindia.com", headers=headers, timeout=15)
                # ✅ API कॉल करें
                res = session.get(url, headers=headers, timeout=20)
                res.raise_for_status()  # HTTP एरर चेक करे
                data = res.json()
                break
            except requests.exceptions.RequestException:
                time.sleep(2)  # 2 सेकंड इंतजार करें
        else:
            return jsonify({"error": "NSE API unreachable after 3 attempts"}), 503

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
