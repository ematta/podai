import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Parse token from URL if coming from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const authError = params.get('error');

    if (token) {
      login(token).then(() => {
        navigate('/');
      });
    }

    if (authError) {
      setError(authError);
    }
  }, [location, login, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: email, // FastAPI OAuth2 uses username field for email
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await login(data.access_token);
        navigate('/');
      } else {
        if (response.status === 502) {
          setError('Unable to connect to authentication service. Please try again later.');
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to login');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setGoogleLoading(true);
      
      // Check if backend is reachable before redirecting
      const healthCheck = await fetch('/api/health', { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).catch(() => ({ ok: false }));
      
      if (!healthCheck.ok) {
        setError('Authentication service is currently unavailable. Please try again later or use email/password login.');
        setGoogleLoading(false);
        return;
      }
      
      // Redirect to Google OAuth endpoint
      window.location.href = '/api/auth/google/login';
    } catch (err) {
      setError('Unable to connect to Google authentication. Please check your network connection and try again.');
      setGoogleLoading(false);
      console.error('Google login error:', err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8" style={{ backgroundColor: '#000000', color: '#e0e0e0' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold mb-2" style={{ color: '#4caf50' }}>
          PDF Chat Assistant
        </h1>
        <h2 className="mt-6 text-center text-2xl font-bold leading-9" style={{ color: '#e0e0e0' }}>
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-6 py-8 shadow sm:rounded-lg sm:px-12" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="border-l-4 p-4 mb-4" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#ef4444' }}>
                <p style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6" style={{ color: '#e0e0e0' }}>
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md py-1.5 px-3 shadow-sm"
                  style={{ 
                    backgroundColor: '#1a1a1a', 
                    color: '#e0e0e0', 
                    border: '1px solid #4caf50',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6" style={{ color: '#e0e0e0' }}>
                  Password
                </label>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md py-1.5 px-3 shadow-sm"
                  style={{ 
                    backgroundColor: '#1a1a1a', 
                    color: '#e0e0e0', 
                    border: '1px solid #4caf50',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 shadow-sm"
                style={{ 
                  backgroundColor: loading ? '#45a049' : '#4caf50', 
                  color: 'white',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: '#333' }} />
              </div>
              <div className="relative flex justify-center text-sm">
                <span style={{ backgroundColor: '#1a1a1a', color: '#888', padding: '0 8px' }}>Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm"
                style={{ 
                  backgroundColor: '#1a1a1a', 
                  color: '#e0e0e0',
                  border: '1px solid #333',
                  transition: 'background-color 0.2s',
                  opacity: googleLoading ? 0.7 : 1,
                  cursor: googleLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {googleLoading ? (
                  <span>Connecting to Google...</span>
                ) : (
                  <>
                    <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0353 3.12C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                        fill="#34A853"
                      />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 