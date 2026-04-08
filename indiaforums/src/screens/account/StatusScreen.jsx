import { useState, useEffect } from 'react';
import * as profileApi from '../../services/userProfileApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import styles from './StatusScreen.module.css';

const STATUS_OPTIONS = [
  { value: 'online',  label: 'Online',         desc: 'Available to chat',         color: 'var(--success)' },
  { value: 'away',    label: 'Away',           desc: 'You may be slow to reply',  color: 'var(--amber)' },
  { value: 'busy',    label: 'Busy',           desc: 'Do not disturb',            color: 'var(--error)' },
  { value: 'invisible', label: 'Invisible',    desc: 'Appear offline to others',  color: 'var(--text3)' },
];

export default function StatusScreen({ onBack }) {
  const [status, setStatus] = useState('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await profileApi.getMyStatus();
        const d = res.data || {};
        setStatus(d.status || 'online');
        setStatusMessage(d.statusMessage || d.message || '');
      } catch (err) {
        console.error('Status load error:', err.response?.status, err.response?.data);
        setFetchError(extractApiError(err, 'Failed to load status'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleSelect(value) {
    setStatus(value);
    setError(null);
    setSuccess('');
  }

  function handleMessageChange(e) {
    setStatusMessage(e.target.value);
    setError(null);
    setSuccess('');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      await profileApi.updateMyStatus({ status, statusMessage: statusMessage.trim() });
      setSuccess('Status updated successfully');
    } catch (err) {
      console.error('Status save error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to update status'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>← Back</button>
          <h1 className={styles.title}>Status</h1>
        </div>
        <div className={styles.content}>
          <LoadingState variant="card" count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Status</h1>
      </div>

      <div className={styles.content}>
        {fetchError && <div className={styles.warning}>{fetchError}</div>}

        {/* Current selection preview */}
        <div className={styles.preview}>
          <span
            className={styles.previewDot}
            style={{ background: STATUS_OPTIONS.find((o) => o.value === status)?.color }}
          />
          <div className={styles.previewInfo}>
            <div className={styles.previewLabel}>
              {STATUS_OPTIONS.find((o) => o.value === status)?.label || 'Online'}
            </div>
            {statusMessage && <div className={styles.previewMessage}>{statusMessage}</div>}
          </div>
        </div>

        {/* Status options */}
        <div className={styles.sectionLabel}>Set Status</div>
        <div className={styles.optionList}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`${styles.option} ${status === opt.value ? styles.optionActive : ''}`}
              onClick={() => handleSelect(opt.value)}
              type="button"
            >
              <span className={styles.optionDot} style={{ background: opt.color }} />
              <div className={styles.optionInfo}>
                <div className={styles.optionLabel}>{opt.label}</div>
                <div className={styles.optionDesc}>{opt.desc}</div>
              </div>
              {status === opt.value && <span className={styles.optionCheck}>✓</span>}
            </button>
          ))}
        </div>

        {/* Custom message */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="status-message">Status Message</label>
          <input
            id="status-message"
            className={styles.input}
            type="text"
            placeholder="What's on your mind?"
            value={statusMessage}
            onChange={handleMessageChange}
            maxLength={100}
          />
          <span className={styles.hint}>{statusMessage.length}/100</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Status'}
        </button>
      </div>
    </div>
  );
}
