import sys
import json

def detect_anomaly(permissions):
    # Mock logic, use ML if installed
    is_suspicious = len(permissions) > 5  # Example
    return {"isSuspicious": is_suspicious}

if __name__ == "__main__":
    permissions = json.loads(sys.argv[1])
    result = detect_anomaly(permissions)
    print(json.dumps(result))