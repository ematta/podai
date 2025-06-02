export const processPodcast = async (script) => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Fallback for safety
        const response = await fetch(`${apiUrl}/api/podcast/conversion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ script: script }),
        });

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                // Try to parse a JSON error response from the backend
                const errorData = await response.json();
                errorMsg = errorData.detail || errorData.message || errorMsg;
            } catch {
                // If response is not JSON or parsing fails, use statusText or the generic message
                errorMsg = response.statusText || errorMsg;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        console.log('Processed podcast data from backend:', data);
        
        // If the response includes a file path, create a download URL
        if (data.success && data.filename) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            data.downloadUrl = `${apiUrl}/api/podcast/download/${data.filename}`;
        }
        
        return data;
    } catch (error) {
        console.error('Error processing podcast:', error);
        throw error; // Or handle error as needed
    }
}

// Helper function to download the podcast file
export const downloadPodcastFile = async (filename) => {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const downloadUrl = `${apiUrl}/api/podcast/download/${filename}`;
        
        // Create a temporary link element and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { success: true, message: 'Download started' };
    } catch (error) {
        console.error('Error downloading podcast file:', error);
        throw error;
    }
}