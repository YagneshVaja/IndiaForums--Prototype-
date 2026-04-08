import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { checkUsername, checkEmail } from '../../services/authApi';
import { extractApiError } from '../../services/api';
import styles from './RegisterScreen.module.css';

export default function RegisterScreen({ onNavigate }) {
  const { register } = useAuth();
  const [form, setForm]       = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  // Live availability checks
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [emailStatus, setEmailStatus]       = useState(null);
  const usernameTimer = useRef(null);
  const emailTimer    = useRef(null);

  /* ── Debounced username check ──────────────────────────────────────────── */
  useEffect(() => {
    clearTimeout(usernameTimer.current);
    if (!form.username || form.username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await checkUsername(form.username);
        const available = res.data?.available ?? res.data?.isAvailable ?? res.data === true;
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus(null);
      }
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [form.username]);

  /* ── Debounced email check ─────────────────────────────────────────────── */
  useEffect(() => {
    clearTimeout(emailTimer.current);
    if (!form.email || !form.email.includes('@')) {
      setEmailStatus(null);
      return;
    }
    setEmailStatus('checking');
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await checkEmail(form.email);
        const available = res.data?.available ?? res.data?.isAvailable ?? res.data === true;
        setEmailStatus(available ? 'available' : 'taken');
      } catch {
        setEmailStatus(null);
      }
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [form.email]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
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
    if (usernameStatus === 'taken') {
      setError('Username is already taken');
      return;
    }
    if (emailStatus === 'taken') {
      setError('Email is already registered');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await register({
        userName: form.username,
        email:    form.email,
        password: form.password,
      });
      onNavigate('verify-email');
    } catch (err) {
      setError(extractApiError(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function statusClass(status) {
    if (status === 'available') return styles.statusOk;
    if (status === 'taken')     return styles.statusBad;
    if (status === 'checking')  return styles.statusCheck;
    return '';
  }

  function statusText(status, label) {
    if (status === 'checking')  return 'Checking...';
    if (status === 'available') return `${label} is available`;
    if (status === 'taken')     return `${label} is already taken`;
    return '';
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.logo}>IF</div>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>Join the IndiaForums community</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-username">Username</label>
          <input
            id="reg-username"
            className={styles.input}
            type="text"
            name="username"
            placeholder="Choose a username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
          />
          {usernameStatus && (
            <span className={`${styles.status} ${statusClass(usernameStatus)}`}>
              {statusText(usernameStatus, 'Username')}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            className={styles.input}
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {emailStatus && (
            <span className={`${styles.status} ${statusClass(emailStatus)}`}>
              {statusText(emailStatus, 'Email')}
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
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
          <label className={styles.label} htmlFor="reg-confirm">Confirm Password</label>
          <input
            id="reg-confirm"
            className={styles.input}
            type="password"
            name="confirmPassword"
            placeholder="Re-enter password"
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className={styles.footer}>
        Already have an account?{' '}
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
