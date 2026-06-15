/**
 * Format numeric amount to Indian Rupee (INR) currency style
 * @param {number|string} amount - Float/Numeric value
 * @returns {string} Formatted INR currency text
 */
export const formatINR = (amount) => {
  const numericVal = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(numericVal);
};
