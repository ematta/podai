import requests
import os
import uuid
import datetime
import json
from dotenv import load_dotenv
from .utils import cleanup_old_files, get_file_info

# Load environment variables
load_dotenv()

api_key = os.getenv("SEGMIND_API_KEY")
url = "https://api.segmind.com/v1/dia"

def process_podcast(script: str):
    """
    This function sends a request to the Segmind API to process a podcast script.
    It prepares the data and files required for the API call, saves the response to temp folder,
    and returns the file path.
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
        
        if response.status_code == 200:
            # Create temp directory if it doesn't exist
            temp_dir = "/workspaces/podai/temp"
            os.makedirs(temp_dir, exist_ok=True)
            
            # Clean up old files before saving new ones
            cleanup_old_files(temp_dir, max_age_hours=24)
            
            # Generate unique filename with timestamp
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            
            # Check content type to determine file extension
            content_type = response.headers.get('content-type', '')
            
            if 'audio' in content_type:
                # Handle audio response
                if 'wav' in content_type:
                    file_extension = '.wav'
                elif 'mp3' in content_type:
                    file_extension = '.mp3'
                else:
                    file_extension = '.wav'  # Default to wav
                
                filename = f"podcast_{timestamp}_{unique_id}{file_extension}"
                file_path = os.path.join(temp_dir, filename)
                
                # Save binary audio content
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                
                # Get file metadata
                file_info = get_file_info(file_path)
                
                print(f"Audio file saved to: {file_path}")
                return {
                    "success": True,
                    "file_path": file_path,
                    "filename": filename,
                    "content_type": content_type,
                    "file_info": file_info
                }
            else:
                # Handle JSON or text response
                try:
                    json_response = response.json()
                    
                    # Check if the JSON contains audio data or URL
                    if 'audio_url' in json_response:
                        # If there's an audio URL, download it
                        audio_response = requests.get(json_response['audio_url'])
                        if audio_response.status_code == 200:
                            filename = f"podcast_{timestamp}_{unique_id}.wav"
                            file_path = os.path.join(temp_dir, filename)
                            
                            with open(file_path, 'wb') as f:
                                f.write(audio_response.content)
                            
                            # Get file metadata
                            file_info = get_file_info(file_path)
                            
                            print(f"Audio file downloaded and saved to: {file_path}")
                            return {
                                "success": True,
                                "file_path": file_path,
                                "filename": filename,
                                "content_type": "audio/wav",
                                "file_info": file_info
                            }
                    
                    # Save JSON response as file for debugging
                    filename = f"podcast_response_{timestamp}_{unique_id}.json"
                    file_path = os.path.join(temp_dir, filename)
                    
                    with open(file_path, 'w') as f:
                        json.dump(json_response, f, indent=2)
                    
                    # Get file metadata
                    file_info = get_file_info(file_path)
                    
                    print(f"JSON response saved to: {file_path}")
                    return {
                        "success": True,
                        "file_path": file_path,
                        "filename": filename,
                        "content_type": "application/json",
                        "response_data": json_response,
                        "file_info": file_info
                    }
                except ValueError:
                    # Handle non-JSON text response
                    filename = f"podcast_response_{timestamp}_{unique_id}.txt"
                    file_path = os.path.join(temp_dir, filename)
                    
                    with open(file_path, 'w') as f:
                        f.write(response.text)
                    
                    # Get file metadata
                    file_info = get_file_info(file_path)
                    
                    print(f"Text response saved to: {file_path}")
                    return {
                        "success": True,
                        "file_path": file_path,
                        "filename": filename,
                        "content_type": "text/plain",
                        "file_info": file_info
                    }
        else:
            return {"error": f"Failed to process podcast: {response.status_code} - {response.text}"}
    except Exception as e:
        return {"error": f"Exception occurred while processing podcast: {str(e)}"}
