// Debug Service Fee Calculation
// Let's test with your example: estimatedFee = 284

console.log("=== SERVICE FEE CALCULATION DEBUG ===");

// Test with different service fee percentages
const testValues = [
  { estimatedFee: 284, serviceFeePercent: 3 },
  { estimatedFee: 284, serviceFeePercent: 5 },
  { estimatedFee: 384, serviceFeePercent: 3 },
  { estimatedFee: 384, serviceFeePercent: 5 },
];

testValues.forEach(({ estimatedFee, serviceFeePercent }) => {
  console.log(`\n--- Testing: estimatedFee=${estimatedFee}, serviceFeePercent=${serviceFeePercent}% ---`);
  
  // Current logic (reverse calculation)
  const totalWithServiceFee = estimatedFee;
  const subtotalFee = Math.floor(totalWithServiceFee / (1 + serviceFeePercent / 100));
  const serviceFee = totalWithServiceFee - subtotalFee;
  
  console.log(`Subtotal Fee: ${subtotalFee}`);
  console.log(`Service Fee: ${serviceFee}`);
  console.log(`Total: ${subtotalFee + serviceFee}`);
  console.log(`Verification: ${subtotalFee} + ${serviceFee} = ${subtotalFee + serviceFee} (should equal ${estimatedFee})`);
  
  // Check percentage accuracy
  const actualPercent = ((serviceFee / subtotalFee) * 100).toFixed(2);
  console.log(`Actual service fee %: ${actualPercent}% (should be ${serviceFeePercent}%)`);
});

console.log("\n=== POSSIBLE ISSUES ===");
console.log("1. Database serviceFeePercent might be 3 instead of 5");
console.log("2. estimatedFee might be calculated differently during booking vs display");
console.log("3. The 384 vs 284 difference suggests pricing calculation inconsistency");