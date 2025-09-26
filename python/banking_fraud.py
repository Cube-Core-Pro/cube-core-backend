import json
import numpy as np

def detect_banking_fraud(input_data):
  amount = input_data['amount']
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Simple fraud if amount > 10000, adjust by jurisdiction
  threshold = 10000 if jurisdiction == 'US' else 5000 if jurisdiction == 'DE' else 8000
  score = amount / threshold

  message = 'Banking fraud detected' if language == 'en' else 'Fraude bancario detectado' if language == 'es' else 'Fraude bancário detectado' if language == 'pt' else 'Fraude bancaire détectée' if language == 'fr' else 'Bankbetrug erkannt' if language == 'de' else 'Banking fraud detected'

  return {'score': score, 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_banking_fraud(input_data)))