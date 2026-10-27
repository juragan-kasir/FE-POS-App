// Rupiah notes a customer is likely to hand over, smallest first.
const NOTES = [1000, 5000, 10000, 20000, 50000, 100000];

// Cash the customer is likely to hand over for `total`: the total rounded up
// to each note, deduped, above the exact amount, smallest first. The exact
// amount ("Uang Pas") is offered separately.
// e.g. 37.500 → [38.000, 40.000, 50.000, 100.000]
export const quickCashAmounts = (total, limit = 5) => {
  if (!(total > 0)) return [];
  const amounts = new Set();
  NOTES.forEach((note) => {
    const amount = Math.ceil(total / note) * note;
    if (amount > total) amounts.add(amount);
  });
  return [...amounts].sort((a, b) => a - b).slice(0, limit);
};
