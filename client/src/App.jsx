// client/src/App.jsx
import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import { setToken } from "./api";

import TrackPackage from "./pages/TrackPackage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function AppShell() {
  const location = useLocation();
  const hideNavbar = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell">
      {!hideNavbar && <Navbar />}
      <main className="app-container py-8">
        <Routes>
          {/* Public */}
          <Route path="/" element={<TrackPackage />} />
          <Route path="/track" element={<TrackPackage />} />

          {/* Admin login */}
          <Route path="/admin" element={<AdminLogin />} />

          {/* Admin dashboard nested */}
          <Route path="/admin/dashboard/*" element={<AdminDashboard />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="card mt-10">
                <div className="card-inner">
                  <h2 className="section-title mb-2">404</h2>
                  <p className="section-subtitle">
                    The page you’re looking for doesn’t exist.
                  </p>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  // On first load, read token from localStorage and set header for axios
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setToken(token); // sets Authorization header for axios
    }
  }, []);

  return (
    <Router>
      <AppShell />
    </Router>
  );
}
