import json

def generate_module(llm_response, input_data):
  # Creativo: Refinamiento simple (e.g., add comments in language)
  language = input_data.get('language', 'en')
  jurisdiction = input_data.get('jurisdiction', 'US')

  # Parse LLM response (assume JSON)
  response = json.loads(llm_response)

  # Add jurisdiction comment to code
  comment = f"// Adjusted for jurisdiction {jurisdiction}"
  response['serviceCode'] = comment + '\n' + response['serviceCode']

  # Language-specific adjustments (e.g., translate comments)
  if language == 'es':
    response['moduleCode'] = response['moduleCode'].replace('Module', 'Módulo')

  return response

if __name__ == "__main__":
  import sys
  llm_response = sys.argv[1]
  input_data = json.loads(sys.argv[2])
  print(json.dumps(generate_module(llm_response, input_data)))