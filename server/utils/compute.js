// server/utils/compute.js
function computeFinal(job) {
  const base = Number(job.baseCost || 0);
  const extras = (job.extraCosts || []).reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );
  const cost = base + extras;
  const saleBefore = cost * (1 + (Number(job.markupPercent || 0) / 100));
  const finalSale = saleBefore - Number(job.discount || 0);
  return {
    finalCost: Number(cost.toFixed(2)),
    finalSale: Number(finalSale.toFixed(2)),
  };
}

function calculateTax(amount, percent = 0) {
  return Number((amount * (percent / 100)).toFixed(2));
}

module.exports = { computeFinal, calculateTax };
