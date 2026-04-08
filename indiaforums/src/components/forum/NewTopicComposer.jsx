import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createTopic } from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import styles from './NewTopicComposer.module.css';

/**
 * Modal for creating a new forum topic.
 *
 * @param {object} props
 * @param {object} props.forum                 the forum being posted into ({ id, name })
 * @param {Array}  [props.flairs]              optional flair list ([{ id, name, bgColor }])
 * @param {Function} props.onClose             called when user cancels / closes
 * @param {Function} [props.onCreated]         called with the new topic id (or response) on success
 */
export default function NewTopicComposer({ forum, flairs = [], onClose, onCreated }) {
  const { isAuthenticated } = useAuth();

  const [subject, setSubject]               = useState('');
  const [message, setMessage]               = useState('');
  const [flairId, setFlairId]               = useState('');
  const [addToWatchList, setAddToWatchList] = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState(null);

  const canSubmit =
    isAuthenticated &&
    subject.trim().length >= 3 &&
    message.trim().length >= 5 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createTopic({
        forumId: forum.id,
        subject: subject.trim(),
        message: message.trim(),
        flairId: flairId ? Number(flairId) : undefined,
        addToWatchList,
      });
      const newId =
        res?.data?.topicId ??
        res?.data?.id ??
        res?.data?.data?.topicId ??
        null;
      onCreated?.(newId, res?.data);
      onClose?.();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create topic. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>New Topic in {forum?.name || 'Forum'}</div>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={styles.body}>
          {!isAuthenticated && (
            <div className={styles.error}>You need to sign in to create a topic.</div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Subject</label>
            <input
              className={styles.input}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's your topic about?"
              maxLength={200}
              disabled={submitting}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Message</label>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts…"
              disabled={submitting}
            />
          </div>

          {flairs.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Flair (optional)</label>
              <select
                className={styles.select}
                value={flairId}
                onChange={(e) => setFlairId(e.target.value)}
                disabled={submitting}
              >
                <option value="">None</option>
                {flairs.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={addToWatchList}
              onChange={(e) => setAddToWatchList(e.target.checked)}
              disabled={submitting}
            />
            Notify me of new replies
          </label>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnGhost} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? 'Posting…' : 'Post Topic'}
          </button>
        </div>
      </div>
    </div>
  );
}
