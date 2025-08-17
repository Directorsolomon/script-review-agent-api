import React from "react";
import { Router, Route, useRouter } from "./components/Router";
import Navigation from "./components/Navigation";
import UserDashboard from "./components/UserDashboard";
import AdminApp from "./AdminApp";
import PublicApp from "./PublicApp";

function AppInner() {
  const { currentPath, navigate } = useRouter();

  return (
    <>
      <Route path="/admin">
        <AdminApp />
      </Route>

      <Route path="/dashboard" exact>
        <div className="min-h-screen bg-white">
          <Navigation currentPath={currentPath} navigate={navigate} />
          <UserDashboard />
        </div>
      </Route>

      <Route path="/" exact>
        <PublicApp />
      </Route>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}
