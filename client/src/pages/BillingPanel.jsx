// client/src/components/BillingPanel.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import EditChargesModal from "../components/EditChargesModal";
import {
  Trash2,
  FileText,
  PlusCircle,
  CreditCard,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function BillingPanel() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit charges modal
  const [editOpen, setEditOpen] = useState(false);
  const [editInvoiceFull, setEditInvoiceFull] = useState(null);

  // Payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      const res = await api.get("/invoices");
      setInvoices(res.data || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      alert("Failed to load invoices (see console).");
    } finally {
      setLoading(false);
    }
  }

  async function openEditCharges(invSummary) {
    try {
      const res = await api.get(`/invoices/${invSummary._id}/full`);
      setEditInvoiceFull(res.data);
      setEditOpen(true);
    } catch (err) {
      console.error("Failed to load invoice details:", err);
      alert("Unable to load invoice for editing. See console.");
    }
  }

  function handleEditSaved(summary) {
    setInvoices((prev) => prev.map((p) => (p._id === summary._id ? summary : p)));
  }

  async function openPdf(inv) {
    try {
      const res = await api.get(`/invoices/${inv._id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error("PDF open error:", err);
      const message =
        err?.response?.data?.error || err?.message || "Failed to open PDF";
      alert("PDF error: " + message);
    }
  }

  function openAddPayment(inv) {
    setPaymentInvoice(inv);
    setPayAmount("");
    setPaymentOpen(true);
  }

  async function doAddPayment() {
    if (!paymentInvoice) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      alert("Enter a valid positive payment amount.");
      return;
    }

    try {
      setPayLoading(true);
      const res = await api.put(`/invoices/${paymentInvoice._id}/pay`, {
        amount: amt,
      });
      if (res?.data?._id) {
        setInvoices((prev) =>
          prev.map((p) => (p._id === res.data._id ? res.data : p))
        );
      } else {
        await fetchInvoices();
      }
      setPaymentOpen(false);
    } catch (err) {
      console.error("Payment error:", err);
      alert("Failed to record payment (see console).");
    } finally {
      setPayLoading(false);
    }
  }

  function askDelete(inv) {
    setConfirmDelete(inv);
  }

  async function doDelete() {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/invoices/${confirmDelete._id}`);
      setInvoices((prev) => prev.filter((i) => i._id !== confirmDelete._id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete invoice (see console).");
    } finally {
      setDeleting(false);
    }
  }

  function deriveTaxFromCountry(country = "") {
    const c = String(country || "").toLowerCase();
    if (c.includes("india")) return 18;
    return 10;
  }

  function paymentStatus(inv) {
    const total = Number(inv.total || 0);
    const paid = Number(inv.paidAmount || 0);
    if (total <= 0)
      return { label: "UNBILLED", classes: "bg-slate-100 text-slate-800" };
    if (paid <= 0)
      return { label: "UNPAID", classes: "bg-rose-100 text-rose-700" };
    if (paid < total)
      return { label: "PARTIAL", classes: "bg-amber-100 text-amber-700" };
    return { label: "PAID", classes: "bg-emerald-100 text-emerald-700" };
  }

  // ---------- DASHBOARD METRICS ----------
  const totalInvoices = invoices.length;
  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.total || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.paidAmount || 0),
    0
  );
  const totalBalance = invoices.reduce(
    (sum, inv) => sum + Number(inv.balance || 0),
    0
  );

  const paidPercent =
    totalBilled > 0 ? Math.min(100, (totalPaid / totalBilled) * 100) : 0;
  const outstandingPercent =
    totalBilled > 0 ? Math.min(100, (totalBalance / totalBilled) * 100) : 0;

  // white + orange circular progress
  function ProgressRing({ value }) {
    const v = Math.max(0, Math.min(100, value || 0));
    return (
      <div className="relative w-10 h-10">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#f97316 ${v * 3.6}deg, #e5e7eb ${
              v * 3.6
            }deg)`,
          }}
        />
        <div className="absolute inset-[4px] rounded-full bg-white flex items-center justify-center text-[10px] font-semibold text-orange-600">
          {Math.round(v)}%
        </div>
      </div>
    );
  }

  // ---------- XLSX EXPORT ----------
  function exportToXlsx() {
    if (!invoices.length) {
      alert("No invoices to export.");
      return;
    }

    const rows = invoices.map((inv) => {
      const status = paymentStatus(inv);
      return {
        "Invoice Number": inv.invoiceNumber || "",
        "Job Number": inv.jobNumber || "",
        Client: inv.clientName || "",
        Date: inv.createdAt
          ? new Date(inv.createdAt).toLocaleDateString("en-GB")
          : "",
        Currency: inv.currency || "",
        Total: Number(inv.total || 0),
        Paid: Number(inv.paidAmount || 0),
        Balance: Number(inv.balance || 0),
        Status: status.label,
        Country: inv.country || "",
        "Tax %":
          inv.taxPercent != null
            ? inv.taxPercent
            : deriveTaxFromCountry(inv.country),
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices.xlsx");
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="card">
        <div className="card-inner flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="pill mb-2 w-fit">Billing & Invoices</p>
            <h2 className="text-lg md:text-xl font-semibold">Billing Panel</h2>
            <p className="text-xs text-slate-500">
              Review invoices, record payments, export PDFs and Excel reports.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="hidden md:block">
              <input
                className="input"
                placeholder="Search invoice / job / client"
              />
            </div>
            <button
              onClick={exportToXlsx}
              className="btn btn-primary flex items-center justify-center gap-1 text-xs"
            >
              <FileText className="w-4 h-4" />
              Export XLSX
            </button>
          </div>
        </div>
      </div>

      {/* KPI STRIP – WHITE + ORANGE */}
      <div className="card overflow-hidden">
        <div className="card-inner bg-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Invoices */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {totalInvoices.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">
                  Invoices Issued
                </div>
                <div className="text-[10px] text-orange-600 mt-1">
                  {totalInvoices > 0 ? "Active billing" : "No invoices yet"}
                </div>
              </div>
              <ProgressRing value={100} />
            </div>

            {/* Total Billed */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {totalBilled.toFixed(3)}
                </div>
                <div className="text-[11px] text-slate-500">Total Billed</div>
                <div className="text-[10px] text-orange-600 mt-1">
                  Collected {paidPercent.toFixed(1)}%
                </div>
              </div>
              <ProgressRing value={paidPercent} />
            </div>

            {/* Total Paid */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {totalPaid.toFixed(3)}
                </div>
                <div className="text-[11px] text-slate-500">Total Paid</div>
                <div className="text-[10px] text-orange-600 mt-1">
                  Cash received
                </div>
              </div>
              <ProgressRing value={paidPercent} />
            </div>

            {/* Outstanding */}
            <div className="flex items-center justify-between rounded-2xl bg-orange-50 border border-orange-100 px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {totalBalance.toFixed(3)}
                </div>
                <div className="text-[11px] text-slate-500">
                  Outstanding Balance
                </div>
                <div className="text-[10px] text-orange-600 mt-1">
                  Due {outstandingPercent.toFixed(1)}%
                </div>
              </div>
              <ProgressRing value={outstandingPercent} />
            </div>
          </div>
        </div>
      </div>

      {/* INVOICE LIST */}
      <div className="card">
        <div className="card-inner">
          {loading ? (
            <div className="py-8 text-center text-slate-500">
              Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No invoices found.
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((inv) => {
                const status = paymentStatus(inv);
                const taxPercent =
                  inv.taxPercent != null
                    ? inv.taxPercent
                    : deriveTaxFromCountry(inv.country);
                return (
                  <article
                    key={inv._id}
                    className="border rounded-2xl p-4 md:p-5 bg-white flex flex-col gap-4"
                  >
                    <div>
                      <div className="font-semibold text-base">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        <div>Job: {inv.jobNumber || "—"}</div>
                        <div>{inv.clientName || "Client"}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString()
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                      <div>
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="font-semibold">
                          {(inv.total ?? 0).toFixed(3)} {inv.currency}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Paid</div>
                        <div className="font-semibold">
                          {(inv.paidAmount ?? 0).toFixed(3)} {inv.currency}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Balance</div>
                        <div className="font-semibold">
                          {(inv.balance ?? 0).toFixed(3)} {inv.currency}
                        </div>
                      </div>

                      {/* Uncomment if you want tax% here */}
                      {/* <div>
                        <div className="text-xs text-slate-500">Tax %</div>
                        <div className="font-semibold">{taxPercent}%</div>
                      </div> */}
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full w-fit text-xs font-semibold ${status.classes}`}
                    >
                      {status.label}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        onClick={() => openAddPayment(inv)}
                        className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" /> Add Payment
                      </button>

                      <button
                        onClick={() => openEditCharges(inv)}
                        className="btn btn-outline text-xs px-3 py-1.5"
                      >
                        <PlusCircle className="w-4 h-4" /> Edit Charges
                      </button>

                      <button
                        onClick={() => openPdf(inv)}
                        className="btn btn-outline text-xs px-3 py-1.5"
                      >
                        <FileText className="w-4 h-4" /> PDF
                      </button>

                      <button
                        onClick={() => askDelete(inv)}
                        className="btn text-xs px-3 py-1.5 text-rose-600 border"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {editOpen && editInvoiceFull && (
        <EditChargesModal
          open={editOpen}
          invoice={editInvoiceFull}
          api={api}
          onClose={() => {
            setEditOpen(false);
            setEditInvoiceFull(null);
          }}
          onSave={(summary) => {
            handleEditSaved(summary);
            setEditOpen(false);
            setEditInvoiceFull(null);
          }}
        />
      )}

      {paymentOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold">Add Payment</h3>
                <p className="text-xs text-slate-500">
                  Invoice {paymentInvoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setPaymentOpen(false)}
                className="p-2 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-600">
                Balance due:{" "}
                <strong>
                  {(paymentInvoice.balance ?? 0).toFixed(3)}{" "}
                  {paymentInvoice.currency}
                </strong>
              </p>
              <label className="block text-sm mt-3">Amount</label>
              <input
                type="number"
                step="0.001"
                className="input mt-1"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-outline"
                onClick={() => setPaymentOpen(false)}
                disabled={payLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={doAddPayment}
                disabled={payLoading}
              >
                {payLoading ? "Saving..." : "Record payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">
              Delete invoice {confirmDelete.invoiceNumber}?
            </h3>
            <p className="text-sm text-slate-600 mt-2">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="btn btn-outline"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={doDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
