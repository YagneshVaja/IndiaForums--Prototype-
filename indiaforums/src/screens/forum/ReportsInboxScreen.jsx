import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getReportedTopics,
  getReportedPosts,
  closeReports,
  closeReportedTopic,
} from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './ReportsInboxScreen.module.css';

/**
 * Moderator-only inbox of reported topics and posts for a forum.
 * The endpoint requires a forumId, so the moderator picks one first
 * (or can paste a numeric id). For the prototype we let them type it.
 */
export default function ReportsInboxScreen({ onBack }) {
  const { isModerator } = useAuth();

  const [forumId, setForumId]   = useState('');
  const [submittedForumId, setSubmittedForumId] = useState(null);
  const [topics, setTopics]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const load = useCallback(async (fid) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportedTopics(fid, { pageNumber: 1, pageSize: 50 });
      const items = res.data?.topics || res.data?.items || res.data?.data || res.data || [];
      setTopics(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load reported topics'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (submittedForumId) load(submittedForumId);
  }, [submittedForumId, load]);

  /* ── Non-moderator block ────────────────────────────────────────────────── */
  if (!isModerator) {
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>← Back</button>
          <h1 className={styles.title}>Reports</h1>
        </div>
        <div className={styles.content}>
          <EmptyState message="Moderator access required." />
        </div>
      </div>
    );
  }

  /* ── Drill-down: posts inside a single topic ────────────────────────────── */
  if (selectedTopic) {
    return (
      <ReportedPostsView
        topic={selectedTopic}
        forumId={submittedForumId}
        onBack={() => { setSelectedTopic(null); load(submittedForumId); }}
      />
    );
  }

  function submitForumId(e) {
    e.preventDefault();
    const id = Number(forumId);
    if (!id) return;
    setSubmittedForumId(id);
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Reports</h1>
      </div>

      {/* Forum picker */}
      <form className={styles.forumPicker} onSubmit={submitForumId}>
        <label className={styles.label}>Forum ID</label>
        <div className={styles.pickerRow}>
          <input
            type="number"
            className={styles.input}
            value={forumId}
            onChange={(e) => setForumId(e.target.value)}
            placeholder="Enter forum id…"
          />
          <button type="submit" className={styles.btnPrimary} disabled={!forumId}>
            Load
          </button>
        </div>
      </form>

      <div className={styles.content}>
        {!submittedForumId ? (
          <EmptyState message="Enter a forum id to view its reported topics." />
        ) : loading ? (
          <LoadingState variant="card" count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(submittedForumId)} />
        ) : topics.length === 0 ? (
          <EmptyState message="No reported topics in this forum." />
        ) : (
          <div className={styles.list}>
            {topics.map((t) => (
              <ReportedTopicRow
                key={t.topicId || t.id}
                topic={t}
                onOpen={() => setSelectedTopic(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reported topic row ────────────────────────────────────────────────────── */
function ReportedTopicRow({ topic, onOpen }) {
  const id       = topic.topicId || topic.id;
  const subject  = topic.subject || topic.title || `Topic #${id}`;
  const reporter = topic.reportedBy || topic.userName || topic.poster || 'Unknown';
  const reason   = topic.reason || topic.reportReason || topic.message || '';
  const count    = topic.reportCount || topic.totalReports || topic.reports?.length || 1;

  return (
    <button className={styles.topicRow} onClick={onOpen}>
      <div className={styles.topicHeader}>
        <span className={styles.topicSubject}>{subject}</span>
        <span className={styles.countBadge}>{count}</span>
      </div>
      <div className={styles.topicMeta}>
        <span className={styles.metaLabel}>Reported by</span>
        <span className={styles.metaValue}>{reporter}</span>
      </div>
      {reason && <div className={styles.reasonText}>{reason}</div>}
    </button>
  );
}

/* ── Drill-down: reported posts inside one topic ───────────────────────────── */
function ReportedPostsView({ topic, forumId, onBack }) {
  const topicId = topic.topicId || topic.id;
  const subject = topic.subject || topic.title || `Topic #${topicId}`;

  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [busyId, setBusyId]   = useState(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReportedPosts(topicId, { pageNumber: 1, pageSize: 50 });
      const items = res.data?.posts || res.data?.items || res.data?.data || res.data || [];
      setPosts(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(extractApiError(err, 'Failed to load reported posts'));
    } finally {
      setLoading(false);
    }
  }, [topicId]);

  useEffect(() => { load(); }, [load]);

  async function dismissOne(reportId) {
    if (!reportId) return;
    setBusyId(reportId);
    try {
      await closeReports({ reportIds: [reportId], forumId });
      setPosts((prev) => prev.filter((p) =>
        (p.reportId || p.id) !== reportId
      ));
    } catch (err) {
      setError(extractApiError(err, 'Failed to dismiss report'));
    } finally {
      setBusyId(null);
    }
  }

  async function closeTopicWithReports() {
    if (closing) return;
    setClosing(true);
    setError(null);
    try {
      await closeReportedTopic({
        topicId,
        forumId,
        closePost: 'Closed by moderator after report review.',
        isCloseWithPost: true,
      });
      onBack();
    } catch (err) {
      setError(extractApiError(err, 'Failed to close reported topic'));
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Reports</h1>
      </div>

      <div className={styles.subHeader}>
        <div className={styles.subTitle}>{subject}</div>
        <button
          className={styles.btnDanger}
          onClick={closeTopicWithReports}
          disabled={closing}
        >
          {closing ? 'Closing…' : 'Close topic'}
        </button>
      </div>

      <div className={styles.content}>
        {loading ? <LoadingState variant="card" count={3} />
          : error ? <ErrorState message={error} onRetry={load} />
          : posts.length === 0 ? <EmptyState message="No reported posts in this topic." />
          : (
            <div className={styles.list}>
              {posts.map((p) => {
                const reportId = p.reportId || p.id;
                const author   = p.author || p.userName || 'Unknown';
                const reason   = p.reason || p.reportReason || p.message || '';
                const body     = p.postMessage || p.body || p.content || '';
                return (
                  <div key={reportId} className={styles.postRow}>
                    <div className={styles.topicMeta}>
                      <span className={styles.metaLabel}>By</span>
                      <span className={styles.metaValue}>{author}</span>
                    </div>
                    {reason && (
                      <div className={styles.reasonText}>
                        <strong>Reason:</strong> {reason}
                      </div>
                    )}
                    {body && (
                      <div className={styles.postBody}>{body}</div>
                    )}
                    <div className={styles.actions}>
                      <button
                        className={styles.btnGhost}
                        onClick={() => dismissOne(reportId)}
                        disabled={busyId === reportId}
                      >
                        {busyId === reportId ? 'Dismissing…' : 'Dismiss report'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>
    </div>
  );
}
