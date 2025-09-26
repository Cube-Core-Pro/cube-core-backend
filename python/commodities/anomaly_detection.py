# python/commodities/anomaly_detection.py
import sys
import json
from scipy import stats

def detect_anomaly(data, threshold=3):
    mean = sum(data) / len(data)
    std_dev = (sum((x - mean) ** 2 for x in data) / len(data)) ** 0.5
    anomalies = [x for x in data if abs((x - mean) / std_dev) > threshold]
    return {"anomalies": anomalies, "mean": mean, "std_dev": std_dev}

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    data = input_data['data']
    threshold = input_data.get('threshold', 3)
    result = detect_anomaly(data, threshold)
    print(json.dumps(result))