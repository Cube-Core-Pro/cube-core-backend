import json
import numpy as np

def detect_login_anomaly(input_data):
  attempts = input_data['attempts']
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Simple anomaly if attempts > 3, adjust by jurisdiction
  threshold = 3 if jurisdiction == 'US' else 5 if jurisdiction == 'DE' else 4
  score = attempts / threshold

  message = 'Anomaly detected' if language == 'en' else 'Anomalía detectada' if language == 'es' else 'Anomalia detectada' if language == 'pt' else 'Anomalie détectée' if language == 'fr' else 'Anomalie erkannt' if language == 'de' else 'Anomaly detected'

  return {'score': score, 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_login_anomaly(input_data)))