import React from "react";
import { useAuth } from "./AuthProvider";
import LoginForm from "./LoginForm";
import LoadingSpinner from "./LoadingSpinner";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
}

export default function RouteGuard({ children, requiredRoles = [], fallback }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user and roles are required, show login
  if (!user && requiredRoles.length > 0) {
    return fallback || (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Required</h1>
          <p className="text-gray-600 mb-8">Please sign in to access this page</p>
          <LoginForm showRegister={false} />
        </div>
      </div>
    );
  }

  // If user exists but doesn't have required role
  if (user && requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Access Denied</h1>
          <p className="text-gray-600 mb-8">
            You don't have permission to access this page. Required role: {requiredRoles.join(', ')}
          </p>
          <p className="text-sm text-gray-500">Your current role: {user.role}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
