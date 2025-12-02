// client/components/ConfirmModal.jsx
import React from "react";

export default function ConfirmModal({ open, title = "Confirm", message = "", onCancel, onConfirm, confirmText = "Yes", cancelText = "Cancel" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 w-full max-w-md">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="btn btn-outline text-xs">{cancelText}</button>
          <button onClick={onConfirm} className="btn btn-primary text-xs">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
