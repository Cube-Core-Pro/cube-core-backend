# python/commodities/price_prediction.py
import sys
import json
from sklearn.linear_model import LinearRegression
import numpy as np

def predict_price(historical_data, forecast_steps):
    X = np.array(range(len(historical_data))).reshape(-1, 1)
    y = np.array(historical_data)
    model = LinearRegression().fit(X, y)
    future_X = np.array(range(len(historical_data), len(historical_data) + forecast_steps)).reshape(-1, 1)
    predictions = model.predict(future_X)
    return predictions.tolist()

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    historical_data = input_data['historicalData']
    forecast_steps = input_data['forecastSteps']
    result = predict_price(historical_data, forecast_steps)
    print(json.dumps(result))