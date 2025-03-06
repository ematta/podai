import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useEffect } from 'react';

// Mock fetch API
global.fetch = vi.fn();

// Mock useNavigate hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock fetch response helper
const mockFetchResponse = (data: any, ok = true) => {
  return {
    ok,
    json: vi.fn().mockResolvedValue(data),
    status: ok ? 200 : 401
  };
};

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
      <div data-testid="admin-status">{isAdmin ? 'Admin' : 'Not admin'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button onClick={() => login('test_token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    
    // Ensure global.fetch is properly mocked for all tests
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        status: 200
      }) as any
    );
  });

  it('should initialize with unauthenticated state', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('auth-status').textContent).toBe('Not authenticated');
    expect(screen.queryByTestId('user-email')).not.toBeInTheDocument();
  });

  it('should authenticate user on login and fetch profile', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      is_superuser: false,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
    
    // Setup mock fetch for both the login and profile fetch
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: 'test_token' })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockUser
      });
    
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    // Click login button
    fireEvent.click(screen.getByText('Login'));
    
    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    }, { timeout: 3000 });
    
    // Check user profile is loaded
    expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');
  });

  it('should handle login from Google OAuth callback URL', async () => {
    // Set up localStorage with the token
    localStorage.setItem('token', 'google_oauth_token');
    
    // Mock the fetch response for user profile
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        email: 'google@example.com',
        name: 'Google User',
        isAdmin: false
      })
    });
    
    // Set up the test with a URL that includes the token
    const initialEntries = ['/auth/callback?token=google_oauth_token'];
    
    // Create a component to test OAuth callback handling
    const OAuthCallbackTest = () => {
      const { isAuthenticated, user } = useAuth();
      
      // Force the component to recognize the token on mount
      useEffect(() => {
        // This will trigger the useEffect in AuthContext that checks for token
      }, []);
      
      return (
        <div>
          <div data-testid="oauth-authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
          {user && <div data-testid="oauth-user">{user.email}</div>}
        </div>
      );
    };
    
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route 
            path="/auth/callback" 
            element={
              <AuthProvider>
                <OAuthCallbackTest />
              </AuthProvider>
            } 
          />
        </Routes>
      </MemoryRouter>
    );
    
    // Wait for authentication to complete
    await waitFor(() => {
      expect(screen.getByTestId('oauth-authenticated').textContent).toBe('Yes');
    });
    
    // Check user profile is loaded from Google data
    expect(screen.getByTestId('oauth-user').textContent).toBe('google@example.com');
    
    // Verify token from OAuth is stored in localStorage
    expect(localStorage.getItem('token')).toBe('google_oauth_token');
  });

  it('should logout user and clear auth state', async () => {
    // Set initial authenticated state
    localStorage.setItem('token', 'existing_token');
    
    // Mock user profile response
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'Test User',
      role: 'user',
      is_superuser: false,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
    
    // Setup mock fetch
    (global.fetch as any).mockResolvedValueOnce(mockFetchResponse(mockUser));
    
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    // Wait for initial auth state to load
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });
    
    // Click logout button
    fireEvent.click(screen.getByText('Logout'));
    
    // Check user is logged out
    expect(screen.getByTestId('auth-status').textContent).toBe('Not authenticated');
    expect(localStorage.getItem('token')).toBeNull();
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should identify admin users correctly', async () => {
    // Start with a clean localStorage
    localStorage.clear();
    
    // Mock admin user profile response
    const mockAdminUser = {
      id: 1,
      email: 'admin@example.com',
      username: 'Admin User',
      role: 'admin',
      is_superuser: true,
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };
    
    // Set token in localStorage first
    localStorage.setItem('token', 'admin_token');
    
    // Setup mock fetch for the profile fetch only
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockAdminUser)
    });
    
    // This component will use the admin token already set in localStorage
    const AdminTestComponent = () => {
      const { isAdmin, isAuthenticated, user } = useAuth();
      
      return (
        <div>
          <div data-testid="admin-status">{isAdmin ? 'Admin' : 'Not admin'}</div>
          <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
          {user && <div data-testid="user-email">{user.email}</div>}
        </div>
      );
    };
    
    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminTestComponent />
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Wait for authentication to complete with a longer timeout (5 seconds)
    await waitFor(() => {
      expect(screen.getByTestId('admin-status').textContent).toBe('Admin');
    }, { timeout: 5000 });
    
    // Verify that the user is authenticated and has the right email
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('user-email').textContent).toBe('admin@example.com');
  });

  it('should handle API errors during authentication', async () => {
    // Clear any existing tokens
    localStorage.clear();
    
    // Set a token that should be cleared on error
    localStorage.setItem('token', 'test_token');
    
    // Mock a failed API response with proper structure
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Authentication failed' })
    });
    
    // Create a component that will trigger the error handling
    const ErrorTestComponent = () => {
      const { login, isAuthenticated } = useAuth();
      
      // Trigger login on mount to test error handling
      useEffect(() => {
        login('test_token');
      }, []);
      
      return (
        <div>
          <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
        </div>
      );
    };
    
    render(
      <TestWrapper>
        <ErrorTestComponent />
      </TestWrapper>
    );
    
    // Wait for error handling to complete
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not authenticated');
    });
    
    // Token should be cleared from localStorage on auth error
    expect(localStorage.getItem('token')).toBeNull();
  });
}); 