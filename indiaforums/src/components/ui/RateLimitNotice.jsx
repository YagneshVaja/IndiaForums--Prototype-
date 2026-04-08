import { useState, useEffect } from 'react';
import { parseRetryAfter, formatRateLimitMessage } from '../../services/api';
import styles from './RateLimitNotice.module.css';

/**
 * RateLimitNotice — a friendly 429 surface with a live countdown.
 *
 * Pass the axios error directly so we can read the Retry-After header. The
 * component handles the countdown and re-enables the retry button when the
 * window has elapsed.
 *
 *   if (isRateLimitError(err)) {
 *     return <RateLimitNotice error={err} onRetry={refetch} />;
 *   }
 *
 * Falls back to a static message + immediately-enabled retry if no
 * Retry-After header is present.
 */
export default function RateLimitNotice({ error, onRetry }) {
  const initialSeconds = parseRetryAfter(error) ?? 0;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // While counting down, show the live remaining time; otherwise show the
  // generic message so the copy stays accurate even when there's no header.
  const message = secondsLeft > 0
    ? `Too many requests. You can try again in ${formatCountdown(secondsLeft)}.`
    : formatRateLimitMessage(error);

  const canRetry = secondsLeft <= 0 && Boolean(onRetry);

  return (
    <div className={styles.wrap} role="status">
      <div className={styles.icon}>⏱</div>
      <div className={styles.title}>Slow down a moment</div>
      <div className={styles.text}>{message}</div>
      {onRetry && (
        <button
          className={styles.retryBtn}
          onClick={onRetry}
          disabled={!canRetry}
        >
          {canRetry ? 'Try again' : `Retry in ${formatCountdown(secondsLeft)}`}
        </button>
      )}
    </div>
  );
}

function formatCountdown(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
