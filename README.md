# PODAI - PDF Chat Assistant

A PDF chat application that allows users to upload PDFs and ask questions about their content.

## Features

- PDF upload and processing
- Chat interface for asking questions about PDF content
- RAG-based (Retrieval Augmented Generation) approach for accurate answers
- Streaming responses for real-time feedback
- Configurable token limits for detailed responses
- Support for both Hugging Face and local Ollama models

## Running the Application

To run the application, use one of the following commands:

```bash
# Install dependencies
make setup

# Run both frontend and backend (with high token limit)
make run-all

# Run with reduced token limit for lower resource usage
make run-all-low-tokens

# Run the backend and frontend separately
make run-backend
make run-frontend

# Run in debug mode
make debug-all
```

## Configuration

The application can be configured through environment variables:

### LLM Settings

- `LLM_MAX_LENGTH`: Maximum number of tokens in generated responses (default: 4096)
- `LLM_MODEL`: The model to use with Hugging Face (default: ibm-granite/granite-3.2-8b-instruct)
- `LLM_TEMPERATURE`: Controls randomness in responses (default: 0.7)

### Ollama Settings (Local Model)

- `USE_LOCAL_MODEL`: Set to "true" to use local Ollama model (default: false)
- `OLLAMA_MODEL`: The model to use with Ollama (default: granite)
- `OLLAMA_BASE_URL`: The URL of your Ollama server (default: http://localhost:11434)
- `OLLAMA_CONTEXT_WINDOW`: Context window size for Ollama (default: 32768)

## Streaming Responses

When using a local Ollama model, responses can be streamed word-by-word to the frontend for a more interactive experience. This feature can be toggled in the UI.

## Development

Run the tests with:

```bash
# Run all tests
make test-all

# Run just the backend tests
make test-backend

# Run just the frontend unit tests
make test-frontend-unit

# Run just the frontend e2e tests
make test-frontend-e2e
```
