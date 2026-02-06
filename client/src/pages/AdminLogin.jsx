// client/src/pages/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { setToken } from "../api";
import { Lock, LogIn } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // matches server: app.use('/api/auth', auth)
      const res = await api.post("/auth/login", { username, password });

      if (!res.data.success) {
        alert(res.data.message || "Invalid credentials");
        return;
      }

      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      nav("/admin/dashboard");
    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="card-inner space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-purple text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Console</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Restricted access · WellReach operations team only.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Username
              </label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={loading}
            >
              <LogIn className="w-4 h-4" />
              {loading ? "Signing in..." : "Sign in to Dashboard"}
            </button>
          </form>

          {/* <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Default username: <span className="font-medium">admin</span> ·
            Password from <code>ADMIN_PASS</code> in server <code>.env</code>
          </p> */}
        </div>
      </div>
    </div>
  );
}
