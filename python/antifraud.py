import json
import numpy as np
from sklearn.ensemble import IsolationForest

def detect_fraud(input_data):
  data = np.array(input_data['transactionData']['amount']).reshape(-1, 1)
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Isolation Forest for anomaly, adjust contamination by jurisdiction (higher in LATAM)
  contamination = 0.1 if jurisdiction in ['MX', 'BR', 'AR'] else 0.05
  model = IsolationForest(contamination=contamination)
  anomalies = model.fit_predict(data)

  message = 'Fraud detected' if language == 'en' else 'Fraude detectado' if language == 'es' else 'Fraude detectado' if language == 'pt' else 'Fraude détecté' if language == 'fr' else 'Betrug erkannt' if language == 'de' else 'Fraud detected'

  return {'anomalies': anomalies.tolist(), 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_fraud(input_data)))