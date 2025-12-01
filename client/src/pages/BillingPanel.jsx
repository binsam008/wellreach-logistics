import { useEffect, useMemo, useState } from "react";
import api from "../api";
import {
  FileText,
  Download,
  Loader2,
  Filter,
  Search,
  IndianRupee,
  PlusCircle,
  X,
} from "lucide-react";

const STATUS_OPTIONS = ["all", "draft", "unbilled", "billed"];

const formatCurrency = (value, currency = "BHD") => {
  if (value == null) return `0.000 ${currency}`;
  return `${Number(value).toFixed(3)} ${currency}`;
};

export default function BillingPanel() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // payment modal state
  const [paymentTarget, setPaymentTarget] = useState(null); // invoice summary object or null
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paying, setPaying] = useState(false);

  // Load invoices
  useEffect(() => {
    let isMounted = true;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/invoices");
        if (!isMounted) return;
        setInvoices(res.data || []);
      } catch (err) {
        console.error("Load invoices error:", err);
        if (isMounted)
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Failed to load invoices"
          );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInvoices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter + search
  const filteredInvoices = useMemo(() => {
    return (invoices || [])
      .filter((inv) => {
        if (statusFilter === "all") return true;
        return (inv.status || "").toLowerCase() === statusFilter;
      })
      .filter((inv) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          (inv.invoiceNumber || "").toLowerCase().includes(q) ||
          (inv.jobNumber || "").toLowerCase().includes(q) ||
          (inv.clientName || "").toLowerCase().includes(q)
        );
      });
  }, [invoices, statusFilter, query]);

  // Summary totals
  const totals = useMemo(() => {
    const t = {
      count: invoices.length,
      billed: 0,
      draft: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalBalance: 0,
      currency: invoices[0]?.currency || "BHD",
    };
    invoices.forEach((inv) => {
      const s = (inv.status || "").toLowerCase();
      if (s === "billed") t.billed += 1;
      if (s === "draft") t.draft += 1;
      const total = Number(inv.total || 0);
      const paid = Number(inv.paidAmount || 0);
      const balance = Number(inv.balance || total - paid);
      t.totalAmount += total;
      t.totalPaid += paid;
      t.totalBalance += balance;
    });
    return t;
  }, [invoices]);

  // PDF open with auth
  const openPdf = async (inv) => {
    try {
      const res = await api.get(`/invoices/${inv._id}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("PDF open error:", err);
      alert(
        "Failed to open PDF: " +
          (err.response?.data?.message ||
            err.response?.data?.error ||
            "Unknown server error")
      );
    }
  };

  // open payment modal
  const startPayment = (inv) => {
    const balance = Number(inv.balance || inv.total - inv.paidAmount || 0);
    setPaymentTarget(inv);
    setPaymentAmount(balance > 0 ? String(balance.toFixed(3)) : "");
  };

  const closePaymentModal = () => {
    setPaymentTarget(null);
    setPaymentAmount("");
    setPaying(false);
  };

  const confirmPayment = async () => {
    if (!paymentTarget) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      alert("Enter a valid payment amount");
      return;
    }

    const max = Number(
      paymentTarget.balance ||
        paymentTarget.total - paymentTarget.paidAmount ||
        0
    );
    if (amt > max) {
      if (
        !window.confirm(
          `Entered amount is more than current balance (${formatCurrency(
            max,
            paymentTarget.currency
          )}). It will be capped to the balance. Continue?`
        )
      ) {
        return;
      }
    }

    try {
      setPaying(true);
      const res = await api.put(`/invoices/${paymentTarget._id}/pay`, {
        amount: amt,
      });

      const updated = res.data; // summary shape
      setInvoices((prev) =>
        prev.map((inv) => (inv._id === updated._id ? updated : inv))
      );

      closePaymentModal();
      alert("Payment recorded");
    } catch (err) {
      console.error("Payment error:", err);
      alert(
        "Failed to record payment: " +
          (err.response?.data?.message ||
            err.response?.data?.error ||
            "Unknown server error")
      );
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / summary */}
      <div className="card">
        <div className="card-inner flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="pill mb-2 w-fit">
              <FileText className="w-3 h-3" />
              Billing & Invoices
            </p>
            <h2 className="text-lg md:text-xl font-semibold">Billing Panel</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review invoices, record payments and export PDFs for clients.
            </p>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-3 gap-2 text-xs md:text-[13px]">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
              <p className="text-slate-500 dark:text-slate-400">
                Total Invoices
              </p>
              <p className="font-semibold">{totals.count}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 px-3 py-2">
              <p className="text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Paid
              </p>
              <p className="font-semibold truncate">
                {formatCurrency(totals.totalPaid, totals.currency)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 px-3 py-2">
              <p className="text-blue-600 dark:text-blue-300 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Balance
              </p>
              <p className="font-semibold truncate">
                {formatCurrency(totals.totalBalance, totals.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + search */}
      <div className="card">
        <div className="card-inner space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-4 h-4" />
              <span>Filter invoices</span>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {/* Status buttons */}
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs md:text-[13px] ${
                      statusFilter === s
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : "bg-transparent text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {s === "all"
                      ? "All"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Search invoice / job / client"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Loading / error */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading invoices…
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          {/* Empty state */}
          {!loading && filteredInvoices.length === 0 && !error && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No invoices found for this filter.
            </p>
          )}

          {/* Invoices list */}
          {!loading && filteredInvoices.length > 0 && (
            <div className="space-y-2">
              {filteredInvoices.map((inv) => {
                const currency = inv.currency || "BHD";
                const total = Number(inv.total || 0);
                const paid = Number(inv.paidAmount || 0);
                const balance = Number(inv.balance || total - paid);

                const paymentStatus =
                  balance <= 0
                    ? "PAID"
                    : paid > 0
                    ? "PARTIAL"
                    : "UNPAID";

                const paymentStatusClass =
                  paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-700"
                    : paymentStatus === "PARTIAL"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700";

                return (
                  <div
                    key={inv._id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 px-3 py-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm md:text-[15px]">
                          {inv.invoiceNumber || "INV-XXXX"}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Job: {inv.jobNumber || "N/A"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
                        <span>{inv.clientName || "Client Name"}</span>
                        <span>•</span>
                        <span>
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString(
                                "en-IN"
                              )
                            : ""}
                        </span>
                      </div>

                      {/* payment summary like in PDF */}
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        <div className="flex justify-between max-w-xs">
                          <span>Total</span>
                          <span>{formatCurrency(total, currency)}</span>
                        </div>
                        <div className="flex justify-between max-w-xs">
                          <span>Paid</span>
                          <span>{formatCurrency(paid, currency)}</span>
                        </div>
                        <div className="flex justify-between max-w-xs">
                          <span>Balance due</span>
                          <span>{formatCurrency(balance, currency)}</span>
                        </div>
                        <div className="flex justify-between max-w-xs font-semibold">
                          <span>Total Due</span>
                          <span>{formatCurrency(total, currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end min-w-[260px]">
                      {/* Payment status badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold ${paymentStatusClass}`}
                      >
                        {paymentStatus}
                      </span>

                      {/* Add payment button */}
                      <button
                        className="btn btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
                        onClick={() => startPayment(inv)}
                        disabled={balance <= 0}
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add Payment
                      </button>

                      {/* PDF button */}
                      <button
                        className="btn btn-outline text-xs px-3 py-1.5"
                        onClick={() => openPdf(inv)}
                      >
                        <FileText className="w-3 h-3" />
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {paymentTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                Add Payment – {paymentTarget.invoiceNumber}
              </h3>
              <button
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={closePaymentModal}
                disabled={paying}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>
                <span className="font-semibold">Client:</span>{" "}
                {paymentTarget.clientName}
              </p>
              <p>
                <span className="font-semibold">Total:</span>{" "}
                {formatCurrency(
                  paymentTarget.total,
                  paymentTarget.currency
                )}
              </p>
              <p>
                <span className="font-semibold">Paid:</span>{" "}
                {formatCurrency(
                  paymentTarget.paidAmount,
                  paymentTarget.currency
                )}
              </p>
              <p>
                <span className="font-semibold">Balance:</span>{" "}
                {formatCurrency(
                  paymentTarget.balance ||
                    paymentTarget.total - paymentTarget.paidAmount,
                  paymentTarget.currency
                )}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Payment Amount ({paymentTarget.currency})
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <p className="text-[11px] text-slate-400">
                Tip: enter the remaining balance to mark invoice as fully paid.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn btn-outline text-xs"
                onClick={closePaymentModal}
                disabled={paying}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary text-xs"
                onClick={confirmPayment}
                disabled={paying}
              >
                {paying ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
