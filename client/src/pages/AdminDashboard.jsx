import { useEffect } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { FileText, PlusCircle, ListChecks, LogOut } from "lucide-react";
import JobList from "./JobList";
import JobForm from "./JobForm";
import BillingPanel from "./BillingPanel";
import { setToken } from "../api";

export default function AdminDashboard() {
  const nav = useNavigate();

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      nav("/admin");
    } else {
      setToken(t);
    }
  }, [nav]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    nav("/admin");
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-inner flex flex-col md:flex-row md:items-center gap-3 md:gap-5 justify-between">
          <div>
            <p className="pill mb-2 w-fit">
              <FileText className="w-3 h-3" />
              Logistics Admin
            </p>
            <h2 className="text-lg md:text-xl font-semibold">
              Operations &amp; Billing Dashboard
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Create jobs, edit trips and generate invoices from a single panel.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <NavLink
              to="jobs"
              className={({ isActive }) =>
                `btn btn-ghost text-xs md:text-sm ${
                  isActive ? "bg-slate-100 dark:bg-slate-800" : ""
                }`
              }
            >
              <ListChecks className="w-4 h-4" />
              Jobs
            </NavLink>
            <NavLink
              to="jobs/new"
              className={({ isActive }) =>
                `btn btn-primary text-xs md:text-sm ${
                  isActive ? "" : "opacity-95"
                }`
              }
            >
              <PlusCircle className="w-4 h-4" />
              New Job
            </NavLink>
            <NavLink
              to="billing"
              className={({ isActive }) =>
                `btn btn-outline text-xs md:text-sm ${
                  isActive ? "bg-slate-100 dark:bg-slate-800" : ""
                }`
              }
            >
              <FileText className="w-4 h-4" />
              Billing
            </NavLink>
            <button
              onClick={logout}
              className="btn btn-ghost text-xs md:text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <Routes>
        <Route index element={<JobList />} />
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/new" element={<JobForm />} />
        {/* 👇 NEW: Edit job route */}
        <Route path="jobs/:id/edit" element={<JobForm />} />
        <Route path="billing" element={<BillingPanel />} />
      </Routes>
    </div>
  );
}
