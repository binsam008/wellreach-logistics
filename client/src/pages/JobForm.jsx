// client/src/pages/JobForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { Truck, Save, Upload } from "lucide-react";
import ShipmentStatusSelect from "../components/ShipmentStatusSelect";
import * as XLSX from "xlsx";

const COUNTRIES = ["Select country", "Bahrain", "India", "UAE", "Other"];

export default function JobForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [saving, setSaving] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);

  const [form, setForm] = useState({
    jobNumber: "",
    truckDetails: "",
    driverName: "",
    routeTo: "",
    country: "Bahrain",
    cost: "",
    sale: "",
    clientName: "",
    status: "DOCUMENT RECEIVED",
  });

  useEffect(() => {
    if (!isEdit) return;

    const fetchJob = async () => {
      try {
        setLoadingJob(true);
        const res = await api.get(`/jobs/${id}`);
        const j = res.data;

        setForm({
          jobNumber: j.jobNumber || "",
          truckDetails: j.truckDetails || "",
          driverName: j.driverName || "",
          routeTo: j.routeTo || "",
          country: j.country || "Bahrain",
          cost: j.cost != null ? String(j.cost) : "",
          sale: j.sale != null ? String(j.sale) : "",
          clientName: j.clientName || "",
          status: j.status || "DOCUMENT RECEIVED",
        });
      } catch (err) {
        console.error("Failed to load job:", err);
        alert("Failed to load job details");
        nav("/admin/dashboard/jobs");
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJob();
  }, [id, isEdit, nav]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.jobNumber.trim()) {
      alert("Job Number / Tracking ID is required");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        cost: Number(form.cost) || 0,
        sale: Number(form.sale) || 0,
      };

      if (isEdit) {
        await api.put(`/jobs/${id}`, payload);
        alert("Job updated");
      } else {
        await api.post("/jobs", payload);
        alert("Job created");
      }

      nav("/admin/dashboard/jobs");
    } catch (err) {
      console.error(err);
      alert(isEdit ? "Failed to update job" : "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  // ============= XLSX IMPORT (BULK JOBS) =============
  const handleImportXlsx = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (!rows.length) {
          alert("No rows found in the Excel file.");
          return;
        }

        // Expecting headers like:
        // Job Number | Client Name | Truck Details | Driver Name | Route To | Country | Cost | Sale | Shipment Status
        const parsedJobs = rows.map((row) => ({
          jobNumber: row["Job Number"] || row["jobNumber"] || "",
          clientName: row["Client Name"] || row["clientName"] || "",
          truckDetails: row["Truck Details"] || row["truckDetails"] || "",
          driverName: row["Driver Name"] || row["driverName"] || "",
          routeTo: row["Route To"] || row["routeTo"] || "",
          country: row["Country"] || "Bahrain",
          cost: Number(row["Cost"] ?? row["Truck Cost"] ?? row["cost"]) || 0,
          sale: Number(row["Sale"] ?? row["Sale Cost"] ?? row["sale"]) || 0,
          status: row["Shipment Status"] || row["Status"] || "DOCUMENT RECEIVED",
        }));

        // Filter out any empty rows (no jobNumber and no clientName)
        const cleanJobs = parsedJobs.filter(
          (j) => j.jobNumber?.toString().trim() || j.clientName?.toString().trim()
        );

        if (!cleanJobs.length) {
          alert("No valid job rows found in the Excel. Check column names and data.");
          return;
        }

        const confirmMsg = `Import ${cleanJobs.length} jobs from this file?`;
        if (!window.confirm(confirmMsg)) return;

        const res = await api.post("/jobs/bulk", { jobs: cleanJobs });
        alert(`Imported ${res.data.count || cleanJobs.length} jobs successfully.`);
        nav("/admin/dashboard/jobs");
      } catch (err) {
        console.error("Bulk import error:", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to import jobs. Please check the file format.";
        alert(msg);
      } finally {
        // Reset file input so same file can be selected again if needed
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="card">
      <div className="card-inner space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-brand-orange text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-semibold">
                {isEdit ? "Edit Transport Job" : "New Transport Job"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEdit
                  ? "Update job, vehicle, driver, route and costing details."
                  : "Enter job, vehicle, driver, route and costing details."}
              </p>
            </div>
          </div>

          {/* XLSX Import – only really useful for creating, but we can show always */}
          {!isEdit && (
            <div className="flex items-center gap-2">
              <label className="btn btn-outline cursor-pointer text-xs sm:text-sm flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import XLSX (Bulk)
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleImportXlsx}
                />
              </label>
            </div>
          )}
        </div>

        {loadingJob ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Loading job details…
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Job Number / Tracking ID
                </label>
                <input
                  className="input"
                  name="jobNumber"
                  value={form.jobNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Client Name
                </label>
                <input
                  className="input"
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Truck Details
                </label>
                <input
                  className="input"
                  name="truckDetails"
                  value={form.truckDetails}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Driver Name
                </label>
                <input
                  className="input"
                  name="driverName"
                  value={form.driverName}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Route To
                </label>
                <input
                  className="input"
                  name="routeTo"
                  value={form.routeTo}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Country
                </label>
                <select
                  className="input"
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                >
                  {COUNTRIES.map((c) => (
                    <option
                      key={c}
                      value={c === "Select country" ? "" : c}
                    >
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Shipment Status
                </label>
                <ShipmentStatusSelect
                  value={form.status}
                  onChange={(status) =>
                    setForm((f) => ({ ...f, status }))
                  }
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Truck Cost (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  name="cost"
                  value={form.cost}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Sale Cost (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  name="sale"
                  value={form.sale}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => nav("/admin/dashboard/jobs")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving
                  ? isEdit
                    ? "Saving..."
                    : "Saving..."
                  : isEdit
                  ? "Update Job"
                  : "Save Job"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
