import { CheckCircle, Circle } from "lucide-react";

export default function ShipmentProgressTimeline({ status }) {
  // Ordered delivery timeline phases
  const steps = [
    "DOCUMENT RECEIVED",
    "DOCUMENT PROCESSING",
    "APPROVALS PENDING",
    "APPROVALS PAYMENT DONE",
    "CDF PREPARED",
    "UNDER CLEARANCE DOCUMENTATION",
    "CDF PAYMENT PENDING",
    "DUTY & VAT PAYMENT DONE",
    "UNDER CLEARANCE",
    "CLEARANCE COMPLETED",
    "DELIVERED AT PLACE",
  ];

  const currentIndex = steps.indexOf(status);

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">
        Shipment Progress
      </h2>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute top-0 left-2 w-1 h-full bg-slate-200 dark:bg-slate-700 rounded-full"></div>

        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;

          return (
            <div key={step} className="flex items-start mb-6 relative">
              {/* Bullet */}
              <div className="absolute -left-1.5">
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-green-500 animate-scale-in" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              {/* Step info */}
              <div className={`ml-6 ${isCompleted ? "opacity-100" : "opacity-50"}`}>
                <p
                  className={`font-medium text-sm ${
                    isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {step}
                </p>
                {isCompleted && index === currentIndex && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Current step
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>
        {`
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes scaleIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        `}
      </style>
    </div>
  );
}
