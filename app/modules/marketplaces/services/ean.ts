export function normalizeEan(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Validates the GS1 check digit for GTIN-8, UPC-A, EAN-13 and GTIN-14. */
export function isValidEan(value: unknown) {
  const ean = normalizeEan(value);
  if (![8, 12, 13, 14].includes(ean.length) || /^0+$/.test(ean)) return false;

  const digits = [...ean].map(Number);
  const checkDigit = digits.pop();
  const weighted = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (weighted % 10)) % 10 === checkDigit;
}
