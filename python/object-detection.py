import sys
import json
# Asume import cv2, yolo if installed
# Mock for example
def detect_objects(capture):
    return {"objects": ["mock-object"]}

if __name__ == "__main__":
    capture = sys.argv[1]
    results = detect_objects(capture)
    print(json.dumps(results))