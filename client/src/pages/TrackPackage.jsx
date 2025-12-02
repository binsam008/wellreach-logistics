import { useState } from "react";
import { Search } from "lucide-react";
import ShipmentProgressTimeline from "../components/ShipmentProgressTimeline";

export default function TrackPackage() {
  const [trackingId, setTrackingId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingId.trim()) return alert("Please enter a Tracking ID");

    try {
      setLoading(true);
      setResult(null);

      const res = await fetch(
        `http://localhost:5000/track/${encodeURIComponent(
          trackingId.trim()
        )}`
      );

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch tracking info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16">
      <div className="max-w-xl mx-auto">
        <div className="card">
          <div className="card-inner space-y-6">

            {/* Header */}
            <div>
              <h1 className="section-title mb-2 text-center">Track Your Shipment</h1>
              <p className="section-subtitle text-center">
                Enter your tracking ID to view live shipment status & updates.
              </p>
            </div>

            {/* Tracking Input */}
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Enter Tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
              />
              <button
                className="btn btn-primary whitespace-nowrap"
                onClick={handleTrack}
                disabled={loading}
              >
                <Search className="w-4 h-4" />
                {loading ? "Tracking..." : "Track"}
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="mt-4 space-y-4">

                {/* Not Found */}
                {!result.found && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/40 p-4 text-sm text-red-600 dark:text-red-300">
                    ❌ No shipment found with this Tracking ID.
                  </div>
                )}

                {/* Shipment Details */}
                {result.found && (
                  <>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 text-sm space-y-1 shadow-sm">
                      <p><span className="font-semibold">Tracking ID:</span> {result.id}</p>
                      <p><span className="font-semibold">Customer:</span> {result.customer}</p>
                      <p><span className="font-semibold">Current Status:</span> {result.status}</p>
                      <p><span className="font-semibold">Route:</span> {result.route}</p>
                      <p><span className="font-semibold">Driver:</span> {result.driver}</p>
                      <p><span className="font-semibold">Truck:</span> {result.truck}</p>
                      {/* <p><span className="font-semibold">Cost:</span> ₹{result.cost}</p>
                      <p><span className="font-semibold">Sale:</span> ₹{result.sale}</p> */}
                      {result.createdAt && (
                        <p>
                          <span className="font-semibold">Created:</span>{" "}
                          {new Date(result.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                    </div>

                    {/* Timeline */}
                    <ShipmentProgressTimeline status={result.status} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
