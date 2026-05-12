import { stripHtml, timeAgo } from './format';

describe('stripHtml', () => {
  test('strips simple HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });
  test('decodes common HTML entities', () => {
    expect(stripHtml('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(stripHtml('Quote: &quot;hi&quot;')).toBe('Quote: "hi"');
  });
  test('handles null/empty input', () => {
    expect(stripHtml('')).toBe('');
    expect(stripHtml(null as unknown as string)).toBe('');
    expect(stripHtml(undefined as unknown as string)).toBe('');
  });
  test('collapses whitespace', () => {
    expect(stripHtml('  hello   world  ')).toBe('hello world');
  });
});

describe('timeAgo', () => {
  const NOW = new Date('2026-05-12T12:00:00Z').getTime();
  const real = Date.now;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = () => NOW;
  });
  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Date as any).now = real;
  });

  test('returns empty string for null/empty', () => {
    expect(timeAgo('')).toBe('');
    expect(timeAgo(null as unknown as string)).toBe('');
  });
  test('shows minutes for recent past', () => {
    const t = new Date(NOW - 5 * 60_000).toISOString();
    expect(timeAgo(t)).toBe('5m ago');
  });
  test('shows hours for same-day past', () => {
    const t = new Date(NOW - 3 * 3600_000).toISOString();
    expect(timeAgo(t)).toBe('3h ago');
  });
});
