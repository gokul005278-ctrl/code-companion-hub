/**
 * Format a number with Indian numbering system (lakhs, crores)
 * e.g., 1234567 -> "12,34,567"
 */
export function formatIndianNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
  if (isNaN(n)) return '0';
  
  const isNegative = n < 0;
  const absNum = Math.abs(n);
  const [intPart, decPart] = absNum.toString().split('.');
  
  // Apply Indian grouping: last 3 digits, then groups of 2
  let result = '';
  if (intPart.length <= 3) {
    result = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${groups},${last3}`;
  }
  
  if (decPart) result += `.${decPart}`;
  return isNegative ? `-${result}` : result;
}

/**
 * Parse Indian formatted number string back to number
 */
export function parseIndianNumber(str: string): number {
  return parseFloat(str.replace(/,/g, '')) || 0;
}

/**
 * Format for display with ₹ prefix and color class
 */
export function getRupeeColorClass(amount: number): string {
  if (amount > 0) return 'text-success';
  if (amount < 0) return 'text-destructive';
  return 'text-muted-foreground';
}
