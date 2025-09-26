import json
import sys
import numpy as np
from scipy import stats

try:
    input_data = json.loads(sys.stdin.read())
    features = np.array(input_data['features'])  # Array de transacciones
    z = np.abs(stats.zscore(features))
    threshold = 3
    anomalies = np.where(z > threshold)[0].tolist()
    print(json.dumps({'anomalies': anomalies}))
except Exception as e:
    print(json.dumps({'error': str(e)}))