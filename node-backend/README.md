# PodAI Backend (Node.js)

This is the Node.js backend for PodAI, an application that generates podcast scripts from PDF files using AI. It's built with TypeScript and Express.js.

## Features

- PDF file uploads and storage
- PDF to text extraction
- PDF to markdown conversion
- AI-powered podcast script generation
- Interactive chat with PDF documents
- API endpoints for frontend integration

## Prerequisites

- Node.js 18.x or higher
- npm or yarn

## Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

5. Edit the `.env` file with your Hugging Face API token or configure for local model use.

## Using a Local Model with Ollama

PodAI now supports running models locally using [Ollama](https://ollama.ai/), which provides an easy way to run large language models locally.

### Setup Instructions

1. Install Ollama from [ollama.ai](https://ollama.ai/)

2. Pull the model you want to use (we recommend using the Granite model for compatibility):

```bash
ollama pull granite
```

3. Update your `.env` file to use the local model:

```
# Change this to true to use local model
USE_LOCAL_MODEL=true

# Configure Ollama settings
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=granite
OLLAMA_CONTEXT_WINDOW=16384  # 16k context window
```

4. Start the Ollama server (if not already running):

```bash
ollama serve
```

5. Start the PodAI backend with your local model configuration

Benefits of using a local model:
- No API tokens or keys required
- Complete privacy - all data stays on your machine
- No cost or rate limits
- Works offline
- **Much larger context window** (16k vs ~4k tokens for Hugging Face API)

Note: Running models locally requires sufficient RAM and computational resources. The minimum recommended is 8GB RAM, with 16GB+ preferred for larger models.

### Understanding Context Windows and Token Limits

- **Hugging Face API** has a combined limit of approximately 4096 tokens for both input and output combined. This means that large documents will be heavily truncated.

- **Local models via Ollama** can handle much larger contexts. The default setting of 16k context window allows for processing approximately 50,000 characters of text, which is enough for most PDFs and documents.

- You can adjust the `OLLAMA_CONTEXT_WINDOW` setting based on your hardware capabilities and model used. Some models support even larger context windows (32k or 64k), but require more RAM.

- If you experience slow performance or out-of-memory errors when using a local model, try reducing the context window size.

## Development

Run the development server with:

```bash
npm run dev
```

## Building for Production

Build the TypeScript code to JavaScript:

```bash
npm run build
```

## Running in Production

```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check if the server is running

### File Upload
- `POST /upload` - Upload a PDF file and generate a podcast script
  - Accepts `multipart/form-data` with a field named `file`
  - Returns file ID, markdown content, and generated script

### Chat with PDF
- `POST /chat/:fileId` - Ask a question about a specific PDF
  - Requires JSON body with a `question` field
  - Returns AI-generated answer based on PDF content

### Chat History
- `GET /chat/:fileId/history` - Get the history of questions and answers for a PDF

## Environment Variables

- `PORT` - Server port (default: 8081)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `UPLOAD_FOLDER` - Folder to store uploaded files
- `MAX_UPLOAD_SIZE` - Maximum file size in bytes
- `HUGGINGFACE_API_TOKEN` - Hugging Face API token
- `LLM_MODEL` - Model name to use for text generation
- `LLM_TEMPERATURE` - Temperature for text generation
- `LLM_MAX_LENGTH` - Maximum length for generated text

## Tests

Run tests with:

```bash
npm test
```
