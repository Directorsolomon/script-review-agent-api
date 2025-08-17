import React, { useState } from "react";
import { useAuth } from "./AuthProvider";

interface LoginFormProps {
  onSuccess?: () => void;
  showRegister?: boolean;
}

function Button({ children, className, variant = "primary", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "primary" | "secondary" | "outline" | "ghost"; 
  size?: "sm" | "md" | "lg";
}) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const variantClasses = {
    primary: "bg-gray-900 text-white hover:bg-gray-800",
    secondary: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-200",
    outline: "bg-transparent text-gray-900 hover:bg-gray-50 border border-gray-200",
    ghost: "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 placeholder:text-gray-400 ${
        error ? "border-red-300 focus:ring-red-500" : "border-gray-200"
      } ${props.className || ""}`}
    />
  );
}

function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-gray-900 ${sizeClasses[size]}`} />
  );
}

export default function LoginForm({ onSuccess, showRegister = true }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, register } = useAuth();

  function validateForm() {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    if (!isLogin && !formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
      onSuccess?.();
    } catch (e: any) {
      setErrors({ submit: e.message || "Authentication failed" });
    } finally {
      setLoading(false);
    }
  }

  function updateFormData(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900">
            {isLogin ? "Sign in" : "Create account"}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter your full name"
                error={!!errors.name}
                autoComplete="name"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              placeholder="Enter your email"
              error={!!errors.email}
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              placeholder="Enter your password"
              error={!!errors.password}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>
          
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}
          
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Please wait...</span>
              </>
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>
        
        {showRegister && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setFormData({ email: "", password: "", name: "" });
              }}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
