// Import jest-dom testing library extensions
import '@testing-library/jest-dom';

// Set up any global mocks or configurations here
global.process.env = {
  ...global.process.env,
  NODE_ENV: 'test',
  API_URL: 'http://localhost:8081'
};

// Mock the fetch API if needed
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    ok: true,
    status: 200,
    statusText: "OK",
  })
);

// Reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 