import json

def analyze_esg(data, jurisdiction, language):
  # Creativo: Simple ESG score, adjust by jurisdiction
  score = 85 if jurisdiction == 'US' else 90 if jurisdiction == 'DE' else 80
  message = 'ESG analyzed' if language == 'en' else 'ESG analizado' if language == 'es' else 'ESG analisado' if language == 'pt' else 'ESG analysé' if language == 'fr' else 'ESG analysiert' if language == 'de' else 'ESG analyzed'

  return {'score': score, 'message': message}

if __name__ == "__main__":
  import sys
  data = json.loads(sys.argv[1])
  jurisdiction = sys.argv[2]
  language = sys.argv[3]
  print(json.dumps(analyze_esg(data, jurisdiction, language)))