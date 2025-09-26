import sys
import json
import numpy as np

def simulate_scenario(data):
    base_value = data['base_value']
    horizon = data['horizon']
    simulations = 1000
    results = np.random.normal(base_value, base_value * 0.1, (simulations, horizon))
    mean_forecast = np.mean(results, axis=0).tolist()
    return {'forecast': mean_forecast, 'confidence': [base_value * 0.9, base_value * 1.1]}

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    result = simulate_scenario(input_data)
    print(json.dumps(result))