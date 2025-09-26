import json
import math
import numpy as np

# Tax rates 2025 por jurisdicción
tax_rates = {
  'US': 0.22, 'CA': 0.15, 'MX': 0.30, 'BR': 0.27, 'AR': 0.35, 'CO': 0.33, 'EC': 0.15, 'PA': 0.07, 'PR': 0.11, 'CL': 0.27,
  'PE': 0.30, 'BO': 0.13, 'PY': 0.10, 'UY': 0.25, 'UK': 0.20, 'FR': 0.20, 'ES': 0.21, 'DE': 0.19, 'CH': 0.08, 'PT': 0.23,
  'LT': 0.21, 'NL': 0.21, 'SE': 0.25, 'AT': 0.20, 'IT': 0.22, 'AU': 0.10, 'NZ': 0.15
}

def detect_fraud(amount, plan, jurisdiction='US'):
  typical_amounts = np.array([100, 500, 1000, 5000])
  std_dev = np.std(typical_amounts)
  anomaly = math.fabs(amount - np.mean(typical_amounts)) / std_dev

  plan_factor = 0.1 if plan == 'premium' else 0.5

  tax = tax_rates.get(jurisdiction, 0.1)
  adjusted_amount = amount * (1 + tax)

  score = 1 / (1 + math.exp(- (anomaly + plan_factor + tax - 2)))

  return {'score': score, 'adjusted_amount': adjusted_amount}

if __name__ == "__main__":
  import sys
  amount = float(sys.argv[1])
  plan = sys.argv[2]
  jurisdiction = sys.argv[3] if len(sys.argv) > 3 else 'US'
  print(json.dumps(detect_fraud(amount, plan, jurisdiction)))