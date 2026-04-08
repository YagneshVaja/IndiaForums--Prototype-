import { useCallback, useEffect, useState } from 'react';
import * as buddiesApi from '../../services/buddiesApi';
import { extractApiError, timeAgo } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './BuddiesScreen.module.css';

const TABS = [
  { key: buddiesApi.BUDDY_MODES.FRIENDS,  label: 'Friends'  },
  { key: buddiesApi.BUDDY_MODES.PENDING,  label: 'Pending'  },
  { key: buddiesApi.BUDDY_MODES.SENT,     label: 'Sent'     },
  { key: buddiesApi.BUDDY_MODES.BLOCKED,  label: 'Blocked'  },
  { key: buddiesApi.BUDDY_MODES.VISITORS, label: 'Visitors' },
];

const EMPTY_MESSAGES = {
  bl:  "You don't have any buddies yet.",
  pl:  'No pending friend requests.',
  wl:  "You haven't sent any friend requests.",
  bll: "You haven't blocked anyone.",
  vl:  'No recent profile visitors.',
};

export default function BuddiesScreen({ onBack }) {
  const [mode, setMode] = useState(buddiesApi.BUDDY_MODES.FRIENDS);
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  // Tracks which row is mid-action so we can disable per-button without
  // freezing the whole list.
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const res = await buddiesApi.getMyBuddyList(mode);
      const list = res.data?.buddies || [];
      setBuddies(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Buddy list error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load buddies'));
      setBuddies([]);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  /* ── Row actions ─────────────────────────────────────────────────────────── */
  async function withAction(id, fn) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      console.error('Buddy action error:', err.response?.status, err.response?.data);
      setActionError(extractApiError(err, 'Action failed'));
    } finally {
      setBusyId(null);
    }
  }

  function handleAccept(buddy) {
    withAction(buddy.userId, () => buddiesApi.acceptFriendRequest(buddy.buddyListId));
  }

  function handleReject(buddy) {
    withAction(buddy.userId, () => buddiesApi.cancelFriendRequest(buddy.buddyListId));
  }

  function handleCancelSent(buddy) {
    withAction(buddy.userId, () => buddiesApi.cancelFriendRequest(buddy.buddyListId));
  }

  function handleBlock(buddy) {
    withAction(buddy.userId, () =>
      buddiesApi.blockUser({
        blockedUserId: buddy.userId,
        block: true,
        isFriend: buddy.friend === 1,
        requestId: buddy.buddyListId || 0,
      }),
    );
  }

  function handleUnblock(buddy) {
    withAction(buddy.userId, () =>
      buddiesApi.blockUser({
        blockedUserId: buddy.userId,
        block: false,
        isFriend: false,
        requestId: buddy.buddyListId || 0,
      }),
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Buddies</h1>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${mode === t.key ? styles.tabActive : ''}`}
            onClick={() => setMode(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {actionError && <div className={styles.error}>{actionError}</div>}

        {loading ? (
          <LoadingState variant="card" count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !buddies.length ? (
          <EmptyState message={EMPTY_MESSAGES[mode] || 'Nothing to show.'} />
        ) : (
          <div className={styles.list}>
            {buddies.map((b) => (
              <BuddyRow
                key={b.userMapId || b.buddyListId || b.userId}
                buddy={b}
                mode={mode}
                busy={busyId === b.userId}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancelSent={handleCancelSent}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Buddy row ─────────────────────────────────────────────────────────────── */
function BuddyRow({ buddy, mode, busy, onAccept, onReject, onCancelSent, onBlock, onUnblock }) {
  const initial = (buddy.userName || buddy.realName || '?').charAt(0).toUpperCase();
  const subtitle = buddy.realName && buddy.realName !== buddy.userName
    ? buddy.realName
    : buddy.groupName || '';

  return (
    <div className={styles.row}>
      <div className={styles.avatar}>{initial}</div>

      <div className={styles.info}>
        <div className={styles.name}>{buddy.userName || 'User'}</div>
        {subtitle && <div className={styles.sub}>{subtitle}</div>}
        {buddy.lastUpdatedWhen && (
          <div className={styles.meta}>{timeAgo(buddy.lastUpdatedWhen)}</div>
        )}
      </div>

      <div className={styles.actions}>
        {mode === buddiesApi.BUDDY_MODES.FRIENDS && (
          <button
            className={styles.dangerBtn}
            onClick={() => onBlock(buddy)}
            disabled={busy}
          >
            Block
          </button>
        )}

        {mode === buddiesApi.BUDDY_MODES.PENDING && (
          <>
            <button
              className={styles.primaryBtn}
              onClick={() => onAccept(buddy)}
              disabled={busy}
            >
              Accept
            </button>
            <button
              className={styles.ghostBtn}
              onClick={() => onReject(buddy)}
              disabled={busy}
            >
              Reject
            </button>
          </>
        )}

        {mode === buddiesApi.BUDDY_MODES.SENT && (
          <button
            className={styles.ghostBtn}
            onClick={() => onCancelSent(buddy)}
            disabled={busy}
          >
            Cancel
          </button>
        )}

        {mode === buddiesApi.BUDDY_MODES.BLOCKED && (
          <button
            className={styles.primaryBtn}
            onClick={() => onUnblock(buddy)}
            disabled={busy}
          >
            Unblock
          </button>
        )}

        {/* Visitors mode has no actions — just the row */}
      </div>
    </div>
  );
}
