import { useState } from 'react';
import styles from './CreateTopicModal.module.css';
import { createForumTopic } from '../services/api';

export default function CreateTopicModal({ forumId, forumName, onClose, onCreated }) {
  const [subject, setSubject]       = useState('');
  const [message, setMessage]       = useState('');
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState(null);

  async function handleSubmit() {
    if (!subject.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await createForumTopic(forumId, subject.trim(), message.trim());
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create topic');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <span className={styles.headerTitle}>New Topic</span>
          <button
            className={`${styles.postBtn} ${subject.trim() ? styles.postBtnActive : ''}`}
            onClick={handleSubmit}
            disabled={!subject.trim() || sending}
          >
            {sending ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Forum badge */}
        <div className={styles.forumBadge}>
          Posting in: <strong>{forumName}</strong>
        </div>

        {/* Form */}
        <input
          className={styles.subjectInput}
          placeholder="Topic title..."
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={200}
          autoFocus
        />
        <textarea
          className={styles.messageInput}
          placeholder="Write your message (optional)..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
        />

        {/* Error */}
        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}

        {/* Character count */}
        <div className={styles.charCount}>{subject.length}/200</div>
      </div>
    </div>
  );
}
