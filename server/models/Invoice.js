// server/models/Invoice.js
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },

    // linked job
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    // client info
    clientName: String,
    clientAddress: String,
    clientGst: String,
    clientMobile: String,

    // money fields
    baseCost: { type: Number, default: 0 },
    extraCosts: [
      {
        label: String,
        amount: Number,
      },
    ],
    discount: { type: Number, default: 0 },

    finalCost: { type: Number, default: 0 }, // internal total cost
    finalSale: { type: Number, default: 0 }, // total billed to client

    // payments
    currency: { type: String, default: "BHD" },
    paidAmount: { type: Number, default: 0 }, // how much client has paid

    status: { type: String, default: "billed" }, // billed / draft / unbilled
    notes: String,
    terms: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
