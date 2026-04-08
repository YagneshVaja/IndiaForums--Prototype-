import { useState } from 'react';
import { resetPassword } from '../../services/authApi';
import { extractApiError } from '../../services/api';
import styles from './ResetPasswordScreen.module.css';

export default function ResetPasswordScreen({ onNavigate }) {
  const [form, setForm]       = useState({ token: '', password: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.token || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ token: form.token, password: form.password });
      setSuccess(true);
    } catch (err) {
      setError(extractApiError(err, 'Reset failed. The link may have expired.'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.screen}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.successTitle}>Password Reset</h2>
          <p className={styles.successText}>
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button
            className={styles.backBtn}
            type="button"
            onClick={() => onNavigate('login')}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter the reset code from your email and choose a new password.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-token">Reset Code</label>
          <input
            id="reset-token"
            className={styles.input}
            type="text"
            name="token"
            placeholder="Paste code from email"
            value={form.token}
            onChange={handleChange}
            autoComplete="one-time-code"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-password">New Password</label>
          <input
            id="reset-password"
            className={styles.input}
            type="password"
            name="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-confirm">Confirm Password</label>
          <input
            id="reset-confirm"
            className={styles.input}
            type="password"
            name="confirmPassword"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
          />
        </div>

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

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
