// client/src/components/EditChargesModal.jsx
import React, { useEffect, useState } from "react";
import { X, PlusCircle, Trash2 } from "lucide-react";

/**
 * EditChargesModal
 * Props:
 * - open (bool)
 * - invoice (object) - should include _id, extraCosts, baseCost, taxPercent, discount, country, job (optional)
 * - onClose() - close modal
 * - onSave(summary) - called with server response (buildSummary) after successful save
 * - api (axios instance) - used to call PUT /invoices/:id/extra-costs
 */
export default function EditChargesModal({ open, invoice, onClose, onSave, api }) {
  const [items, setItems] = useState([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // derive tax % by country (India -> 18, else -> 10)
  const deriveTaxFromCountry = (country = "") => {
    const c = String(country || "").toLowerCase();
    if (c.includes("india")) return 18;
    return 10;
  };

  useEffect(() => {
    if (!open) return;
    if (!invoice) {
      setItems([]);
      setTaxPercent(0);
      setDiscount(0);
      setError("");
      return;
    }

    // expected base rows: Transport first (editable) then the four standard rows
    const expected = [
      "Transport service charges",
      "Service Charge - Clearance Only",
      "Health Charges - MOH Paid",
      "BAS Charges - Port Paid",
      "Service - Transport & Delivery Charges",
    ];

    // Map incoming extraCosts for amounts by label
    const map = {};
    (invoice.extraCosts || []).forEach((e) => {
      if (e?.label) map[e.label] = Number(e.amount || 0);
    });

    // ensure transport uses baseCost or job.cost if present (pref invoice.baseCost)
    const transportAmount = Number(
      invoice.baseCost ?? invoice.job?.cost ?? 0
    );

    const base = expected.map((lbl) => {
      if (lbl === "Transport service charges") {
        return { label: lbl, amount: transportAmount, _custom: false };
      }
      return { label: lbl, amount: Number(map[lbl] ?? 0), _custom: false };
    });

    // add any other (custom) extraCosts that weren't part of expected
    const others = (invoice.extraCosts || [])
      .filter((e) => !expected.includes(e.label))
      .map((e) => ({ label: e.label || "", amount: Number(e.amount || 0), _custom: true }));

    setItems([...base, ...others]);

    // determine starting taxPercent: use invoice.taxPercent if >0, else derive from country/job
    const invoiceTax = invoice.taxPercent != null ? Number(invoice.taxPercent) : null;
    const country = invoice.country || invoice.job?.country || "";
    const derived = deriveTaxFromCountry(country);

    setTaxPercent(invoiceTax && invoiceTax > 0 ? invoiceTax : derived);
    setDiscount(Number(invoice.discount || 0));
    setError("");
  }, [open, invoice]);

  if (!open) return null;

  // helpers
  const updateLabel = (idx, val) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, label: val } : it)));

  const updateAmount = (idx, val) => {
    const cleaned = val === "" ? "" : Number(val);
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount: cleaned } : it)));
  };

  const addRow = () => setItems((prev) => [...prev, { label: "", amount: 0, _custom: true }]);

  const removeRow = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const validateBeforeSave = () => {
    if (items.length === 0) {
      setError("Add at least one charge.");
      return false;
    }
    for (const it of items) {
      if (!it.label || String(it.label).trim() === "") {
        setError("Each charge must have a label.");
        return false;
      }
      if (it.amount === "" || Number.isNaN(Number(it.amount))) {
        setError("Amounts must be numeric.");
        return false;
      }
      if (Number(it.amount) < 0) {
        setError("Amounts cannot be negative.");
        return false;
      }
    }
    if (isNaN(Number(taxPercent)) || Number(taxPercent) < 0) {
      setError("Tax % must be non-negative.");
      return false;
    }
    if (isNaN(Number(discount)) || Number(discount) < 0) {
      setError("Discount must be non-negative.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;
    if (!invoice || !invoice._id) {
      setError("Invoice not available.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        extraCosts: items.map((i) => ({ label: String(i.label).trim(), amount: Number(i.amount || 0) })),
        discount: Number(discount || 0),
        taxPercent: Number(taxPercent || 0),
      };

      const res = await api.put(`/invoices/${invoice._id}/extra-costs`, payload);
      onSave(res.data);
      onClose();
    } catch (err) {
      console.error("Failed to save charges", err);
      setError(err.response?.data?.error || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // totals
  const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const taxable = Math.max(0, subtotal - Number(discount || 0));
  const taxAmount = Number(((taxable * (Number(taxPercent || 0) / 100)) || 0).toFixed(3));
  const grandTotal = Number((taxable + taxAmount).toFixed(3));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Edit Invoice Charges</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update amounts and add extra charges. Transport cost (truck) is editable here.
            </p>
          </div>

          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              <input
                className="input flex-1"
                value={it.label}
                placeholder="Charge name"
                onChange={(e) => updateLabel(idx, e.target.value)}
              />
              <input
                type="number"
                step="0.001"
                className="input w-36"
                value={it.amount}
                onChange={(e) => updateAmount(idx, e.target.value)}
              />
              <button
                onClick={() => removeRow(idx)}
                title="Remove this charge"
                className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
            >
              <PlusCircle className="w-4 h-4" /> Add new charge
            </button>

            <div className="ml-auto text-sm text-slate-500 dark:text-slate-400">
              Subtotal: <span className="font-semibold">{subtotal.toFixed(3)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm w-20">Discount</label>
              <input type="number" step="0.001" className="input w-36" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm w-20">Tax %</label>
              <input type="number" step="0.01" className="input w-24" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </div>

            <div className="ml-auto text-sm text-slate-500 dark:text-slate-400 text-right">
              <div>Tax amount: <span className="font-semibold">{taxAmount.toFixed(3)}</span></div>
              <div>Total: <span className="font-semibold">{grandTotal.toFixed(3)}</span></div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-outline text-xs" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary text-xs" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
