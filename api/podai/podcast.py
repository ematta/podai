import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

api_key = os.getenv("SEGMIND_API_KEY")
url = "https://api.segmind.com/v1/dia"

async def process_podcast(script: str):
    """
    This function sends a request to the Segmind API to process a podcast script.
    It prepares the data and files required for the API call and prints the response.
    """
    
    # Check if API key is available
    if not api_key:
        return {"error": "SEGMIND_API_KEY environment variable is not set"}
    
    # Prepare data and files
    data = {}

    data['text'] = script
    data['top_p'] = 0.95
    data['cfg_scale'] = 4
    data['temperature'] = 1.3
    # For parameter "input_audio", you can send a raw file or a URI:
    # files['input_audio'] = open('IMAGE_PATH', 'rb')  # To send a file
    data['input_audio'] = 'null'  # To send a URI
    data['speed_factor'] = 0.94
    data['max_new_tokens'] = 3072
    data['cfg_filter_top_k'] = 35
    headers = {'x-api-key': api_key}
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Segmind API response status: {response.status_code}")
        print(f"Segmind API response content: {response.content}")
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"Failed to process podcast: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"error": f"Exception occurred while processing podcast: {str(e)}"}
