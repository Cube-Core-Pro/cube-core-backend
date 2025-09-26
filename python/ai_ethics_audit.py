import sys
import json
# Simulate bias audit (real impl would load model/data)
model_id = sys.argv[1]
audit_type = sys.argv[2]

# Dummy logic
if audit_type == 'bias':
    results = {
        'score': 0.85,
        'overallScore': 85.0,
        'biases': [
            {'type': 'gender', 'score': 0.2, 'desc': 'Low gender bias'},
            {'type': 'racial', 'score': 0.1, 'desc': 'Minimal racial bias'}
        ]
    }
else:
    results = {'score': 0.9, 'details': 'Fairness passed'}

print(json.dumps(results))