import requests

# Test POST request
url = "http://localhost:8000/weights"
data = {"name": "John Doe", "date": "04-14-2026", "weight": 150.5}

try:
    response = requests.post(url, json=data)
    print("POST Status Code:", response.status_code)
    print("POST Response:", response.json())
except Exception as e:
    print("POST Error:", e)

# Test GET request
try:
    response = requests.get(url)
    print("GET Status Code:", response.status_code)
    print("GET Response:", response.json())
except Exception as e:
    print("GET Error:", e)