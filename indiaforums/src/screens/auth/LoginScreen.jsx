import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { loginWithGoogle, loginWithFacebook, loginWithMicrosoft } from '../../services/socialAuth';
import { extractApiError } from '../../services/api';
import styles from './LoginScreen.module.css';

export default function LoginScreen({ onNavigate }) {
  const { login, externalLogin } = useAuth();
  const [form, setForm]       = useState({ userName: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'facebook' | 'microsoft' | null

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.userName || !form.password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login({ userName: form.userName, password: form.password });
    } catch (err) {
      setError(extractApiError(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider) {
    setSocialLoading(provider);
    setError('');
    try {
      const providerFns = {
        google:    loginWithGoogle,
        facebook:  loginWithFacebook,
        microsoft: loginWithMicrosoft,
      };
      const providerData = await providerFns[provider]();
      await externalLogin(providerData);
    } catch (err) {
      setError(extractApiError(err, err.message || `${provider} sign-in failed`));
    } finally {
      setSocialLoading(null);
    }
  }

  const isBusy = loading || !!socialLoading;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.logo}>IF</div>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your IndiaForums account</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-username">Email or Username</label>
          <input
            id="login-username"
            className={styles.input}
            type="text"
            name="userName"
            placeholder="Email or username"
            value={form.userName}
            onChange={handleChange}
            autoComplete="username"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            name="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
        </div>

        <button
          className={styles.forgotLink}
          type="button"
          onClick={() => onNavigate('forgot-password')}
        >
          Forgot password?
        </button>

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={isBusy}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.socialButtons}>
        <button
          className={styles.socialBtn}
          type="button"
          disabled={isBusy}
          onClick={() => handleSocialLogin('google')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24" width="18" height="18">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {socialLoading === 'google' ? 'Signing in...' : 'Google'}
        </button>

        <button
          className={styles.socialBtn}
          type="button"
          disabled={isBusy}
          onClick={() => handleSocialLogin('facebook')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24" width="18" height="18">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
          </svg>
          {socialLoading === 'facebook' ? 'Signing in...' : 'Facebook'}
        </button>

        <button
          className={styles.socialBtn}
          type="button"
          disabled={isBusy}
          onClick={() => handleSocialLogin('microsoft')}
        >
          <svg className={styles.socialIcon} viewBox="0 0 24 24" width="18" height="18">
            <path d="M1 1h10.5v10.5H1z" fill="#F25022"/>
            <path d="M12.5 1H23v10.5H12.5z" fill="#7FBA00"/>
            <path d="M1 12.5h10.5V23H1z" fill="#00A4EF"/>
            <path d="M12.5 12.5H23V23H12.5z" fill="#FFB900"/>
          </svg>
          {socialLoading === 'microsoft' ? 'Signing in...' : 'Microsoft'}
        </button>
      </div>

      <p className={styles.footer}>
        Don't have an account?{' '}
        <button
          className={styles.linkBtn}
          type="button"
          onClick={() => onNavigate('register')}
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}
