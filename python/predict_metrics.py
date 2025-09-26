import json
import numpy as np
from statsmodels.tsa.arima.model import ARIMA

def predict_metrics(input_data):
  historical = np.array([item['value'] for item in input_data['historicalData']])
  steps = input_data['forecastSteps']
  jurisdiction = input_data.get('jurisdiction', 'US')
  language = input_data.get('language', 'en')

  # Creativo: Adjust order based on jurisdiction (higher order for EU stability)
  order = (2,1,2) if jurisdiction in ['UK', 'DE', 'FR'] else (1,1,1)

  model = ARIMA(historical, order=order)
  model_fit = model.fit()
  forecast = model_fit.forecast(steps=steps).tolist()

  message = 'Metrics predicted' if language == 'en' else 'Métricas predichas' if language == 'es' else 'Métricas previstas' if language == 'pt' else 'Métriques prévues' if language == 'fr' else 'Metriken prognostiziert' if language == 'de' else 'Metrics predicted'

  return {'forecast': forecast, 'message': message}

if __name__ == "__main__":
  import sys
  input_data = json.loads(sys.argv[1])
  print(json.dumps(predict_metrics(input_data)))