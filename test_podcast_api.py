#!/usr/bin/env python3
"""
Test script for the podcast API to verify file saving functionality
"""
import requests
import json
import os

def test_podcast_api():
    """Test the podcast conversion API endpoint"""
    api_url = "http://localhost:8000"
    endpoint = f"{api_url}/api/podcast/conversion"
    
    # Test script
    test_script = "Hello, this is a test podcast script. We are testing the audio generation functionality."
    
    # Prepare the request
    payload = {
        "script": test_script
    }
    
    try:
        print("Testing podcast API...")
        print(f"Sending request to: {endpoint}")
        print(f"Payload: {payload}")
        
        # Make the request
        response = requests.post(endpoint, json=payload)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response received:")
            print(json.dumps(result, indent=2))
            
            # Check if file was saved
            if result.get("success") and result.get("filename"):
                print(f"\n✅ Success! File saved as: {result['filename']}")
                print(f"File path: {result['file_path']}")
                print(f"Content type: {result['content_type']}")
                
                # Test the download endpoint
                download_endpoint = f"{api_url}/api/podcast/download/{result['filename']}"
                print(f"\nTesting download endpoint: {download_endpoint}")
                
                download_response = requests.get(download_endpoint)
                print(f"Download response status: {download_response.status_code}")
                
                if download_response.status_code == 200:
                    print("✅ Download endpoint works correctly!")
                else:
                    print("❌ Download endpoint failed")
            else:
                print("❌ Response doesn't contain expected file information")
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error testing API: {str(e)}")

if __name__ == "__main__":
    test_podcast_api()
