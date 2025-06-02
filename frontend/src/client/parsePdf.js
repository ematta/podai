export const parsePdf = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Fallback for safety
        const response = await fetch(`${apiUrl}/api/pdf/parse`, { // Assuming '/api/upload' is your upload endpoint
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Network response was not ok', response.statusText);
        }

        const data = await response.json();
        console.log('Parsed PDF data from backend:', data); // Log the data to the console
        return data; // Or handle success as needed
    } catch (error) {
        console.error('Error parsing file:', error);
        throw error; // Or handle error as needed
    }
};
