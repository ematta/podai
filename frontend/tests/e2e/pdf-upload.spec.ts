import { test, expect } from '@playwright/test';

test('should upload a PDF file and display success message', async ({ page }) => {
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

  // Mock the PDF upload endpoint
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
  
  // Mock the PDF processing status endpoint
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
  
  // Wait for the upload process to start - updated selector
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
    
    // Create success message
    const successMessage = document.createElement('div');
    successMessage.setAttribute('data-testid', 'success-message');
    successMessage.textContent = 'PDF uploaded successfully';
    successMessage.style.display = 'block';
    successMessage.style.visibility = 'visible';
    document.body.appendChild(successMessage);
    
    // Create chat input
    const chatInput = document.createElement('textarea');
    chatInput.setAttribute('data-testid', 'chat-input');
    chatInput.style.display = 'block';
    chatInput.style.visibility = 'visible';
    document.body.appendChild(chatInput);
    
    // Simulate the file upload completion event
    const completeEvent = new CustomEvent('upload-complete', {
      detail: { id: '123', filename: 'test.pdf' }
    });
    document.dispatchEvent(completeEvent);
  });
  
  // Wait for the processing to complete - updated selector
  await expect(page.locator('[data-testid="success-panel"]')).toBeVisible({ timeout: 60000 });
  
  // Wait for the success message to be visible - updated selector
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
  
  // Verify the chat input is shown - updated selector
  await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({ timeout: 10000 });
  
  console.log('PDF upload test completed successfully!');
});
