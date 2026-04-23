import { useEffect, useRef, useState } from 'react';
import { editPost } from '../../services/forumsApi';
import { reportContent, getReportTypes, COMMENT_CONTENT_TYPES } from '../../services/commentsApi';
import { extractApiError } from '../../services/api';
import styles from './PostSettingsMenu.module.css';

// editPost expects plain text in `message`, not rendered HTML.
// Mirrors the conversion used by the inline edit flow in TopicDetailScreen.
function htmlToPlainMessage(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Per-post settings dropdown, rendered next to the post number.
 *
 * Role-gated menu:
 *   Regular user  → Report, History (if edited)
 *   Post owner    → Report, Edit, History
 *   Moderator     → Report, Edit, History, Trash Post, Move Post,
 *                   Mark As Matured Post, Add Moderator Note, IP address
 */
export default function PostSettingsMenu({
  post,
  topicId,
  forumId,
  isOwner,
  isModerator,
  onEdit,
  onTrash,
  onShowHistory,
  onRefresh,
  onSuccess,
  onError,
}) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // null | 'report' | 'move' | 'modNote'
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function closeAll() {
    setOpen(false);
    setDialog(null);
  }

  async function toggleMatured() {
    setOpen(false);
    try {
      await editPost(post.id, {
        topicId,
        message: htmlToPlainMessage(post.message),
        hasMaturedContent: !post.hasMaturedContent,
        moderatorNote: post.moderatorNote || undefined,
      });
      onSuccess?.(post.hasMaturedContent ? 'Unmarked as matured.' : 'Marked as matured.');
      onRefresh?.();
    } catch (err) {
      onError?.(extractApiError(err, 'Failed to update matured flag.'));
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.gearBtn}
        aria-label="Post options"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <MenuItem icon={<FlagIcon />} label="Report"
            onClick={() => { setOpen(false); setDialog('report'); }} />

          {(isOwner || isModerator) && (
            <MenuItem icon={<EditIcon />} label="Edit"
              onClick={() => { setOpen(false); onEdit?.(post); }} />
          )}

          {(post.isEdited || isOwner || isModerator) && (
            <MenuItem icon={<ClockIcon />} label="History"
              onClick={() => { setOpen(false); onShowHistory?.(post); }} />
          )}

          {isModerator && (
            <>
              <div className={styles.divider} />
              <MenuItem icon={<TrashIcon />} label="Trash Post" danger
                onClick={() => { setOpen(false); onTrash?.(post); }} />
              <MenuItem icon={<MoveIcon />} label="Move Post"
                onClick={() => { setOpen(false); setDialog('move'); }} />
              <MenuItem icon={<EighteenPlusIcon />}
                label={post.hasMaturedContent ? 'Unmark Matured Post' : 'Mark As Matured Post'}
                onClick={toggleMatured} />
              <MenuItem icon={<NoteIcon />} label="Add Moderator Note"
                onClick={() => { setOpen(false); setDialog('modNote'); }} />
              <div className={styles.ipRow}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2a8 8 0 00-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 00-8-8z"/>
                </svg>
                <span className={styles.ipValue}>{post.ip || '—'}</span>
              </div>
            </>
          )}
        </div>
      )}

      {dialog === 'report' && (
        <ReportDialog
          post={post}
          topicId={topicId}
          forumId={forumId}
          onDone={(msg) => { closeAll(); if (msg) onSuccess?.(msg); }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'move' && (
        <MoveDialog
          onDone={(msg) => { closeAll(); if (msg) onError?.(msg); }}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'modNote' && (
        <ModNoteDialog
          post={post}
          topicId={topicId}
          onDone={(msg) => { closeAll(); if (msg) { onSuccess?.(msg); onRefresh?.(); } }}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}

/* ── Menu item ─────────────────────────────────────────────────────────── */
function MenuItem({ icon, label, danger, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.item} ${danger ? styles.itemDanger : ''}`}
      onClick={onClick}
    >
      <span className={styles.itemIcon}>{icon}</span>
      <span className={styles.itemLabel}>{label}</span>
    </button>
  );
}

/* ── Report dialog ─────────────────────────────────────────────────────── */
function ReportDialog({ post, topicId, forumId, onDone, onCancel }) {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason]   = useState('');
  const [remark, setRemark]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    getReportTypes()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.data ?? res?.data ?? [];
        const arr  = Array.isArray(list) ? list : [];
        // Server returns objects with `reportType` (display name); CommentsSection.jsx
        // handles the same shape — mirror that logic here.
        setReasons(
          arr.map(r => (typeof r === 'string' ? r : r.reportType || r.name || r.title)).filter(Boolean)
        );
      })
      .catch(() => { if (!cancelled) setReasons(['Spam', 'Harassment', 'Hate Speech', 'Inappropriate Content', 'Other']); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reportContent({
        contentType: COMMENT_CONTENT_TYPES.FORUM,
        contentId:   post.id,
        reason,
        remark:      remark.trim() || undefined,
        forumId,
        topicId,
      });
      onDone('Report submitted. Thank you.');
    } catch (err) {
      setError(extractApiError(err, 'Failed to submit report.'));
      setBusy(false);
    }
  }

  return (
    <DialogFrame title="Report Post" onClose={onCancel}>
      {loading ? (
        <div className={styles.dialogState}>Loading reasons…</div>
      ) : (
        <>
          <label className={styles.dialogLabel}>Reason</label>
          <div className={styles.reasonList}>
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.reasonPill} ${reason === r ? styles.reasonPillOn : ''}`}
                onClick={() => setReason(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <label className={styles.dialogLabel}>Remark (optional)</label>
          <textarea
            className={styles.dialogTextarea}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            placeholder="Add any extra context for the moderators…"
            disabled={busy}
          />
          {error && <div className={styles.dialogError}>{error}</div>}
          <div className={styles.dialogActions}>
            <button className={styles.dialogCancel} onClick={onCancel} disabled={busy}>Cancel</button>
            <button
              className={styles.dialogSubmit}
              onClick={submit}
              disabled={busy || !reason}
            >
              {busy ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </>
      )}
    </DialogFrame>
  );
}

/* ── Move Post dialog (UI stub — no per-post move API) ─────────────────── */
function MoveDialog({ onDone, onCancel }) {
  const [target, setTarget] = useState('');
  const [busy, setBusy]     = useState(false);

  function submit() {
    if (!target.trim() || busy) return;
    setBusy(true);
    setTimeout(() => {
      onDone('Move post is not available via the public API yet.');
    }, 300);
  }

  return (
    <DialogFrame title="Move Post" onClose={onCancel}>
      <p className={styles.dialogHint}>
        Per-post move is not exposed by the public API. Splitting/moving posts
        happens topic-side on the live site and is not wired here yet.
      </p>
      <label className={styles.dialogLabel}>Destination topic ID</label>
      <input
        className={styles.dialogInput}
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="e.g. 12345"
        disabled={busy}
      />
      <div className={styles.dialogActions}>
        <button className={styles.dialogCancel} onClick={onCancel} disabled={busy}>Cancel</button>
        <button
          className={styles.dialogSubmit}
          onClick={submit}
          disabled={busy || !target.trim()}
        >
          {busy ? 'Working…' : 'Move'}
        </button>
      </div>
    </DialogFrame>
  );
}

/* ── Moderator note dialog ─────────────────────────────────────────────── */
function ModNoteDialog({ post, topicId, onDone, onCancel }) {
  const [note, setNote] = useState(post.moderatorNote || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!note.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await editPost(post.id, {
        topicId,
        message: htmlToPlainMessage(post.message),
        hasMaturedContent: post.hasMaturedContent,
        moderatorNote: note.trim(),
      });
      onDone('Moderator note saved.');
    } catch (err) {
      setError(extractApiError(err, 'Failed to save moderator note.'));
      setBusy(false);
    }
  }

  return (
    <DialogFrame title="Add Moderator Note" onClose={onCancel}>
      <label className={styles.dialogLabel}>Note</label>
      <textarea
        className={styles.dialogTextarea}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Internal note visible to moderators only…"
        disabled={busy}
      />
      {error && <div className={styles.dialogError}>{error}</div>}
      <div className={styles.dialogActions}>
        <button className={styles.dialogCancel} onClick={onCancel} disabled={busy}>Cancel</button>
        <button
          className={styles.dialogSubmit}
          onClick={submit}
          disabled={busy || !note.trim()}
        >
          {busy ? 'Saving…' : 'Save Note'}
        </button>
      </div>
    </DialogFrame>
  );
}

/* ── Shared dialog frame ───────────────────────────────────────────────── */
function DialogFrame({ title, onClose, children }) {
  return (
    <div className={styles.dialogOverlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>{title}</span>
          <button className={styles.dialogClose} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.dialogBody}>{children}</div>
      </div>
    </div>
  );
}

/* ── Inline icons ──────────────────────────────────────────────────────── */
function FlagIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V3h12l-2 5 2 5H4"/>
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 14"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18"/>
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    </svg>
  );
}
function MoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9l-3 3 3 3"/>
      <path d="M19 15l3-3-3-3"/>
      <path d="M2 12h20"/>
    </svg>
  );
}
function EighteenPlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="7" fontWeight="800" fill="currentColor" stroke="none">18</text>
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h12l4 4v12a0 0 0 010 0H4z"/>
      <path d="M8 12h8M8 16h5"/>
    </svg>
  );
}
