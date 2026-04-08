import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as activitiesApi from '../../services/activitiesApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './ActivitiesScreen.module.css';

export default function ActivitiesScreen({ onBack }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeError, setComposeError] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await activitiesApi.getMyActivities();
      const items = res.data?.activities || res.data?.items || res.data?.data || res.data || [];
      setActivities(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Activities load error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load activities'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePost() {
    const text = composeText.trim();
    if (!text) {
      setComposeError('Activity cannot be empty');
      return;
    }
    setPosting(true);
    setComposeError(null);
    try {
      const res = await activitiesApi.createActivity({ content: text, message: text });
      const created = res.data?.activity || res.data || { id: Date.now(), content: text, createdAt: new Date().toISOString() };
      setActivities((prev) => [created, ...prev]);
      setComposeText('');
    } catch (err) {
      console.error('Activity post error:', err.response?.status, err.response?.data);
      setComposeError(extractApiError(err, 'Failed to post activity'));
    } finally {
      setPosting(false);
    }
  }

  async function handleUpdate(activityId, newContent) {
    try {
      await activitiesApi.updateActivity(activityId, { content: newContent, message: newContent });
      setActivities((prev) =>
        prev.map((a) => ((a.id || a.activityId) === activityId
          ? { ...a, content: newContent, message: newContent, updatedAt: new Date().toISOString() }
          : a))
      );
      setEditingId(null);
    } catch (err) {
      console.error('Activity update error:', err.response?.status, err.response?.data);
      alert(extractApiError(err, 'Failed to update activity'));
    }
  }

  async function handleDelete(activityId) {
    if (!confirm('Delete this activity?')) return;
    try {
      await activitiesApi.deleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => (a.id || a.activityId) !== activityId));
    } catch (err) {
      console.error('Activity delete error:', err.response?.status, err.response?.data);
      alert(extractApiError(err, 'Failed to delete activity'));
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Activity</h1>
      </div>

      {/* Composer */}
      <div className={styles.composer}>
        <div className={styles.composerHeader}>
          <div className={styles.avatar}>
            {user?.displayName?.[0]?.toUpperCase() || user?.userName?.[0]?.toUpperCase() || 'U'}
          </div>
          <textarea
            className={styles.composerInput}
            placeholder="What's on your mind?"
            value={composeText}
            onChange={(e) => {
              setComposeText(e.target.value);
              if (composeError) setComposeError(null);
            }}
            rows={2}
            maxLength={500}
          />
        </div>
        {composeError && <div className={styles.composerError}>{composeError}</div>}
        <div className={styles.composerActions}>
          <span className={styles.charCount}>{composeText.length}/500</span>
          <button
            className={styles.postBtn}
            onClick={handlePost}
            disabled={posting || !composeText.trim()}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Activity feed */}
      <div className={styles.content}>
        {loading ? <LoadingState variant="card" count={3} />
          : error ? <ErrorState message={error} onRetry={load} />
          : !activities.length ? <EmptyState message="No activities yet. Share something!" />
          : (
            <div className={styles.list}>
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.id || activity.activityId}
                  activity={activity}
                  isEditing={editingId === (activity.id || activity.activityId)}
                  onEdit={() => setEditingId(activity.id || activity.activityId)}
                  onCancelEdit={() => setEditingId(null)}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  currentUser={user}
                />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ── Activity Item ────────────────────────────────────────────────────────── */
function ActivityItem({ activity, isEditing, onEdit, onCancelEdit, onUpdate, onDelete, currentUser }) {
  const id = activity.id || activity.activityId;
  const content = activity.content || activity.message || activity.text || '';
  const createdAt = activity.createdAt || activity.timestamp || activity.date;
  const updatedAt = activity.updatedAt;
  const authorName = activity.authorName || activity.userName || currentUser?.displayName || 'You';
  const [editText, setEditText] = useState(content);
  const [menuOpen, setMenuOpen] = useState(false);

  function handleSaveEdit() {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === content) {
      onCancelEdit();
      return;
    }
    onUpdate(id, trimmed);
  }

  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        <div className={styles.itemAvatar}>
          {authorName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className={styles.itemMeta}>
          <div className={styles.itemAuthor}>{authorName}</div>
          {createdAt && (
            <div className={styles.itemTime}>
              {formatTime(createdAt)}
              {updatedAt && updatedAt !== createdAt && <span className={styles.editedTag}> · edited</span>}
            </div>
          )}
        </div>
        <div className={styles.menuWrap}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)} type="button">⋯</button>
          {menuOpen && (
            <>
              <div className={styles.menuOverlay} onClick={() => setMenuOpen(false)} />
              <div className={styles.menu}>
                <button
                  className={styles.menuItem}
                  onClick={() => { onEdit(); setMenuOpen(false); }}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={() => { onDelete(id); setMenuOpen(false); }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className={styles.editArea}>
          <textarea
            className={styles.editInput}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
          />
          <div className={styles.editActions}>
            <button className={styles.cancelBtn} onClick={onCancelEdit} type="button">Cancel</button>
            <button className={styles.saveBtn} onClick={handleSaveEdit} type="button">Save</button>
          </div>
        </div>
      ) : (
        <div className={styles.itemContent}>{content}</div>
      )}
    </div>
  );
}

function formatTime(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
