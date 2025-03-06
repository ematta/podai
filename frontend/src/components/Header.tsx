import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-indigo-600 text-white shadow-md relative">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">PDF Chat Assistant</Link>
        
        {/* Right side items */}
        <div className="relative" ref={menuRef}>
          {/* Hamburger menu button - completely redesigned for visibility */}
          <button 
            onClick={toggleMenu}
            className="flex flex-col justify-center items-center w-10 h-10 p-2 rounded-full bg-white text-indigo-600 hover:bg-gray-200 focus:outline-none shadow-md"
            aria-label="Menu"
          >
            <span className="block w-5 h-0.5 bg-indigo-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-indigo-600 mb-1"></span>
            <span className="block w-5 h-0.5 bg-indigo-600"></span>
          </button>
          
          {/* Dropdown menu with improved visibility */}
          {menuOpen && (
            <div className="absolute right-0 top-12 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800 border border-gray-200">
              {isAuthenticated ? (
                <>
                  <div className="border-b border-gray-200 pb-2 px-4 pt-2 mb-1">
                    <div className="text-sm font-medium text-indigo-600">{user?.username}</div>
                    <div className="text-xs text-gray-500">{user?.role}</div>
                  </div>
                  <Link to="/" className="block px-4 py-2 text-sm hover:bg-gray-100">Chat</Link>
                  {isAdmin && (
                    <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-gray-100">Admin</Link>
                  )}
                  <div className="border-t border-gray-200 mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-500"
                    >
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  to="/login"
                  className="block px-4 py-2 text-sm hover:bg-gray-100 text-indigo-600 font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 