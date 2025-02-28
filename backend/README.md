# PodAI Backend

Backend server for the PodAI application, which converts PDF documents to podcast scripts.

## Features

- PDF upload and processing
- Markdown conversion 
- Podcast script generation using Llama 3.2 3B
- Chat with PDF documents using Llama 3.2 3B

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   
4. Edit the `.env` file and add your Hugging Face API token:
   ```
   HUGGINGFACE_API_TOKEN=your_token_here
   ```

   You can get a token from [Hugging Face](https://huggingface.co/settings/tokens) by creating an account and generating a new token.

## Running the Server

Start the server on port 8081:

```
flask run --port=8081
```

Or use the Makefile from the project root:

```
make run-backend
```

For development with debug mode enabled:

```
make debug-backend
```

## API Endpoints

- `POST /upload` - Upload a PDF file
- `POST /pdf-to-markdown` - Convert a PDF file to markdown
- `GET /pdfs` - Get list of all PDF IDs
- `GET /pdf/<pdf_id>` - Get a specific PDF file
- `POST /chat/<pdf_id>` - Chat with a specific PDF

## LLM Model

This application uses the Llama 3.2 3B model from Meta for generating podcast scripts and answering questions about PDFs. The model is accessed via the Hugging Face API.

Note: Accessing the Llama 3.2 3B model may require special access or permissions from Hugging Face. Make sure your API token has the necessary permissions for this model.
