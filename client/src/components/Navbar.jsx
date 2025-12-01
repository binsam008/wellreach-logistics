// client/src/components/Navbar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path ? "bg-slate-200/80 dark:bg-slate-700" : "";

  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 select-none">
          <div className="w-9 h-9 rounded-full bg-brand-orange text-white font-bold flex items-center justify-center shadow-md">
            W
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-slate-800 dark:text-white">
              WellReach Logistics
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Route · Tracking · Billing
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3 text-sm font-medium">
          <Link
            to="/track"
            className={`px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${isActive(
              "/track"
            )}`}
          >
            Track
          </Link>
        </nav>
      </div>
    </header>
  );
}
