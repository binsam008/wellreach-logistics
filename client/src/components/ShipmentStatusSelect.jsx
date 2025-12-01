import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "DOCUMENT RECEIVED", label: "DOCUMENT RECEIVED", pillClass: "bg-sky-100 text-sky-800" },
  { value: "DOCUMENT PROCESSING", label: "DOCUMENT PROCESSING", pillClass: "bg-red-700 text-white" },
  { value: "APPROVALS PENDING", label: "APPROVALS PENDING", pillClass: "bg-rose-100 text-rose-800" },
  { value: "APPROVALS PAYMENT DONE", label: "APPROVALS PAYMENT DONE", pillClass: "bg-amber-700 text-white" },
  { value: "CDF PREPARED", label: "CDF PREPARED", pillClass: "bg-orange-100 text-orange-800" },
  { value: "UNDER CLEARANCE DOCUMENTATION", label: "UNDER CLEARANCE DOCUMENTATION", pillClass: "bg-emerald-700 text-white" },
  { value: "CDF PAYMENT PENDING", label: "CDF PAYMENT PENDING", pillClass: "bg-sky-800 text-white" },
  { value: "DUTY & VAT PAYMENT DONE", label: "DUTY & VAT PAYMENT DONE", pillClass: "bg-amber-200 text-amber-900" },
  { value: "UNDER CLEARANCE", label: "UNDER CLEARANCE", pillClass: "bg-emerald-500 text-white" },
  { value: "CLEARANCE COMPLETED", label: "CLEARANCE COMPLETED", pillClass: "bg-sky-600 text-white" },
  { value: "DELIVERED AT PLACE", label: "DELIVERED AT PLACE", pillClass: "bg-violet-600 text-white" },
];

export default function ShipmentStatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const current = STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm"
      >
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${current.pillClass}`}
        >
          {current.label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute mt-2 w-full max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow z-20">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                onChange(s.value);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className={`inline-flex px-3 py-1 rounded-full font-semibold ${s.pillClass}`}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
