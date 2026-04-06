export const TOP_TABS = [
  { id: 'forums',     label: 'Forums' },
  { id: 'all-topics', label: 'All Topics' },
];

export function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
