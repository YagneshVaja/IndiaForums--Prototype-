import { useState } from 'react';
import { forgotPassword } from '../../services/authApi';
import { extractApiError } from '../../services/api';
import styles from './ForgotPasswordScreen.module.css';

export default function ForgotPasswordScreen({ onNavigate }) {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(extractApiError(err, 'Failed to send reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={styles.screen}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Check Your Email</h2>
          <p className={styles.successText}>
            We've sent a password reset link to <strong>{email}</strong>.
            Check your inbox and follow the instructions.
          </p>
          <button
            className={styles.backBtn}
            type="button"
            onClick={() => onNavigate('login')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className={styles.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
            autoComplete="email"
          />
        </div>

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className={styles.footer}>
        Remember your password?{' '}
        <button
          className={styles.linkBtn}
          type="button"
          onClick={() => onNavigate('login')}
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
