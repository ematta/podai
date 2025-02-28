import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Chat Functionality Test', () => {
  test('should load test PDF and verify chat response about title', async ({ page }: { page: Page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="page-title"]');
    
    // Path to the test PDF file
    const pdfPath = path.resolve('../node-backend/test/data/2412.14135v1.pdf');
    
    // Verify that the PDF exists
    expect(fs.existsSync(pdfPath)).toBeTruthy();
    
    // Use the test PDF functionality to load the file faster
    await page.click('[data-testid="test-pdf-0"]'); // Click on the Physics Paper test file
    
    // Wait for the processing to complete and success message to appear
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 60000 });
    
    // Verify that the chat interface is shown
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Type a message asking about the title
    await page.fill('[data-testid="chat-input"]', 'What is the title of this paper?');
    
    // Send the message
    await page.click('[data-testid="chat-send-button"]');
    
    // Wait for the response (this may take some time)
    await expect(
      page.locator('.chat-message-content', { hasText: /Scaling of Search and Learning/ })
    ).toBeVisible({ timeout: 90000 });
    
    // Verify that the response contains the correct title mention
    const responseText = await page.locator('.chat-message-content').last().textContent();
    expect(responseText).toContain('Scaling of Search and Learning');
    expect(responseText).toContain('A Roadmap to Reproduce o1');
    
    console.log('Chat functionality test completed successfully!');
  });
});
