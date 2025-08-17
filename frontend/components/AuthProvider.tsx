import React, { createContext, useContext, useState, useEffect } from "react";
import backend from "~backend/client";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const userInfo = await backend.auth.me();
      setUser(userInfo);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await backend.auth.login({ email, password });
    setUser(response.user);
  }

  async function logout() {
    await backend.auth.logout();
    setUser(null);
  }

  async function register(email: string, password: string, name: string) {
    await backend.auth.register({ email, password, name });
    // Auto-login after registration
    await login(email, password);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Returns the backend client with authentication
export function useBackend() {
  const { user } = useAuth();
  if (!user) return backend;
  
  // The session cookie is automatically sent with requests
  return backend;
}
