// server/models/Invoice.js
const mongoose = require("mongoose");

const extraCostSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },

    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    clientName: { type: String, default: "" },
    clientAddress: { type: String, default: "" },
    clientGst: { type: String, default: "" },
    clientMobile: { type: String, default: "" },

    baseCost: { type: Number, default: 0 },
    extraCosts: { type: [extraCostSchema], default: [] },
    discount: { type: Number, default: 0 },

    finalCost: { type: Number, default: 0 },
    finalSale: { type: Number, default: 0 },

    taxPercent: { type: Number, default: 0 },

    currency: { type: String, default: "BHD" },
    paidAmount: { type: Number, default: 0 },

    status: { type: String, default: "billed" },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
