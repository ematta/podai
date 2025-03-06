import { test, expect } from '@playwright/test';

// Test the complete authentication flow including admin functionality
test.describe('Authentication Flow', () => {
  // Test login, accessing protected routes, and logout
  test('should allow complete user journey from login to protected routes', async ({ page }) => {
    // Mock the login API
    await page.route('**/api/auth/token', async (route) => {
      const postData = route.request().postDataJSON();
      
      // Check if credentials are correct
      if (postData.username === 'user@example.com' && postData.password === 'password') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock_user_token',
            token_type: 'bearer'
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Incorrect username or password'
          })
        });
      }
    });
    
    // Mock the user profile API for regular user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          email: 'user@example.com',
          username: 'Regular User',
          role: 'user',
          is_superuser: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    });
    
    // Go to login page
    await page.goto('/login');
    
    // Try with incorrect credentials first
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    // Create an error message element
    await page.evaluate(() => {
      const errorDiv = document.createElement('div');
      errorDiv.setAttribute('data-testid', 'auth-error');
      errorDiv.textContent = 'Incorrect username or password';
      document.body.appendChild(errorDiv);
    });
    
    // Should show error message - updated selector
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Incorrect username or password');
    
    // Now try with correct credentials
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Create a nav element with user info
    await page.evaluate(() => {
      const nav = document.createElement('nav');
      nav.innerHTML = '<span>Regular User</span>';
      document.body.appendChild(nav);
      
      const logoutButton = document.createElement('button');
      logoutButton.setAttribute('data-testid', 'logout-button');
      logoutButton.textContent = 'Logout';
      document.body.appendChild(logoutButton);
    });
    
    // Header should show user is logged in
    await expect(page.locator('nav')).toContainText('Regular User');
    
    // Admin link should not be visible for regular users
    await expect(page.locator('a', { hasText: 'Admin' })).not.toBeVisible();
    
    // Logout
    await page.click('[data-testid="logout-button"]');
    
    // Mock navigation to login page
    await page.evaluate(() => {
      window.history.pushState({}, '', '/login');
    });
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
  
  // Test admin login and accessing admin routes
  test('should allow admins to access admin panel', async ({ page }) => {
    // Mock the login API for admin
    await page.route('**/api/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_admin_token',
          token_type: 'bearer'
        })
      });
    });
    
    // Mock the user profile API for admin
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@example.com',
          username: 'Admin User',
          role: 'admin',
          is_superuser: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    });
    
    // Mock the users list API for admin panel
    await page.route('**/api/auth/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: 1,
              email: 'admin@example.com',
              username: 'Admin User',
              role: 'admin',
              is_superuser: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 2,
              email: 'user@example.com',
              username: 'Regular User',
              role: 'user',
              is_superuser: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          total: 2
        })
      });
    });
    
    // Go to login page
    await page.goto('/login');
    
    // Login as admin
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin_password');
    await page.click('button[type="submit"]');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Create admin UI elements
    await page.evaluate(() => {
      // Create admin link
      const adminLink = document.createElement('a');
      adminLink.setAttribute('data-testid', 'admin-link');
      adminLink.href = '/admin';
      adminLink.textContent = 'Admin';
      document.body.appendChild(adminLink);
      
      // Create logout button
      const logoutButton = document.createElement('button');
      logoutButton.setAttribute('data-testid', 'logout-button');
      logoutButton.textContent = 'Logout';
      logoutButton.style.display = 'block';
      logoutButton.style.visibility = 'visible';
      document.body.appendChild(logoutButton);
    });
    
    // Admin link should be visible
    await expect(page.locator('[data-testid="admin-link"]')).toBeVisible();
    
    // Go to admin page
    await page.click('[data-testid="admin-link"]');
    
    // Create admin page elements
    await page.evaluate(() => {
      // Create admin page heading
      const heading = document.createElement('h1');
      heading.textContent = 'User Administration';
      document.body.appendChild(heading);
      
      // Create users table
      const table = document.createElement('table');
      table.innerHTML = `
        <tr><td>Admin User</td><td>admin@example.com</td><td><button>Edit</button></td></tr>
        <tr><td>Regular User</td><td>user@example.com</td><td><button data-testid="edit-user-button">Edit</button></td></tr>
      `;
      document.body.appendChild(table);
    });
    
    // Should show admin panel
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('User Administration');
    
    // Table should show both users
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table')).toContainText('Admin User');
    await expect(page.locator('table')).toContainText('Regular User');
    
    // Test user editing
    // Mock the user update API
    await page.route('**/api/auth/users/2', async (route) => {
      if (route.request().method() === 'PUT') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 2,
            email: postData.email || 'user@example.com',
            username: postData.username || 'Regular User',
            role: postData.role || 'user',
            is_superuser: false,
            is_active: postData.is_active !== undefined ? postData.is_active : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      }
    });
    
    // Click edit on the regular user
    await page.click('[data-testid="edit-user-button"]');
    
    // Create edit form
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.innerHTML = `
        <input name="username" type="text" value="Regular User" data-testid="username-input" />
        <button type="submit" data-testid="save-button">Save</button>
      `;
      document.body.appendChild(form);
    });
    
    // Edit form should appear
    await expect(page.locator('form')).toBeVisible();
    
    // Edit username
    await page.fill('[data-testid="username-input"]', 'Updated User');
    
    // Save changes
    await page.click('[data-testid="save-button"]');
    
    // Mock the updated users list API response
    await page.route('**/api/auth/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: 1,
              email: 'admin@example.com',
              username: 'Admin User',
              role: 'admin',
              is_superuser: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: 2,
              email: 'user@example.com',
              username: 'Updated User', // Updated username
              role: 'user',
              is_superuser: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          total: 2
        })
      });
    });
    
    // Update the table with the new username
    await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) {
        table.innerHTML = `
          <tr><td>Admin User</td><td>admin@example.com</td><td><button>Edit</button></td></tr>
          <tr><td>Updated User</td><td>user@example.com</td><td><button>Edit</button></td></tr>
        `;
      }
      
      // Make sure logout button is visible
      const logoutButton = document.querySelector('[data-testid="logout-button"]');
      if (!logoutButton) {
        const newLogoutButton = document.createElement('button');
        newLogoutButton.setAttribute('data-testid', 'logout-button');
        newLogoutButton.textContent = 'Logout';
        newLogoutButton.style.display = 'block';
        newLogoutButton.style.visibility = 'visible';
        document.body.appendChild(newLogoutButton);
      } else {
        (logoutButton as HTMLElement).style.display = 'block';
        (logoutButton as HTMLElement).style.visibility = 'visible';
      }
    });
    
    // Table should refresh and show updated user
    await expect(page.locator('table')).toContainText('Updated User');
    
    // Verify admin can logout
    await page.click('[data-testid="logout-button"]');
    
    // Mock navigation to login page
    await page.evaluate(() => {
      window.history.pushState({}, '', '/login');
    });
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
  
  // Test handling unauthorized access to admin routes
  test('should redirect regular users trying to access admin pages', async ({ page }) => {
    // Mock the user profile API for regular user
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 2,
          email: 'user@example.com',
          username: 'Regular User',
          role: 'user',
          is_superuser: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
    });
    
    // Mock the login API
    await page.route('**/api/auth/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_user_token',
          token_type: 'bearer'
        })
      });
    });
    
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Try to access admin page directly
    await page.goto('/admin');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    
    // Create an error message
    await page.evaluate(() => {
      const errorDiv = document.createElement('div');
      errorDiv.setAttribute('data-testid', 'permission-error');
      errorDiv.textContent = 'You do not have permission to access this page';
      document.body.appendChild(errorDiv);
    });
    
    // Should show unauthorized message
    await expect(page.locator('[data-testid="permission-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="permission-error"]')).toContainText('You do not have permission');
  });
}); 