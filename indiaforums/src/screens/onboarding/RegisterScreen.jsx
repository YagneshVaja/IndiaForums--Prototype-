import { useState } from 'react';
import { register, checkUsername, checkEmail } from '../../services/authApi';
import { setTokens, setStoredUser } from '../../services/tokenStorage';
import { extractApiError } from '../../services/api';
import styles from './RegisterScreen.module.css';

export default function RegisterScreen({ onBack, onSuccess, onGoLogin }) {
  const [displayName, setDisplayName] = useState('');
  const [userName, setUserName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  function clearFieldError(field) {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const errs = {};
    if (!userName.trim())  errs.userName = 'Username is required.';
    if (!email.trim())     errs.email    = 'Email is required.';
    if (!password)         errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setError('');
    setLoading(true);

    try {
      const res = await register({
        userName:    userName.trim(),
        email:       email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      const { accessToken, refreshToken, userId, userName: uName, email: uEmail, displayName: dName } = res.data;
      setTokens(accessToken, refreshToken);
      setStoredUser({ userId, userName: uName, email: uEmail, displayName: dName });
      onSuccess();
    } catch (err) {
      // Server-side field validation errors surface inside err.response.data.errors
      const data = err?.response?.data;
      if (data?.errors && typeof data.errors === 'object') {
        const serverErrs = {};
        // API validation keys match field names (case-insensitive)
        const keyMap = {
          username:    'userName',
          email:       'email',
          password:    'password',
          displayname: 'displayName',
        };
        Object.entries(data.errors).forEach(([k, msgs]) => {
          const mapped = keyMap[k.toLowerCase()] || k;
          serverErrs[mapped] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        if (Object.keys(serverErrs).length > 0) {
          setFieldErrors(serverErrs);
          setLoading(false);
          return;
        }
      }
      setError(extractApiError(err, 'Registration failed. Please try again.'));
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
          <img src="/iflogo.png" alt="IndiaForums" className={styles.logo} />
          <p className={styles.heading}>Join IndiaForums</p>
          <p className={styles.subheading}>Create your free account to get started</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-displayname">
              Display Name <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="reg-displayname"
              className={styles.input}
              type="text"
              placeholder="How should we call you?"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
              autoCapitalize="words"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className={`${styles.input} ${fieldErrors.userName ? styles.inputError : ''}`}
              type="text"
              placeholder="Choose a unique username"
              value={userName}
              onChange={e => { setUserName(e.target.value); clearFieldError('userName'); }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
            />
            {fieldErrors.userName && <p className={styles.fieldError}>{fieldErrors.userName}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); clearFieldError('email'); }}
              autoComplete="email"
              autoCapitalize="none"
            />
            {fieldErrors.email && <p className={styles.fieldError}>{fieldErrors.email}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reg-password">Password</label>
            <div className={styles.passwordWrap}>
              <input
                id="reg-password"
                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                type={showPwd ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); clearFieldError('password'); }}
                autoComplete="new-password"
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
            {fieldErrors.password && <p className={styles.fieldError}>{fieldErrors.password}</p>}
          </div>

          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? <span className={styles.spinner} /> : 'Create Account'}
          </button>

          <p className={styles.terms}>
            By creating an account you agree to our{' '}
            <span className={styles.termsLink}>Terms of Service</span>
            {' '}and{' '}
            <span className={styles.termsLink}>Privacy Policy</span>.
          </p>
        </form>
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Already have an account?{' '}
          <button className={styles.switchLink} onClick={onGoLogin}>
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
