import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('should upload a PDF file and display success message', async ({ page }) => {
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
  await expect(page.locator('[data-testid="progress-bar-container"]')).toBeVisible({ timeout: 10000 });
  
  // Wait for the processing to complete
  await expect(page.locator('[data-testid="success-panel"]')).toBeVisible({ timeout: 60000 });
  
  // Wait for the success message to be visible
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
  
  // Wait for the success details to be visible
  await expect(page.locator('[data-testid="success-details"]')).toBeVisible({ timeout: 10000 });
  
  // Wait until the chat section is visible
  await expect(page.locator('[data-testid="chat-section"]')).toBeVisible({ timeout: 10000 });
  
  // Verify the chat input is shown
  await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({ timeout: 10000 });
  
  console.log('PDF upload test completed successfully!');
});
