import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { resendVerification, confirmVerification } from '../../services/emailVerificationApi';
import { extractApiError } from '../../services/api';
import styles from './VerifyEmailScreen.module.css';

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyEmailScreen({ onNavigate }) {
  const { user, updateUser } = useAuth();
  const [code, setCode]           = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified]   = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const timerRef = useRef(null);

  /* ── Cooldown timer ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  /* ── Resend ────────────────────────────────────────────────────────────── */
  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await resendVerification();
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(extractApiError(err, 'Failed to resend. Try again later.'));
    } finally {
      setResending(false);
    }
  }

  /* ── Confirm ───────────────────────────────────────────────────────────── */
  async function handleConfirm(e) {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await confirmVerification({ code: code.trim() });
      // Update user with verified status if the API returns updated user
      if (res.data?.user) {
        updateUser(res.data.user);
      } else if (user) {
        updateUser({ ...user, emailVerified: true });
      }
      setVerified(true);
    } catch (err) {
      setError(extractApiError(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  /* ── Success state ─────────────────────────────────────────────────────── */
  if (verified) {
    return (
      <div className={styles.screen}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Email Verified</h2>
          <p className={styles.successText}>
            Your email has been verified successfully. You're all set!
          </p>
          <button
            className={styles.primaryBtn}
            type="button"
            onClick={() => onNavigate('login')}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.mailIcon}>✉</div>
        <h1 className={styles.title}>Verify Your Email</h1>
        <p className={styles.subtitle}>
          We've sent a verification code to{' '}
          <strong className={styles.emailHighlight}>{user?.email || 'your email'}</strong>.
          Enter the code below to verify your account.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleConfirm}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="verify-code">Verification Code</label>
          <input
            id="verify-code"
            className={styles.input}
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => { setCode(e.target.value); if (error) setError(''); }}
            autoComplete="one-time-code"
            inputMode="numeric"
          />
        </div>

        <button
          className={styles.primaryBtn}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div className={styles.resendSection}>
        <p className={styles.resendText}>Didn't receive the code?</p>
        <button
          className={styles.resendBtn}
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
        >
          {resending
            ? 'Sending...'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : 'Resend Code'}
        </button>
      </div>

      <p className={styles.footer}>
        <button
          className={styles.linkBtn}
          type="button"
          onClick={() => onNavigate('login')}
        >
          Back to Sign In
        </button>
      </p>
    </div>
  );
}
