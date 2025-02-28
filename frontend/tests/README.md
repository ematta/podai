# End-to-End Testing

This directory contains end-to-end tests for the PodAI application using Playwright.

## Test Structure

- `e2e/`: Contains all end-to-end tests
  - `pdf-upload.spec.ts`: Tests the PDF upload functionality

## Running Tests

You can run the tests using the following commands:

```bash
# Run from project root
make test-e2e

# Or run directly from frontend directory
cd frontend
npm run test         # Run all tests in headless mode
npm run test:headed  # Run all tests with browser visible
npm run test:ui      # Run tests with Playwright UI
```

## Test IDs

All components have been annotated with `data-testid` attributes to make them easier to target in tests:

- `page-title`: The main page title
- `upload-section`: The PDF upload section
- `file-input`: The file input element
- `select-file-button`: Button to open file selector
- `upload-button`: Button to upload the selected PDF
- `progress-bar-container`: Progress bar showing upload/processing status
- `success-message`: Message shown when PDF is processed successfully
- `chat-input`: Input field for asking questions about the document
- `chat-send-button`: Button to send chat messages

## Adding New Tests

When adding new tests, follow these guidelines:

1. Create a new file in the `e2e/` directory
2. Use the test IDs to target elements instead of text content or CSS selectors
3. Keep tests focused on specific user flows
4. Use appropriate timeouts for asynchronous operations
