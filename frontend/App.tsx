import React from "react";
import { AuthProvider } from "./components/AuthProvider";
import { Router, Route, useRouter } from "./components/Router";
import RouteGuard from "./components/RouteGuard";
import Navigation from "./components/Navigation";
import UserDashboard from "./components/UserDashboard";
import LoginPage from "./pages/LoginPage";
import AdminApp from "./AdminApp";
import PublicApp from "./PublicApp";

function AppInner() {
  const { currentPath, navigate } = useRouter();

  return (
    <>
      <Route path="/login" exact>
        <LoginPage />
      </Route>

      <Route path="/admin">
        <AdminApp />
      </Route>

      <Route path="/dashboard" exact>
        <RouteGuard requiredRoles={['admin', 'editor', 'viewer', 'user']}>
          <div className="min-h-screen bg-white">
            <Navigation currentPath={currentPath} navigate={navigate} />
            <UserDashboard />
          </div>
        </RouteGuard>
      </Route>

      <Route path="/" exact>
        <PublicApp />
      </Route>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}
