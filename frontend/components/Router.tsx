import React, { useState, useEffect, createContext, useContext } from "react";

interface RouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function Router({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname + window.location.search;
    }
    return '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (path.startsWith('#')) {
      // Handle hash navigation for same-page anchors
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Simple parameter extraction for paths like /admin/docs/:id
  const params: Record<string, string> = {};
  
  const value = {
    currentPath,
    navigate,
    params,
  };

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a Router");
  }
  return context;
}

interface RouteProps {
  path: string;
  children: React.ReactNode;
  exact?: boolean;
}

export function Route({ path, children, exact = false }: RouteProps) {
  const { currentPath } = useRouter();
  
  // Remove query string and hash for matching
  const cleanPath = currentPath.split('?')[0].split('#')[0];
  
  const matches = exact 
    ? cleanPath === path || cleanPath === path + '/'
    : cleanPath.startsWith(path);
  
  return matches ? <>{children}</> : null;
}
