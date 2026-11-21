import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CustomerDashboard from "./pages/CustomerDashboard";

import { logout, getToken } from "./data/AuthAPI";

const API_BASE_URL = "http://localhost:3000/api";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkSession() {
      const token = getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          logout();
          setUser(null);
        } else {
          setUser(result.data.user);
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  function handleLogin(data) {
    setUser(data.user);
    navigate("/dashboard");
  }

  function handleLogout() {
    logout();
    setUser(null);
    navigate("/", { replace: true });
  }

  if (loading) {
    return <p className="p-6">Memeriksa sesi login...</p>;
  }

  function renderDashboard() {
    if (!user) {
      return <Navigate to="/" replace />;
    }

    if (user.role === "ADMIN") {
      return (
        <DashboardPage
          user={user}
          onLogout={handleLogout}
        />
      );
    }

    if (user.role === "CUSTOMER") {
      return (
        <CustomerDashboard
          user={user}
          onLogout={handleLogout}
        />
      );
    }

    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage loginSuccess={handleLogin} />
          )
        }
      />

      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />

      <Route
        path="/dashboard"
        element={renderDashboard()}
      />

      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/"} replace />}
      />
    </Routes>
  );
}

export default App;

