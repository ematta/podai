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
        console.log('Processed podcast data from backend:', data); // Log the data to the console
        return data; // Or handle success as needed
    } catch (error) {
        console.error('Error processing podcast:', error);
        throw error; // Or handle error as needed
    }
}