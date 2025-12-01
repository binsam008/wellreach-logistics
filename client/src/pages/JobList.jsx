import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Truck, MapPinned, FileText, Pencil } from "lucide-react";

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const loadJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/jobs"); // GET /api/jobs (protected)
      setJobs(res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const createInvoice = async (jobId) => {
    try {
      await api.post(`/invoices/from-job/${jobId}`); // POST /api/invoices/from-job/:jobId
      alert("Invoice generated from job");
    } catch (err) {
      console.error(err);
      alert("Failed to generate invoice");
    }
  };

  const handleEdit = (id) => {
    nav(`/admin/dashboard/jobs/${id}/edit`);
  };

  return (
    <div className="card">
      <div className="card-inner space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base md:text-lg font-semibold">Jobs Overview</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total: {jobs.length}
          </span>
        </div>

        {loading && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading jobs…
          </p>
        )}

        {!loading && jobs.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No jobs yet. Click “New Job” to add one.
          </p>
        )}

        <div className="space-y-2">
          {jobs.map((j) => (
            <div
              key={j._id || j.jobNumber}
              className="flex flex-col md:flex-row md:items-center justify-between gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-3 bg-white/80 dark:bg-slate-900/60"
            >
              <div className="space-y-1">
                <div className="font-semibold text-sm md:text-[15px]">
                  {j.jobNumber}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {j.clientName || "Client"}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {j.truckDetails || "No truck"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinned className="w-3 h-3" />
                    {j.routeTo || "No route"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-row flex-col md:items-end gap-2 text-xs">
                <div className="text-slate-600 dark:text-slate-300">
                  Cost: ₹{j.cost || 0} · Sale: ₹{j.sale || 0}
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost text-xs px-3 py-1.5"
                    onClick={() => handleEdit(j._id)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>

                    <button
                      className="btn btn-outline text-xs px-3 py-1.5"
                      onClick={() => createInvoice(j._id)}
                    >
                      <FileText className="w-3 h-3" />
                      Generate Invoice
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
