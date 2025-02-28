import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('should load test PDF and verify chat response about title', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');

  // Wait for the page to load completely
  await page.waitForSelector('[data-testid="page-title"]');
  
  // Path to the test PDF file
  const pdfPath = path.resolve('../node-backend/test/data/2412.14135v1.pdf');
  
  // Verify that the PDF exists
  expect(fs.existsSync(pdfPath)).toBeTruthy();
  
  // Wait for the test PDF button and click it
  const testPdfButton = page.locator('[data-testid="test-pdf-0"]');
  await testPdfButton.waitFor({ state: 'visible' });
  await testPdfButton.click();
  
  // Just wait for the success panel, skipping intermediate states
  // This gives more time for the PDF to be processed
  await page.locator('[data-testid="success-panel"]').waitFor({ 
    state: 'visible', 
    timeout: 60000 
  });
  
  // Now wait for the chat input to be interactive
  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.waitFor({ state: 'visible' });
  
  // Type a message asking about the title
  await chatInput.fill('What is the title of this paper?');
  
  // Click the send button
  await page.locator('[data-testid="chat-send-button"]').click();
  
  // Wait for the response with relevant content
  const responseLocator = page.locator('.chat-message-content', { 
    hasText: /Scaling of Search and Learning/ 
  });
  
  await responseLocator.waitFor({ 
    state: 'visible', 
    timeout: 90000 
  });
  
  // Verify the content of the response
  const responseText = await page.locator('.chat-message-content').last().textContent();
  expect(responseText).toContain('Scaling of Search and Learning');
  expect(responseText).toContain('A Roadmap to Reproduce o1');
  
  console.log('Chat functionality test completed successfully!');
});
