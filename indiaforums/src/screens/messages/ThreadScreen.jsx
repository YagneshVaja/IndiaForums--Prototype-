import { useCallback, useEffect, useState } from 'react';
import * as messagesApi from '../../services/messagesApi';
import { extractApiError, timeAgo } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './MessagesScreen.module.css';

export default function ThreadScreen({ rootId, onBack, onCompose }) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!rootId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await messagesApi.getMessageThread(rootId);
      setThread(res.data || null);
    } catch (err) {
      console.error('Thread load error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load conversation'));
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => { load(); }, [load]);

  const root = thread?.rootMessage;
  const messages = thread?.messages || [];
  const subject = root?.subject || messages[0]?.subject || 'Conversation';

  function handleReply() {
    // Reply uses the latest message as parent and the root for threading.
    const last = messages[messages.length - 1];
    onCompose?.({
      mode: 'reply',
      parentId: last?.pmId,
      rootMessageId: root?.rootId || rootId,
      prefillSubject: subject?.startsWith('Re:') ? subject : `Re: ${subject}`,
      prefillTo: last?.userName || '',
    });
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>{subject}</h1>
        <button
          className={styles.headerAction}
          onClick={handleReply}
          disabled={loading || !!error || !messages.length}
        >
          ↩ Reply
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <LoadingState variant="card" count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !messages.length ? (
          <EmptyState message="This conversation is empty." />
        ) : (
          <div className={styles.thread}>
            {messages.map((m) => (
              <article key={m.pmId} className={styles.message}>
                <header className={styles.messageHeader}>
                  <div className={styles.avatar}>
                    {(m.userName || m.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.messageAuthor}>
                    {m.displayName || m.userName || 'User'}
                  </div>
                  {m.messageDate && (
                    <div className={styles.messageDate}>{timeAgo(m.messageDate)}</div>
                  )}
                </header>
                <div className={styles.messageBody}>{m.message}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
