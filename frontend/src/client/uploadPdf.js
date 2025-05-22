export const uploadPdf = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Fallback for safety
        const response = await fetch(`${apiUrl}/api/pdf/upload`, { // Assuming '/api/upload' is your upload endpoint
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data; // Or handle success as needed
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error; // Or handle error as needed
    }
};
