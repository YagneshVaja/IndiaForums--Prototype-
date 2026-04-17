import { useState } from 'react';
import { login } from '../../services/authApi';
import { setTokens, setStoredUser } from '../../services/tokenStorage';
import { extractApiError } from '../../services/api';
import styles from './LoginScreen.module.css';

export default function LoginScreen({ onBack, onSuccess, onGoRegister }) {
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userName.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await login({ userName: userName.trim(), password });
      const { accessToken, refreshToken, userId, userName: uName, email, displayName } = res.data;
      setTokens(accessToken, refreshToken);
      setStoredUser({ userId, userName: uName, email, displayName });
      onSuccess();
    } catch (err) {
      setError(extractApiError(err, 'Invalid username or password. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.headingBlock}>
          <p className={styles.heading}>Welcome back</p>
          <p className={styles.subheading}>Sign in to continue to IndiaForums</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-username">Username or Email</label>
            <input
              id="login-username"
              className={styles.input}
              type="text"
              placeholder="Enter your username or email"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="login-password">Password</label>
              <button
                type="button"
                className={styles.forgotLink}
                onClick={() => {}}
              >
                Forgot password?
              </button>
            </div>
            <div className={styles.passwordWrap}>
              <input
                id="login-password"
                className={styles.input}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Sign In'}
          </button>
        </form>
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          New to IndiaForums?{' '}
          <button className={styles.switchLink} onClick={onGoRegister}>
            Create Account
          </button>
        </p>
      </div>
    </div>
  );
}
