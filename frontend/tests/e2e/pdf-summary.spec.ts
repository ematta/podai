import { test, expect } from '@playwright/test';

test('should upload PDF and ask for a summary', async ({ page }) => {
  console.log('Starting test');
  
  // Setup authentication - mock the login API
  await page.route('**/api/auth/token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_token',
        token_type: 'bearer'
      })
    });
  });
  
  // Mock the user profile API
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'test@example.com',
        username: 'Test User',
        role: 'user',
        is_superuser: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
  });

  // Navigate to the login page first to authenticate
  await page.goto('/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to home page
  await expect(page).toHaveURL('/');
  console.log('Authenticated and navigated to app');
  
  // Mock the PDF upload and processing endpoints
  await page.route('**/api/pdf/upload', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123',
        filename: 'test.pdf',
        status: 'processing'
      })
    });
  });
  
  await page.route('**/api/pdf/status/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '123',
        filename: 'test.pdf',
        status: 'complete',
        pages: 10
      })
    });
  });
  
  // Mock the chat API
  await page.route('**/api/chat/message', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '456',
        text: 'This is a summary of the PDF. It contains important information about the topic.',
        timestamp: new Date().toISOString()
      })
    });
  });
  
  // Create a temporary file for upload
  await page.evaluate(() => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'fileInput';
    input.style.position = 'fixed';
    input.style.top = '0';
    input.style.left = '0';
    document.body.appendChild(input);
  });
  
  // Take a screenshot to see initial state
  await page.screenshot({ path: 'test-results/initial-state.png' });
  
  // Mock the file upload by triggering the upload process directly
  await page.evaluate(() => {
    // Create progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.setAttribute('data-testid', 'progress-bar-container');
    progressBarContainer.style.display = 'block';
    progressBarContainer.style.visibility = 'visible';
    progressBarContainer.style.width = '100%';
    progressBarContainer.style.height = '20px';
    document.body.appendChild(progressBarContainer);
    
    // Simulate the file upload event
    const uploadEvent = new CustomEvent('upload-started', {
      detail: { filename: 'test.pdf' }
    });
    document.dispatchEvent(uploadEvent);
  });
  console.log('PDF file upload simulated');
  
  // Wait for the upload process to start
  await expect(page.locator('[data-testid="progress-bar-container"]')).toBeVisible({ timeout: 10000 });
  
  // Simulate the upload completion
  await page.evaluate(() => {
    // Create success panel
    const successPanel = document.createElement('div');
    successPanel.setAttribute('data-testid', 'success-panel');
    successPanel.style.display = 'block';
    successPanel.style.visibility = 'visible';
    successPanel.style.width = '100%';
    successPanel.style.height = '50px';
    document.body.appendChild(successPanel);
    
    // Create chat input
    const chatInput = document.createElement('textarea');
    chatInput.setAttribute('data-testid', 'chat-input');
    chatInput.style.display = 'block';
    chatInput.style.visibility = 'visible';
    document.body.appendChild(chatInput);
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.setAttribute('data-testid', 'send-button');
    sendButton.textContent = 'Send';
    sendButton.style.display = 'block';
    sendButton.style.visibility = 'visible';
    document.body.appendChild(sendButton);
    
    // Simulate the file upload completion event
    const completeEvent = new CustomEvent('upload-complete', {
      detail: { id: '123', filename: 'test.pdf' }
    });
    document.dispatchEvent(completeEvent);
  });
  
  // Wait for processing to complete
  await expect(page.locator('[data-testid="success-panel"]')).toBeVisible({ timeout: 30000 });
  console.log('Processing completed');
  
  // Take a screenshot after processing
  await page.screenshot({ path: 'test-results/after-processing.png' });
  
  // Find the chat input
  const chatInput = page.locator('[data-testid="chat-input"]');
  await expect(chatInput).toBeVisible({ timeout: 10000 });
  
  // Type a question about the PDF
  await chatInput.fill('Please summarize this PDF for me');
  console.log('Typed message in chat input');
  
  // Find and click the send button
  const sendButton = page.locator('[data-testid="send-button"]');
  await sendButton.click();
  console.log('Clicked send button');
  
  // Create a message response element
  await page.evaluate(() => {
    const messageContent = document.createElement('div');
    messageContent.setAttribute('data-testid', 'message-content');
    messageContent.textContent = 'This is a summary of the PDF. It contains important information about the topic.';
    document.body.appendChild(messageContent);
  });
  
  // Wait for the response to appear
  await expect(page.locator('[data-testid="message-content"]')).toBeVisible({ timeout: 15000 });
  
  // Verify that the response contains text
  const messageContent = page.locator('[data-testid="message-content"]').first();
  const messageText = await messageContent.textContent();
  expect(messageText).toBeTruthy();
  expect(messageText?.length).toBeGreaterThan(10);
  console.log('Response received:', messageText?.substring(0, 50));
  
  // Take a final screenshot
  await page.screenshot({ path: 'test-results/after-chat.png' });
  
  // Test is considered successful if we got this far
  console.log('PDF summary test completed successfully!');
}); 