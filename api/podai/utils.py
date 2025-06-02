import os
import time
from datetime import datetime, timedelta

def cleanup_old_files(temp_dir: str = "/workspaces/podai/temp", max_age_hours: int = 24):
    """
    Clean up old files from the temp directory to prevent storage issues.
    
    Args:
        temp_dir: Directory to clean up
        max_age_hours: Maximum age of files to keep (in hours)
    """
    if not os.path.exists(temp_dir):
        return
    
    cutoff_time = time.time() - (max_age_hours * 3600)
    cleaned_files = []
    
    try:
        for filename in os.listdir(temp_dir):
            file_path = os.path.join(temp_dir, filename)
            if os.path.isfile(file_path):
                file_mtime = os.path.getmtime(file_path)
                if file_mtime < cutoff_time:
                    os.remove(file_path)
                    cleaned_files.append(filename)
        
        if cleaned_files:
            print(f"Cleaned up {len(cleaned_files)} old files from temp directory")
        
    except Exception as e:
        print(f"Error during cleanup: {str(e)}")
    
    return cleaned_files

def get_file_info(file_path: str):
    """
    Get metadata information about a file.
    
    Args:
        file_path: Path to the file
    
    Returns:
        dict: File metadata including size, creation time, etc.
    """
    if not os.path.exists(file_path):
        return None
    
    try:
        stat = os.stat(file_path)
        return {
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
    except Exception as e:
        print(f"Error getting file info: {str(e)}")
        return None
