import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('PDF Upload Test', () => {
  test('should upload a PDF file and display success message', async ({ page }: { page: Page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="page-title"]');
    
    // Path to the test PDF file
    const pdfPath = path.resolve('../node-backend/test/data/2412.14135v1.pdf');
    
    // Verify that the PDF exists
    expect(fs.existsSync(pdfPath)).toBeTruthy();
    
    // Click on the file input and select the PDF
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(pdfPath);
    
    // Click the upload button
    await page.click('[data-testid="upload-button"]');
    
    // Wait for the upload process to start
    await expect(page.locator('[data-testid="progress-bar-container"]')).toBeVisible();
    
    // Wait for the upload process to complete and success message to appear
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 60000 });
    
    // Verify that the success details are displayed
    await expect(page.locator('[data-testid="success-details"]')).toBeVisible();
    
    // Verify the chat interface is shown
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    console.log('PDF upload test completed successfully!');
  });
});
