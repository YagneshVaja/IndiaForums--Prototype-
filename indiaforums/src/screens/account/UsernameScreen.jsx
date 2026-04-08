import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as profileApi from '../../services/userProfileApi';
import { checkUsername } from '../../services/authApi';
import { timeAgo, extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './UsernameScreen.module.css';

export default function UsernameScreen({ onBack }) {
  const { user, updateUser } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  // Live availability check
  const [availability, setAvailability] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [checkTimer, setCheckTimer] = useState(null);

  function handleChange(value) {
    setNewUsername(value);
    setError(null);
    setSuccess('');
    setAvailability(null);

    if (checkTimer) clearTimeout(checkTimer);

    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 3 || trimmed === user?.userName) {
      return;
    }

    const timer = setTimeout(async () => {
      setAvailability('checking');
      try {
        const res = await checkUsername(trimmed);
        setAvailability(res.data?.isAvailable !== false ? 'available' : 'taken');
      } catch {
        setAvailability(null);
      }
    }, 500);
    setCheckTimer(timer);
  }

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setError('Username is required');
      return;
    }
    if (trimmed.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (trimmed === user?.userName) {
      setError('This is already your username');
      return;
    }
    if (availability === 'taken') {
      setError('This username is not available');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      await profileApi.updateMyUsername({ newUsername: trimmed });
      updateUser({ userName: trimmed });
      setSuccess('Username updated successfully');
      setNewUsername('');
      setAvailability(null);
    } catch (err) {
      console.error('Username update error:', err.response?.status, err.response?.data);
      // ASP.NET model-binding errors land under errors.userName[0]; check that first.
      const validationErr = err.response?.data?.errors?.userName?.[0];
      setError(validationErr || extractApiError(err, 'Failed to update username'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Username</h1>
      </div>

      <div className={styles.content}>
        {/* Current username */}
        <div className={styles.currentSection}>
          <div className={styles.currentLabel}>Current Username</div>
          <div className={styles.currentValue}>@{user?.userName || '—'}</div>
        </div>

        {/* Change form */}
        <form className={styles.form} onSubmit={handleSave}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-username">New Username</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputPrefix}>@</span>
              <input
                id="new-username"
                className={styles.input}
                type="text"
                placeholder="Enter new username"
                value={newUsername}
                onChange={(e) => handleChange(e.target.value)}
                maxLength={30}
                autoComplete="off"
              />
            </div>
            {availability === 'checking' && (
              <span className={styles.hintChecking}>Checking availability...</span>
            )}
            {availability === 'available' && (
              <span className={styles.hintAvailable}>Username is available</span>
            )}
            {availability === 'taken' && (
              <span className={styles.hintTaken}>Username is taken</span>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button
            className={styles.saveBtn}
            type="submit"
            disabled={saving || availability === 'checking' || availability === 'taken'}
          >
            {saving ? 'Updating...' : 'Change Username'}
          </button>
        </form>

        {/* History */}
        <UsernameHistory />
      </div>
    </div>
  );
}

/* ── Username Change History ──────────────────────────────────────────────── */
function UsernameHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileApi.getMyUsernameHistory();
      const items = res.data?.items || res.data?.history || res.data || [];
      setHistory(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load history'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className={styles.historySection}>
      <div className={styles.historyTitle}>Change History</div>
      {loading ? <LoadingState variant="card" count={2} />
        : error ? <ErrorState message={error} onRetry={load} />
        : !history.length ? <EmptyState message="No username changes yet" />
        : (
          <div className={styles.historyList}>
            {history.map((item, i) => (
              <div key={item.id || i} className={styles.historyItem}>
                <div className={styles.historyNames}>
                  <span className={styles.historyOld}>{item.oldUserName || item.previousUsername}</span>
                  <span className={styles.historyArrow}>→</span>
                  <span className={styles.historyNew}>{item.newUserName || item.newUsername}</span>
                </div>
                {(item.changedAt || item.createdAt) && (
                  <div className={styles.historyTime}>{timeAgo(item.changedAt || item.createdAt)}</div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
