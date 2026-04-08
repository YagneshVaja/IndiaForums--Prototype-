import { useState, useEffect, useMemo } from 'react';
import useComments from '../../hooks/useComments';
import { useAuth } from '../../contexts/AuthContext';
import * as commentsApi from '../../services/commentsApi';
import * as buddiesApi from '../../services/buddiesApi';
import { extractApiError } from '../../services/api';
import styles from './CommentsSection.module.css';

/**
 * Reusable comments section.
 * Drop into any article / forum / media screen — owns its own list,
 * composer, edit/delete UI, reactions, and report modal.
 *
 * @param {object} props
 * @param {number} props.contentTypeId       commentsApi.COMMENT_CONTENT_TYPES.*
 * @param {number} props.contentTypeValue    id of the article / thread / media row
 * @param {string} [props.title]             section heading (default "Comments")
 */
export default function CommentsSection({ contentTypeId, contentTypeValue, title = 'Comments' }) {
  const { user, isAuthenticated } = useAuth();

  const {
    comments,
    loading,
    error,
    hasMore,
    loadMore,
    totalItems,
    actionError,
    addComment,
    editComment,
    removeComment,
    toggleLike,
  } = useComments(contentTypeId, contentTypeValue);

  // ── Composer state ──────────────────────────────────────────────────────
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting]           = useState(false);

  // ── Per-comment UI state (replyingTo, editingId, menuOpenId, reportFor) ──
  const [replyingTo, setReplyingTo] = useState(null);   // commentId
  const [replyText, setReplyText]   = useState('');
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [reportFor, setReportFor]   = useState(null);   // comment object
  const [expandedReplies, setExpandedReplies] = useState({});

  // ── Top-level vs nested replies (UI groups them under their parent) ────
  const { topLevel, repliesByParent } = useMemo(() => {
    const top = [];
    const byParent = {};
    for (const c of comments) {
      if (c.parentId && c.parentId > 0) {
        if (!byParent[c.parentId]) byParent[c.parentId] = [];
        byParent[c.parentId].push(c);
      } else {
        top.push(c);
      }
    }
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  // ── Submit a new top-level comment ────────────────────────────────────
  async function handlePostComment(e) {
    e?.preventDefault?.();
    const text = composerText.trim();
    if (!text || posting) return;
    setPosting(true);
    const ok = await addComment({ contents: text });
    if (ok) setComposerText('');
    setPosting(false);
  }

  // ── Submit a reply ────────────────────────────────────────────────────
  async function handlePostReply(parentCommentId) {
    const text = replyText.trim();
    if (!text) return;
    setPosting(true);
    const ok = await addComment({ contents: text, parentCommentId });
    if (ok) {
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    }
    setPosting(false);
  }

  // ── Save an in-place edit ─────────────────────────────────────────────
  async function handleSaveEdit(commentId) {
    const text = editText.trim();
    if (!text) return;
    const ok = await editComment(commentId, { contents: text });
    if (ok) {
      setEditingId(null);
      setEditText('');
    }
  }

  // ── Delete with confirm ───────────────────────────────────────────────
  async function handleDelete(commentId) {
    if (!confirm('Delete this comment? It cannot be undone.')) return;
    setMenuOpenId(null);
    await removeComment(commentId);
  }

  // Block the comment author. Confirms first because it's a destructive social
  // action; falls back to alert() for the result so we don't need extra UI state.
  async function handleBlockUser(comment) {
    setMenuOpenId(null);
    if (!comment?.userId) return;
    if (!confirm(`Block ${comment.user || 'this user'}? They will not be able to message or interact with you.`)) return;
    try {
      await buddiesApi.blockUser({ blockedUserId: comment.userId, block: true });
      alert('User blocked');
    } catch (err) {
      alert(extractApiError(err, 'Failed to block user'));
    }
  }

  // ── Show prompt instead of composer when not signed in ────────────────
  const renderComposer = () => {
    if (!isAuthenticated) {
      return (
        <div className={styles.signInPrompt}>
          Sign in from <strong>My Space</strong> to post a comment.
        </div>
      );
    }
    const initial = (user?.displayName || user?.userName || 'U')[0]?.toUpperCase() || 'U';
    return (
      <form className={styles.composer} onSubmit={handlePostComment}>
        <div
          className={styles.composerAv}
          style={{ background: 'linear-gradient(135deg,var(--brand),#6B7FFF)' }}
        >
          {initial}
        </div>
        <div className={styles.composerBody}>
          <textarea
            className={styles.composerTextarea}
            placeholder="Add a comment..."
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            disabled={posting}
            maxLength={2000}
          />
          <div className={styles.composerActions}>
            <span className={styles.composerHint}>{composerText.length}/2000</span>
            <div className={styles.composerBtns}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={posting || !composerText.trim()}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  };

  // ── Comment row renderer (recursive for replies) ──────────────────────
  function renderComment(c, isReply = false) {
    const mine = isAuthenticated && user?.userId && c.userId === user.userId;
    const isEditing = editingId === c.id;
    const replies = repliesByParent[c.id] || [];
    const repliesOpen = expandedReplies[c.id];

    return (
      <div key={c.id} className={styles.comment}>
        <div className={styles.commentAv} style={{ background: c.accentColor }}>
          {c.initial}
        </div>
        <div className={styles.commentBody}>
          <div className={styles.commentTop}>
            <span className={styles.commentUser}>{c.user}</span>
            <span className={styles.commentTime}>{c.time}</span>

            {/* ⋯ menu */}
            <div className={styles.menu}>
              <button
                className={styles.menuTrigger}
                onClick={() => setMenuOpenId((id) => (id === c.id ? null : c.id))}
                aria-label="More"
              >
                ⋯
              </button>
              {menuOpenId === c.id && (
                <div className={styles.menuPopup}>
                  {mine && (
                    <>
                      <button
                        className={styles.menuItem}
                        onClick={() => {
                          setEditingId(c.id);
                          setEditText(c.text);
                          setMenuOpenId(null);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className={`${styles.menuItem} ${styles.menuItemDanger}`}
                        onClick={() => handleDelete(c.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {!mine && (
                    <>
                      <button
                        className={styles.menuItem}
                        onClick={() => {
                          setReportFor(c);
                          setMenuOpenId(null);
                        }}
                      >
                        Report
                      </button>
                      <button
                        className={`${styles.menuItem} ${styles.menuItemDanger}`}
                        onClick={() => handleBlockUser(c)}
                      >
                        Block user
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Edit mode replaces the body */}
          {isEditing ? (
            <div className={styles.editArea}>
              <textarea
                className={styles.composerTextarea}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                maxLength={2000}
              />
              <div className={styles.composerActions}>
                <span className={styles.composerHint}>{editText.length}/2000</span>
                <div className={styles.composerBtns}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => { setEditingId(null); setEditText(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={!editText.trim()}
                    onClick={() => handleSaveEdit(c.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {c.text && <div className={styles.commentText}>{c.text}</div>}
              {c.imageUrl && (
                <img className={styles.commentImage} src={c.imageUrl} alt="" loading="lazy" />
              )}
            </>
          )}

          {/* Action row */}
          {!isEditing && (
            <div className={styles.actions}>
              <button
                className={styles.iconBtn}
                onClick={() => toggleLike(c.id, true)}
                disabled={!isAuthenticated}
              >
                👍 {c.likes}
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => toggleLike(c.id, false)}
                disabled={!isAuthenticated}
              >
                👎 {c.dislikes}
              </button>
              {!isReply && (
                <button
                  className={styles.iconBtn}
                  onClick={() => {
                    setReplyingTo((id) => (id === c.id ? null : c.id));
                    setReplyText('');
                  }}
                  disabled={!isAuthenticated}
                >
                  Reply
                </button>
              )}
              {!isReply && replies.length > 0 && (
                <button
                  className={styles.toggleReplies}
                  onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  {repliesOpen ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
              {!isReply && replies.length === 0 && c.replyCount > 0 && (
                <span className={styles.replyCount}>
                  {c.replyCount} {c.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              )}
            </div>
          )}

          {/* Inline reply composer */}
          {!isReply && replyingTo === c.id && isAuthenticated && (
            <div className={styles.replyComposer}>
              <textarea
                className={styles.composerTextarea}
                placeholder={`Reply to ${c.user}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={2000}
              />
              <div className={styles.composerActions}>
                <span className={styles.composerHint}>{replyText.length}/2000</span>
                <div className={styles.composerBtns}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={posting || !replyText.trim()}
                    onClick={() => handlePostReply(c.id)}
                  >
                    {posting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nested replies (only for top-level rows) */}
          {!isReply && repliesOpen && replies.length > 0 && (
            <div className={styles.replyList}>
              {replies.map((r) => renderComment(r, true))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <span className={styles.count}>
          {totalItems > 0 ? totalItems : comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>

      {actionError && <div className={styles.errorBanner}>{actionError}</div>}

      {renderComposer()}

      {loading && comments.length === 0 && (
        <div className={styles.statePad}>Loading comments...</div>
      )}

      {!loading && error && (
        <div className={styles.statePad}>{error}</div>
      )}

      {!loading && !error && comments.length === 0 && (
        <div className={styles.statePad}>No comments yet. Be the first to comment!</div>
      )}

      {topLevel.map((c) => renderComment(c, false))}

      {hasMore && (
        <button className={styles.loadMoreBtn} onClick={loadMore}>
          Load more comments
        </button>
      )}

      {reportFor && (
        <ReportModal
          comment={reportFor}
          contentType={contentTypeId}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}

/* ── Report modal ──────────────────────────────────────────────────────── */
function ReportModal({ comment, contentType, onClose }) {
  const [reasons, setReasons]       = useState([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [reasonError, setReasonError]       = useState(null);
  const [chosenReason, setChosenReason]     = useState('');
  const [remark, setRemark]                 = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState(null);
  const [done, setDone]                     = useState(false);

  // Load report types on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingReasons(true);
    setReasonError(null);
    commentsApi
      .getReportTypes()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.data || res.data || [];
        // The API returns objects with `reportType` (display name) — handle
        // both common shapes defensively.
        const normalised = Array.isArray(list)
          ? list.map((r) => (typeof r === 'string' ? r : r.reportType || r.name || r.title))
          : [];
        setReasons(normalised.filter(Boolean));
      })
      .catch((err) => {
        if (!cancelled) setReasonError(extractApiError(err, 'Failed to load report reasons'));
      })
      .finally(() => {
        if (!cancelled) setLoadingReasons(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit() {
    if (!chosenReason || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await commentsApi.reportContent({
        contentType,
        contentId: comment.id,
        reason: chosenReason,
        remark: remark.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setSubmitError(extractApiError(err, 'Failed to submit report'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            {done ? 'Report submitted' : 'Report comment'}
          </span>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">×</button>
        </div>

        {done ? (
          <>
            <div className={styles.modalBody}>
              <div className={styles.statePad}>
                Thanks — our moderators will review this comment.
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnPrimary} onClick={onClose}>Done</button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalBody}>
              {loadingReasons && <div className={styles.statePad}>Loading reasons...</div>}
              {reasonError && <div className={styles.errorBanner}>{reasonError}</div>}
              {!loadingReasons && !reasonError && reasons.map((reason) => (
                <button
                  key={reason}
                  className={`${styles.reasonOption} ${chosenReason === reason ? styles.reasonOptionActive : ''}`}
                  onClick={() => setChosenReason(reason)}
                >
                  {reason}
                </button>
              ))}
              {chosenReason && (
                <textarea
                  className={styles.modalTextarea}
                  placeholder="Add an optional note..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  maxLength={500}
                />
              )}
              {submitError && <div className={styles.errorBanner}>{submitError}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
              <button
                className={styles.btnPrimary}
                disabled={!chosenReason || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
