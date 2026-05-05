export function formatCount(n: number): string {
  if (n >= 1_000_000) return (Math.floor(n / 100_000) / 10) + 'M';
  if (n >= 1_000)     return (Math.floor(n / 100) / 10) + 'k';
  return String(n);
}

/**
 * Turn an ISO-3166 alpha-2 country code into its flag emoji.
 * Returns '' when the code is missing or malformed.
 */
export function countryFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1F1E6;
  const A = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => base + c.charCodeAt(0) - A),
  );
}
