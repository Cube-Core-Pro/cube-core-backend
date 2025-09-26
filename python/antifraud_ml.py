import json
import numpy as np
from sklearn.ensemble import IsolationForest

def detect_fraud_ml(input_data):
  data = np.array([input_data['transactionData']['amount']]).reshape(-1, 1)
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Isolation Forest with jurisdiction adjustment
  contamination = 0.1 if jurisdiction in ['MX', 'BR', 'AR'] else 0.05
  model = IsolationForest(contamination=contamination)
  anomalies = model.fit_predict(data)

  message = 'ML fraud detected' if language == 'en' else 'Fraude ML detectado' if language == 'es' else 'Fraude ML detectado' if language == 'pt' else 'Fraude ML détecté' if language == 'fr' else 'ML-Betrug erkannt' if language == 'de' else 'ML fraud detected'

  return {'anomalies': anomalies.tolist(), 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_fraud_ml(input_data)))