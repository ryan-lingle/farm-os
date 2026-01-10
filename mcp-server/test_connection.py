#!/usr/bin/env python3
"""
Simple test script to verify farmAPI connection
"""
import requests
import os

FARM_API_URL = os.getenv("FARM_API_URL", "http://localhost:3005/api/v1")

def test_connection():
    print(f"Testing connection to farmAPI at: {FARM_API_URL}")
    print("-" * 50)
    
    try:
        # Test basic connectivity
        response = requests.get(f"{FARM_API_URL}/schema", timeout=5)
        
        if response.status_code == 200:
            print("✅ Successfully connected to farmAPI!")
            print(f"   Status Code: {response.status_code}")
            
            # Try to parse the schema
            schema = response.json()
            if "resources" in schema:
                print(f"   Available resources: {', '.join(schema['resources'].keys())}")
            else:
                print("   Schema structure is different than expected")
                print(f"   Response keys: {', '.join(schema.keys())}")
        else:
            print(f"❌ Connection failed with status code: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Could not connect to farmAPI")
        print("   Make sure your farmAPI server is running at localhost:3005")
    except requests.exceptions.Timeout:
        print("❌ Timeout: Request took too long")
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_connection() 