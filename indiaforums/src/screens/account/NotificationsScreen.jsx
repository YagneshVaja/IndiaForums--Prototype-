import { useState, useEffect, useCallback } from 'react';
import * as notificationsApi from '../../services/notificationsApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './NotificationsScreen.module.css';

const FILTERS = [
  { key: 'all',    label: 'All' },
  { key: 'unread', label: 'Unread' },
];

export default function NotificationsScreen({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getNotifications(),
        notificationsApi.getUnreadCount().catch(() => ({ data: { unreadCount: 0 } })),
      ]);
      const items = notifRes.data?.notifications || notifRes.data?.items || notifRes.data?.data || notifRes.data || [];
      setNotifications(Array.isArray(items) ? items : []);
      const c = countRes.data?.unreadCount ?? countRes.data?.count ?? countRes.data ?? 0;
      setUnreadCount(typeof c === 'number' ? c : 0);
    } catch (err) {
      console.error('Notifications load error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkOne(id) {
    try {
      await notificationsApi.markAsRead({ notificationIds: [id] });
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n.notificationId) === id ? { ...n, isRead: true, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Mark read error:', err.response?.status, err.response?.data);
    }
  }

  async function handleMarkAll() {
    if (!notifications.some((n) => !(n.isRead || n.read))) return;
    setMarking(true);
    try {
      const unreadIds = notifications
        .filter((n) => !(n.isRead || n.read))
        .map((n) => n.id || n.notificationId);
      await notificationsApi.markAsRead({ notificationIds: unreadIds, markAll: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all read error:', err.response?.status, err.response?.data);
    } finally {
      setMarking(false);
    }
  }

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !(n.isRead || n.read))
    : notifications;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Notifications</h1>
        {unreadCount > 0 && <span className={styles.headerBadge}>{unreadCount}</span>}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.key)}
              type="button"
            >
              {f.label}
              {f.key === 'unread' && unreadCount > 0 && (
                <span className={styles.filterBadge}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            className={styles.markAllBtn}
            onClick={handleMarkAll}
            disabled={marking}
            type="button"
          >
            {marking ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      <div className={styles.content}>
        {loading ? <LoadingState variant="card" count={5} />
          : error ? <ErrorState message={error} onRetry={load} />
          : !filtered.length ? (
            <EmptyState message={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} />
          ) : (
            <div className={styles.list}>
              {filtered.map((n) => (
                <NotificationItem
                  key={n.id || n.notificationId}
                  notification={n}
                  onMarkRead={handleMarkOne}
                />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ── Notification Item ────────────────────────────────────────────────────── */
function NotificationItem({ notification, onMarkRead }) {
  const id = notification.id || notification.notificationId;
  const isRead = notification.isRead || notification.read || false;
  const title = notification.title || notification.subject || 'Notification';
  const message = notification.message || notification.body || notification.text || notification.description || '';
  const createdAt = notification.createdAt || notification.timestamp || notification.date;
  const type = (notification.type || notification.category || '').toLowerCase();

  function getIcon() {
    if (type.includes('mention')) return '@';
    if (type.includes('reply') || type.includes('comment')) return '💬';
    if (type.includes('like') || type.includes('heart')) return '❤️';
    if (type.includes('follow') || type.includes('buddy')) return '👥';
    if (type.includes('badge') || type.includes('achievement')) return '🏆';
    if (type.includes('post')) return '📝';
    return '🔔';
  }

  function handleClick() {
    if (!isRead) onMarkRead(id);
  }

  return (
    <button
      className={`${styles.item} ${!isRead ? styles.itemUnread : ''}`}
      onClick={handleClick}
      type="button"
    >
      <span className={styles.itemIcon}>{getIcon()}</span>
      <div className={styles.itemContent}>
        <div className={styles.itemTitle}>{title}</div>
        {message && <div className={styles.itemMessage}>{message}</div>}
        {createdAt && <div className={styles.itemTime}>{formatTime(createdAt)}</div>}
      </div>
      {!isRead && <span className={styles.unreadDot} />}
    </button>
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
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}
