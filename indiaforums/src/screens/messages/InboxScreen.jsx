import { useCallback, useEffect, useMemo, useState } from 'react';
import * as messagesApi from '../../services/messagesApi';
import { extractApiError, timeAgo } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './MessagesScreen.module.css';

const TABS = [
  { key: messagesApi.MESSAGE_MODES.INBOX,  label: 'Inbox'  },
  { key: messagesApi.MESSAGE_MODES.UNREAD, label: 'Unread' },
  { key: messagesApi.MESSAGE_MODES.READ,   label: 'Read'   },
  { key: messagesApi.MESSAGE_MODES.OUTBOX, label: 'Sent'   },
  { key: 'Drafts',                         label: 'Drafts' },
];

const EMPTY_MESSAGES = {
  Inbox:  'Your inbox is empty.',
  Unread: 'No unread messages.',
  Read:   'No read messages.',
  Outbox: "You haven't sent any messages.",
  Drafts: 'No drafts saved.',
};

export default function InboxScreen({
  onBack,
  onOpenThread,
  onCompose,
  onOpenFolders,
}) {
  const [mode, setMode] = useState(messagesApi.MESSAGE_MODES.INBOX);
  const [folderId, setFolderId] = useState(null);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* Folders are stable enough to load once on mount. */
  useEffect(() => {
    messagesApi
      .getFolders()
      .then((res) => setFolders(res.data?.folders || []))
      .catch(() => { /* non-fatal — folder filter is optional */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list = [];
      if (mode === 'Drafts') {
        const res = await messagesApi.getDrafts();
        list = res.data?.drafts || [];
      } else {
        const res = await messagesApi.getMessages({
          mode,
          filter: search || undefined,
          folderId: folderId ?? undefined,
        });
        list = res.data?.messages || [];
      }
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Messages list error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load messages'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mode, folderId, search]);

  useEffect(() => { load(); }, [load]);

  const showFolderPicker = useMemo(
    () => mode !== 'Drafts' && folders.length > 0,
    [mode, folders.length],
  );

  function handleRowClick(item) {
    if (mode === 'Drafts') {
      // Drafts open in compose mode so the user can finish writing.
      onCompose?.({ draftId: item.messageDraftId, prefill: item });
      return;
    }
    const rootId = item.rootMessageId || item.pmId;
    if (rootId) onOpenThread?.(rootId, item);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Messages</h1>
        <button
          className={styles.headerAction}
          onClick={() => onCompose?.()}
          aria-label="Compose new message"
        >
          ✏️ New
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${mode === t.key ? styles.tabActive : ''}`}
            onClick={() => { setMode(t.key); setFolderId(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {(mode !== 'Drafts') && (
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder="Search subject or sender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          />
          {showFolderPicker && (
            <select
              className={styles.select}
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f.folderId} value={f.folderId}>{f.folderName}</option>
              ))}
            </select>
          )}
          <button
            className={styles.headerAction}
            onClick={onOpenFolders}
            title="Manage folders"
          >
            📁
          </button>
        </div>
      )}

      <div className={styles.content}>
        {loading ? (
          <LoadingState variant="card" count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !items.length ? (
          <EmptyState message={EMPTY_MESSAGES[mode] || 'Nothing to show.'} />
        ) : (
          <div className={styles.list}>
            {items.map((item) => (
              <MessageRow
                key={item.pmlId || item.messageDraftId || item.pmId}
                item={item}
                mode={mode}
                onClick={() => handleRowClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Single row ──────────────────────────────────────────────────────────── */
function MessageRow({ item, mode, onClick }) {
  const isDraft  = mode === 'Drafts';
  const isUnread = !isDraft && item.readPost === false;

  // Inbox shows "from", Outbox shows "to", drafts show recipient list.
  const sender = item.displayName || item.userName || (isDraft ? 'Draft' : 'User');
  const initial = (item.userName || item.displayName || 'U').charAt(0).toUpperCase();
  const subject = item.subject || (isDraft ? '(no subject)' : '(no subject)');
  const date = item.messageDate || item.createdWhen;

  return (
    <button
      className={`${styles.row} ${isUnread ? styles.rowUnread : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatar}>{initial}</div>
      <div className={styles.rowBody}>
        <div className={styles.rowTopline}>
          <span className={`${styles.rowFrom} ${isUnread ? styles.rowFromUnread : ''}`}>
            {sender}
          </span>
          {date && <span className={styles.rowDate}>{timeAgo(date)}</span>}
        </div>
        <div className={`${styles.rowSubject} ${isUnread ? styles.rowSubjectUnread : ''}`}>
          {subject}
        </div>
        {item.folderName && (
          <div className={styles.rowMeta}>📁 {item.folderName}</div>
        )}
        {isDraft && item.toIds && (
          <div className={styles.rowMeta}>To: {item.toIds}</div>
        )}
      </div>
    </button>
  );
}
