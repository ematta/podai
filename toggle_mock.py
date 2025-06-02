#!/usr/bin/env python3
"""
Quick script to toggle mock mode for podcast processing
Usage: python toggle_mock.py [on|off|status]
"""
import os
import sys
from pathlib import Path

def update_env_file(mock_enabled: bool):
    """Update the .env file with new mock mode setting"""
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    # Read current content
    with open(env_path, 'r') as f:
        lines = f.readlines()
    
    # Update or add PODCAST_MOCK_MODE line
    mock_line = f"PODCAST_MOCK_MODE={'true' if mock_enabled else 'false'}\n"
    mock_found = False
    
    for i, line in enumerate(lines):
        if line.startswith("PODCAST_MOCK_MODE="):
            lines[i] = mock_line
            mock_found = True
            break
    
    if not mock_found:
        lines.append(mock_line)
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.writelines(lines)
    
    return True

def get_current_status():
    """Get current mock mode status from environment"""
    mock_enabled = os.getenv("PODCAST_MOCK_MODE", "false").lower() == "true"
    mock_delay = os.getenv("PODCAST_MOCK_DELAY", "2.0")
    has_api_key = bool(os.getenv("SEGMIND_API_KEY"))
    
    print(f"🎭 Mock Mode: {'ON' if mock_enabled else 'OFF'}")
    print(f"⏱️  Mock Delay: {mock_delay}s")
    print(f"🔑 Segmind API Key: {'Available' if has_api_key else 'Missing'}")
    print(f"💡 Mode: {'TESTING (Free)' if mock_enabled else 'PRODUCTION (Costs Money)'}")
    
    return mock_enabled

def main():
    if len(sys.argv) < 2:
        print("Usage: python toggle_mock.py [on|off|status]")
        print("\nCurrent status:")
        get_current_status()
        return
    
    command = sys.argv[1].lower()
    
    if command == "status":
        get_current_status()
    elif command == "on":
        if update_env_file(True):
            print("✅ Mock mode ENABLED")
            print("💡 Podcast processing will use fake audio files (no API costs)")
        else:
            print("❌ Failed to enable mock mode")
    elif command == "off":
        if update_env_file(False):
            print("✅ Mock mode DISABLED")
            print("💸 Podcast processing will use real Segmind API (costs money)")
        else:
            print("❌ Failed to disable mock mode")
    else:
        print(f"❌ Unknown command: {command}")
        print("Usage: python toggle_mock.py [on|off|status]")

if __name__ == "__main__":
    main()
