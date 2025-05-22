import React from "react";
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import AppButton from "../components/Button";
import { uploadPdf } from "../client/uploadPdf"; // Import the uploadPdf function

export default function Home() {
    const handleUpload = async () => {
        // Create an input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';

        // Listen for file selection
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                try {
                    const response = await uploadPdf(file);
                    console.log('Upload successful:', response);
                    // Handle successful upload (e.g., show a success message)
                } catch (error) {
                    console.error('Upload failed:', error);
                    // Handle upload error (e.g., show an error message)
                }
            }
        };

        // Trigger the file input click
        input.click();
    };
    return (
        <Container maxWidth="sm">
            <Typography variant="h1" component="h1" gutterBottom>
                PodAI
            </Typography>
            <AppButton sx={{ color: 'gray' }} children={"Upload PDF"} onClick={handleUpload} />
        </Container>
    );
}