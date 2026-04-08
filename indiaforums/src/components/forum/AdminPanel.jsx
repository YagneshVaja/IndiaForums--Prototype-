import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  closeTopic,
  openTopic,
  moveTopic,
  mergeTopic,
  trashTopics,
  restoreTopic,
  updateTopicAdminSettings,
} from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import styles from './AdminPanel.module.css';

/**
 * Floating admin panel rendered on a topic detail screen for moderators.
 * Hidden for non-moderator users.
 *
 * @param {object} props
 * @param {object} props.topic                 normalised topic object ({ id, forumId, locked, pinned, ... })
 * @param {Function} [props.onActionComplete]  called after a successful action so the screen can refresh
 */
export default function AdminPanel({ topic, onActionComplete }) {
  const { isModerator } = useAuth();

  const [open, setOpen]         = useState(false);
  const [activeAction, setActiveAction] = useState(null); // 'close' | 'open' | 'move' | 'merge' | 'trash' | 'restore' | 'pin' | null
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  // Form state for the active action
  const [reason, setReason]     = useState('');
  const [targetForumId, setTargetForumId] = useState('');
  const [targetTopicId, setTargetTopicId] = useState('');
  const [postWithAction, setPostWithAction] = useState(true);

  if (!isModerator || !topic) return null;

  function reset() {
    setActiveAction(null);
    setReason('');
    setTargetForumId('');
    setTargetTopicId('');
    setPostWithAction(true);
    setError(null);
    setSuccess(null);
    setBusy(false);
  }

  function chooseAction(action) {
    setActiveAction(action);
    setError(null);
    setSuccess(null);
  }

  async function runAction(fn, successMsg) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setSuccess(successMsg);
      onActionComplete?.();
      // Auto-close after a brief success flash
      setTimeout(() => { reset(); setOpen(false); }, 900);
    } catch (err) {
      setError(extractApiError(err, 'Action failed. You may not have permission.'));
    } finally {
      setBusy(false);
    }
  }

  function onConfirm() {
    if (!activeAction || busy) return;
    switch (activeAction) {
      case 'close':
        return runAction(
          () => closeTopic({
            topicId: topic.id,
            forumId: topic.forumId,
            closePost: reason || undefined,
            isCloseWithPost: postWithAction && !!reason,
          }),
          'Topic closed.',
        );
      case 'open':
        return runAction(
          () => openTopic({
            topicId: topic.id,
            forumId: topic.forumId,
            openMessage: reason || undefined,
            isOpenWithPost: postWithAction && !!reason,
          }),
          'Topic reopened.',
        );
      case 'move': {
        const toId = Number(targetForumId);
        if (!toId) { setError('Enter the target forum id.'); return; }
        return runAction(
          () => moveTopic({ topicId: topic.id, toForumId: toId }),
          'Topic moved.',
        );
      }
      case 'merge': {
        const intoId = Number(targetTopicId);
        if (!intoId) { setError('Enter the target topic id.'); return; }
        return runAction(
          () => mergeTopic({ topicId: topic.id, newTopicId: intoId }),
          'Topic merged.',
        );
      }
      case 'trash':
        return runAction(
          () => trashTopics([topic.id], topic.forumId ? [topic.forumId] : undefined),
          'Topic trashed.',
        );
      case 'restore':
        return runAction(
          () => restoreTopic(topic.id),
          'Topic restored.',
        );
      case 'pin':
        return runAction(
          () => updateTopicAdminSettings(topic.id, { priority: topic.pinned ? 0 : 1 }),
          topic.pinned ? 'Topic unpinned.' : 'Topic pinned.',
        );
      default:
        return;
    }
  }

  // Action menu items — show contextually based on topic state
  const menuItems = [
    topic.locked
      ? { key: 'open',    label: 'Reopen topic',  icon: '🔓' }
      : { key: 'close',   label: 'Close topic',   icon: '🔒' },
    { key: 'pin',     label: topic.pinned ? 'Unpin topic' : 'Pin topic', icon: '📌' },
    { key: 'move',    label: 'Move topic',    icon: '➡️' },
    { key: 'merge',   label: 'Merge into…',   icon: '🔗' },
    { key: 'trash',   label: 'Trash topic',   icon: '🗑️', danger: true },
    { key: 'restore', label: 'Restore topic', icon: '♻️' },
  ];

  return (
    <>
      {/* Floating mod button */}
      <button
        className={styles.modFab}
        onClick={() => { setOpen(true); reset(); }}
        title="Moderator actions"
        aria-label="Moderator actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/>
        </svg>
      </button>

      {/* Slide-up sheet */}
      {open && (
        <>
          <div className={styles.backdrop} onClick={() => { setOpen(false); reset(); }} />
          <div className={styles.sheet}>
            <div className={styles.header}>
              <span className={styles.title}>
                {activeAction ? menuItems.find((m) => m.key === activeAction)?.label : 'Moderator Actions'}
              </span>
              <button
                className={styles.close}
                onClick={() => { setOpen(false); reset(); }}
                aria-label="Close"
              >×</button>
            </div>

            {/* Menu (no action chosen yet) */}
            {!activeAction && (
              <div className={styles.menu}>
                {menuItems.map((item) => (
                  <button
                    key={item.key}
                    className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                    onClick={() => chooseAction(item.key)}
                  >
                    <span className={styles.menuIcon}>{item.icon}</span>
                    <span className={styles.menuLabel}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Action form */}
            {activeAction && (
              <div className={styles.form}>
                {(activeAction === 'close' || activeAction === 'open') && (
                  <>
                    <label className={styles.label}>
                      {activeAction === 'close' ? 'Close reason (optional)' : 'Reopen note (optional)'}
                    </label>
                    <textarea
                      className={styles.textarea}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Visible to readers if posted to thread"
                      maxLength={500}
                      disabled={busy}
                    />
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={postWithAction}
                        onChange={(e) => setPostWithAction(e.target.checked)}
                        disabled={busy || !reason}
                      />
                      Post this note as a thread reply
                    </label>
                  </>
                )}

                {activeAction === 'move' && (
                  <>
                    <label className={styles.label}>Target forum ID</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={targetForumId}
                      onChange={(e) => setTargetForumId(e.target.value)}
                      placeholder="e.g. 42"
                      disabled={busy}
                    />
                  </>
                )}

                {activeAction === 'merge' && (
                  <>
                    <label className={styles.label}>Target topic ID (merge into)</label>
                    <input
                      type="number"
                      className={styles.input}
                      value={targetTopicId}
                      onChange={(e) => setTargetTopicId(e.target.value)}
                      placeholder="e.g. 12345"
                      disabled={busy}
                    />
                  </>
                )}

                {activeAction === 'trash' && (
                  <div className={styles.confirmText}>
                    This will move the topic to the trash forum. Moderators can restore it later.
                  </div>
                )}

                {activeAction === 'restore' && (
                  <div className={styles.confirmText}>
                    Restore this topic from trash to its original forum?
                  </div>
                )}

                {activeAction === 'pin' && (
                  <div className={styles.confirmText}>
                    {topic.pinned
                      ? 'Remove this topic from the pinned section?'
                      : 'Pin this topic to the top of the forum?'}
                  </div>
                )}

                {error   && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <div className={styles.actions}>
                  <button
                    className={styles.btnGhost}
                    onClick={() => { setActiveAction(null); setError(null); }}
                    disabled={busy}
                  >
                    Back
                  </button>
                  <button
                    className={`${styles.btnPrimary} ${activeAction === 'trash' ? styles.btnDanger : ''}`}
                    onClick={onConfirm}
                    disabled={busy}
                  >
                    {busy ? 'Working…' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
