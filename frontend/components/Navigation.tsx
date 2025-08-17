import React from "react";
import { useAuth } from "./AuthProvider";
import Button from "./Button";

interface NavigationProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export default function Navigation({ currentPath, navigate }: NavigationProps) {
  const { user, logout } = useAuth();

  const isAdminPath = currentPath.startsWith('/admin');
  const isDashboardPath = currentPath === '/dashboard';

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <button 
              onClick={() => navigate('/')} 
              className="text-lg font-semibold text-gray-900 hover:text-gray-700 transition-colors"
            >
              Script Review
            </button>

            {/* Navigation breadcrumbs for admin */}
            {isAdminPath && user && ['admin', 'editor', 'viewer'].includes(user.role) && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>/</span>
                <span className="text-gray-900 font-medium">Admin Panel</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* User is logged in */}
                <div className="flex items-center space-x-4">
                  {!isAdminPath && !isDashboardPath && (
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                      Dashboard
                    </Button>
                  )}
                  
                  {['admin', 'editor', 'viewer'].includes(user.role) && (
                    <>
                      {!isAdminPath && (
                        <Button variant="ghost" onClick={() => navigate('/admin')}>
                          Admin Panel
                        </Button>
                      )}
                      {isAdminPath && (
                        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                          Back to Dashboard
                        </Button>
                      )}
                    </>
                  )}

                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {user.name} 
                      <span className="text-gray-400 ml-1">({user.role})</span>
                    </span>
                    <Button variant="outline" size="sm" onClick={logout}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* User is not logged in */}
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" onClick={() => navigate('#submit')}>
                    Submit Script
                  </Button>
                  <Button variant="ghost" onClick={() => navigate('#status')}>
                    Check Status
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
