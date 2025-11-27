/**
 * Format số tiền theo định dạng Việt Nam: x.xxx.xxx
 * @param amount - Số tiền cần format
 * @returns Chuỗi đã format với dấu chấm phân cách hàng nghìn
 */
export function formatCurrency(amount: number | string): string {
  // Chuyển về số nguyên (bỏ phần thập phân .00)
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const roundedAmount = Math.round(numAmount);
  
  return roundedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format số tiền với đơn vị đ
 * @param amount - Số tiền cần format
 * @returns Chuỗi đã format: "x.xxx.xxx đ"
 */
export function formatCurrencyVND(amount: number | string): string {
  return `${formatCurrency(amount)} đ`;
}
