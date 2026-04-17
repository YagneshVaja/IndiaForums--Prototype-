import { useState, useEffect, useCallback } from 'react';
import * as notificationsApi from '../services/notificationsApi';
import styles from './NotificationsScreen.module.css';

/* ── Avatar colour palette (cycles by first char of username) ── */
const AVATAR_COLORS = [
  '#3558F0','#E03A5C','#16A34A','#D97706',
  '#7C3AED','#0891B2','#DB2777','#EA580C',
];
function avatarColor(name) {
  const code = (name || 'U').charCodeAt(0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/* ── Relative time ───────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)  return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

/* ── Single notification row ─────────────────────────────────── */
function NotificationItem({ notification: n }) {
  const isUnread = n.read === 0 || n.read === '0';
  const user = n.user;
  const displayName = n.displayUserName || user?.userName || '';

  return (
    <div className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}>
      {/* Avatar */}
      {user?.thumbnailUrl ? (
        <img
          src={user.thumbnailUrl}
          alt={displayName}
          className={styles.avatar}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <div
          className={styles.avatarInitials}
          style={{ background: avatarColor(displayName) }}
        >
          {initials(displayName)}
        </div>
      )}

      {/* Body */}
      <div className={styles.itemBody}>
        {n.title   && <div className={styles.itemTitle}>{n.title}</div>}
        {n.message && <div className={styles.itemMessage}>{n.message}</div>}
        <div className={styles.itemTime}>{timeAgo(n.publishedWhen)}</div>
      </div>

      {/* Unread indicator dot */}
      {isUnread && <div className={styles.unreadDot} />}
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function NotificationsScreen() {
  const [notifications, setNotifications]   = useState([]);
  const [templates, setTemplates]           = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null); // null = All
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [markingAll, setMarkingAll]         = useState(false);
  const [fetchError, setFetchError]         = useState(null);

  /* ── Fetch ─────────────────────────────────────────────────── */
  const fetchPage = useCallback(async (templateId, pageNum, prevRecordId = 0) => {
    if (pageNum === 1) { setLoading(true); setFetchError(null); }
    else               setLoadingMore(true);

    try {
      const params = { pn: pageNum, ps: 20, pr: prevRecordId };
      if (templateId != null) params.t = templateId;
      const res  = await notificationsApi.getNotifications(params);
      const data = res.data || {};
      const incoming = data.notifications || [];

      if (pageNum === 1) {
        setTemplates(data.notificationTemplates || []);
        setNotifications(incoming);
      } else {
        setNotifications(prev => [...prev, ...incoming]);
      }
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      const status = err?.response?.status;
      console.error('[NotificationsScreen] fetch failed', status, err?.response?.data || err?.message);
      if (pageNum === 1) {
        setFetchError(
          status === 401
            ? 'Please log in to see your notifications.'
            : `Could not load notifications (${status ?? 'network error'}).`
        );
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Re-fetch when template filter changes
  useEffect(() => {
    setPage(1);
    fetchPage(activeTemplate, 1);
  }, [activeTemplate, fetchPage]);

  // Auto mark-as-read when notifications first load
  useEffect(() => {
    const unreadIds = notifications
      .filter(n => n.read === 0 || n.read === '0')
      .map(n => n.notificationId)
      .join(',');
    if (!unreadIds) return;
    notificationsApi.markAsRead({ ids: unreadIds }).catch(() => {});
  }, [notifications]);

  /* ── Actions ───────────────────────────────────────────────── */
  function handleTemplateChange(templateId) {
    setActiveTemplate(templateId);
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications
      .filter(n => n.read === 0 || n.read === '0')
      .map(n => n.notificationId)
      .join(',');
    if (!unreadIds) return;

    setMarkingAll(true);
    try {
      await notificationsApi.markAsRead({ ids: unreadIds });
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  function handleLoadMore() {
    if (page >= totalPages || loadingMore) return;
    const next = page + 1;
    const lastId = notifications.length > 0
      ? notifications[notifications.length - 1].notificationId
      : 0;
    setPage(next);
    fetchPage(activeTemplate, next, lastId);
  }

  const hasUnread = notifications.some(n => n.read === 0 || n.read === '0');

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className={styles.screen}>

      {/* Filter chips */}
      <div className={styles.filtersRow}>
        <button
          className={`${styles.chip} ${activeTemplate === null ? styles.chipActive : ''}`}
          onClick={() => handleTemplateChange(null)}
        >
          All
        </button>
        {templates.map(t => (
          <button
            key={t.templateId}
            className={`${styles.chip} ${activeTemplate === t.templateId ? styles.chipActive : ''}`}
            onClick={() => handleTemplateChange(t.templateId)}
          >
            {t.templateDesc}
            {t.notificationCount > 0 && (
              <span className={styles.chipBadge}>{t.notificationCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Mark all read bar — only shown when there are unread items */}
      {hasUnread && (
        <div className={styles.markAllBar}>
          <button
            className={styles.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        </div>
      )}

      {/* Notifications list */}
      <div className={styles.list}>
        {loading ? (
          <div className={styles.center}>Loading…</div>
        ) : fetchError ? (
          <div className={styles.center}>{fetchError}</div>
        ) : notifications.length === 0 ? (
          <div className={styles.center}>No notifications yet</div>
        ) : (
          <>
            {notifications.map(n => (
              <NotificationItem key={n.notificationId} notification={n} />
            ))}
            {page < totalPages && (
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
