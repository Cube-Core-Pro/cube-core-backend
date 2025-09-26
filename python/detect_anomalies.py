import sys
import json
import numpy as np
from scipy import stats
import logging

logging.basicConfig(level=logging.WARNING)

def detect_anomalies(input_data):
  try:
    data = np.array(input_data['data'], dtype=float).flatten()  # Flatten to 1D, handle multi-dim
    if len(data) < 3:  # Min for meaningful stats
      return {'anomalies': [], 'count': 0, 'message': 'Insufficient data for anomaly detection', 'error': True}

    threshold = input_data.get('threshold', 3.5)  # Default to 3.5 for modified Z
    jurisdiction = input_data.get('jurisdiction', 'US')
    language = input_data.get('language', 'en')

    # Expanded jurisdiction adjustments (higher for volatile markets)
    adjust_dict = {'AR': 4.0, 'BR': 3.5, 'LATAM': 3.8, 'ASIA': 3.2, 'EU': 3.0, 'US': threshold}
    adjust = adjust_dict.get(jurisdiction, threshold)

    # Robust Modified Z-score (using MAD for better outlier handling)
    median = np.median(data)
    mad = np.median(np.abs(data - median))
    if mad == 0: mad = 1e-8  # Avoid division by zero
    modified_z = 0.6745 * (data - median) / mad
    anomalies = data[np.abs(modified_z) > adjust].tolist()

    # Multilengue messages via dict (scalable)
    messages = {
      'en': 'Anomalies detected',
      'es': 'Anomalías detectadas',
      'pt': 'Anomalias detectadas',
      'fr': 'Anomalies détectées',
      'de': 'Anomalien erkannt',
    }
    message = messages.get(language, messages['en'])  # Fallback EN

    # Log if anomalies
    if len(anomalies) > 0:
      logging.warning(f"{message}: {len(anomalies)} in {jurisdiction}")

    return {'anomalies': anomalies, 'count': len(anomalies), 'message': f"{message}: {len(anomalies)}", 'error': False}
  
  except Exception as e:
    logging.error(f"Error in anomaly detection: {str(e)}")
    return {'anomalies': [], 'count': 0, 'message': 'Error detecting anomalies', 'error': True, 'details': str(e)}

if __name__ == "__main__":
  input_data = json.loads(sys.argv[1])
  print(json.dumps(detect_anomalies(input_data)))