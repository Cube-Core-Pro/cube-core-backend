import json
import numpy as np
from sklearn.ensemble import IsolationForest

def detect_login_anomaly(input_data):
  attempts = input_data['attempts']
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Isolation Forest for anomaly
  data = np.array([attempts]).reshape(-1, 1)
  model = IsolationForest(contamination=0.1)
  anomalies = model.fit_predict(data)

  message = 'Login anomaly detected' if language == 'en' else 'Anomalía en login detectada' if language == 'es' else 'Anomalia em login detectada' if language == 'pt' else 'Anomalie de connexion détectée' if language == 'fr' else 'Login-Anomalie erkannt' if language == 'de' else 'Login anomaly detected'

  return {'score': anomalies[0], 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_login_anomaly(input_data)))