import React from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "../components/Router";
import LoginForm from "../components/LoginForm";
import { useEffect } from "react";

export default function LoginPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      if (['admin', 'editor', 'viewer'].includes(user.role)) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>
        
        <LoginForm 
          onSuccess={() => {
            // Navigation will be handled by useEffect above
          }}
          showRegister={true}
        />
        
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
