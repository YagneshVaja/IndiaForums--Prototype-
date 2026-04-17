import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { replyToTopic } from '../../services/forumsApi';
import { getMyBuddyList } from '../../services/buddiesApi';
import { extractApiError } from '../../services/api';
import styles from './ReplyComposerSheet.module.css';

// ── Toolbar definition ────────────────────────────────────────────────────────
const TOOLS = [
  { id: 'bold',   cmd: 'bold',                label: 'B',  title: 'Bold'           },
  { id: 'italic', cmd: 'italic',              label: 'I',  title: 'Italic'         },
  { id: 'under',  cmd: 'underline',           label: 'U',  title: 'Underline'      },
  { id: 'sep1' },
  { id: 'link',   cmd: null, title: 'Insert link',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> },
  { id: 'img',    cmd: null, title: 'Insert image',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
  { id: 'quote',  cmd: null, title: 'Block quote',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4.58 17.32C3.55 16.23 3 15 3 13.01c0-3.5 2.46-6.64 6.03-8.19l.89 1.38C6.59 8.04 5.94 10.38 5.68 11.86c.54-.28 1.24-.38 1.93-.31 1.8.17 3.23 1.65 3.23 3.49A3.5 3.5 0 017.33 18.5c-1.07 0-2.1-.49-2.75-1.18zm10 0C13.55 16.23 13 15 13 13.01c0-3.5 2.46-6.64 6.03-8.19l.89 1.38c-3.34 1.8-3.99 4.14-4.25 5.62.54-.28 1.24-.38 1.93-.31 1.8.17 3.23 1.65 3.23 3.49A3.5 3.5 0 0117.33 18.5c-1.07 0-2.1-.49-2.75-1.18z"/></svg> },
  { id: 'sep2' },
  { id: 'ul',     cmd: 'insertUnorderedList', title: 'Bullet list',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg> },
  { id: 'ol',     cmd: 'insertOrderedList',   title: 'Numbered list',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 4v3h1M3 9h2M5 14H3l2-2.5a1.3 1.3 0 00-2.5-.5" strokeWidth="1.5"/></svg> },
];

const QUERYABLE = { bold: 'bold', italic: 'italic', under: 'underline', ul: 'insertUnorderedList', ol: 'insertOrderedList' };

// ── Draft storage ─────────────────────────────────────────────────────────────
function getDraftKey(topicId) { return `if_reply_draft_${topicId}`; }
function loadDraft(topicId)   { try { return localStorage.getItem(getDraftKey(topicId)) || ''; } catch { return ''; } }
function saveDraft(topicId, html) { try { localStorage.setItem(getDraftKey(topicId), html); } catch {} }
function clearDraft(topicId)  { try { localStorage.removeItem(getDraftKey(topicId)); } catch {} }

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReplyComposerSheet({ topic, forumId, quotedPost, onClose, onSubmitted, standalone = false }) {
  const { user } = useAuth();
  const editorRef  = useRef(null);
  const savedRange = useRef(null);
  const tagInputRef = useRef(null);

  const [activeFormats,   setActiveFormats]   = useState({});
  const [charCount,       setCharCount]       = useState(0);
  const [membersOnly,     setMembersOnly]     = useState(false);
  const [matured,         setMatured]         = useState(false);
  const [showSig,         setShowSig]         = useState(true);
  const [watchList,       setWatchList]       = useState(true);
  const [taggedUsers,     setTaggedUsers]     = useState([]); // [{id, userName}]
  const [tagSearch,       setTagSearch]       = useState('');
  const [captchaDone,     setCaptchaDone]     = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState(null);
  const [showBuddyPicker, setShowBuddyPicker] = useState(false);
  const [buddies,         setBuddies]         = useState([]);
  const [buddiesLoading,  setBuddiesLoading]  = useState(false);
  const [buddiesError,    setBuddiesError]    = useState(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const draft = loadDraft(topic.id);
    if (draft) {
      el.innerHTML = draft;
    } else if (quotedPost) {
      el.innerHTML = `<blockquote class="${styles.quoteFmt}"><strong>${quotedPost.author}:</strong> ${quotedPost.message}</blockquote><br>`;
    }
    el.focus();
    syncMetrics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function syncMetrics() {
    const el = editorRef.current;
    if (!el) return;
    setCharCount((el.innerText || '').trim().length);
  }

  function refreshActive() {
    const next = {};
    for (const [id, cmd] of Object.entries(QUERYABLE)) {
      try { next[id] = document.queryCommandState(cmd); } catch { next[id] = false; }
    }
    setActiveFormats(next);
  }

  function saveRange() {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }
  function restoreRange() {
    const sel = window.getSelection();
    if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current); }
  }

  function applyTool(tool) {
    const el = editorRef.current;
    if (!el) return;
    if (tool.cmd) {
      el.focus();
      document.execCommand(tool.cmd, false, null);
      syncMetrics(); refreshActive();
      return;
    }
    switch (tool.id) {
      case 'link': {
        saveRange();
        const url = window.prompt('Enter URL:');
        if (url) {
          restoreRange(); el.focus();
          document.execCommand('createLink', false, url);
          el.querySelectorAll('a:not([target])').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });
        }
        break;
      }
      case 'img': {
        saveRange();
        const src = window.prompt('Enter image URL:');
        if (src) { restoreRange(); el.focus(); document.execCommand('insertImage', false, src); }
        break;
      }
      case 'quote': {
        el.focus();
        const sel = window.getSelection();
        if (sel?.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const bq = document.createElement('blockquote');
          bq.className = styles.quoteFmt;
          if (!sel.isCollapsed) {
            try { range.surroundContents(bq); }
            catch { bq.innerHTML = sel.toString(); range.deleteContents(); range.insertNode(bq); }
          } else {
            bq.innerHTML = '&nbsp;'; range.insertNode(bq);
          }
          syncMetrics();
        }
        break;
      }
      default: break;
    }
    refreshActive();
  }

  async function handleTagBuddies() {
    if (showBuddyPicker) { setShowBuddyPicker(false); return; }
    setShowBuddyPicker(true);
    if (buddies.length > 0) return; // already loaded
    setBuddiesLoading(true);
    setBuddiesError(null);
    try {
      const res = await getMyBuddyList('bl', { ps: 50 });
      const list = res?.data?.buddies;
      setBuddies(Array.isArray(list) ? list : []);
    } catch {
      setBuddiesError('Could not load buddies');
    } finally {
      setBuddiesLoading(false);
    }
  }

  function selectBuddy(buddy) {
    const id       = buddy.userId;
    const username = buddy.userName || '';
    if (!id) return;
    setTaggedUsers(prev => {
      if (prev.some(u => u.id === id)) return prev; // toggle off
      return [...prev, { id, userName: username }];
    });
    setTagSearch('');
    tagInputRef.current?.focus();
  }

  function removeTaggedUser(id) {
    setTaggedUsers(prev => prev.filter(u => u.id !== id));
  }

  async function handleSubmit() {
    if (submitting) return;
    const el = editorRef.current;
    // Read directly from DOM — don't rely on charCount state which may be stale
    const html = el?.innerHTML?.trim() || '';
    const text = (el?.innerText || '').trim();
    if (!text) { setError('Please enter a message before submitting.'); return; }
    if (!captchaDone) { setError('Please confirm you are not a robot.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await replyToTopic(topic.id, {
        forumId,
        message:               html,
        showSignature:         showSig,
        addToWatchList:        watchList,
        hasMaturedContent:     matured,
        userTags:              taggedUsers.length ? taggedUsers.map(u => u.id).join(',') : undefined,
        lastThreadQuoteId:     quotedPost?.threadId || undefined,
        lastThreadQuoteUserId: quotedPost?.userId   || undefined,
      });
      clearDraft(topic.id);
      onSubmitted?.();
    } catch (err) {
      setError(extractApiError(err, 'Failed to send reply.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSaveDraft() {
    const el = editorRef.current;
    saveDraft(topic.id, el?.innerHTML?.trim() || '');
    onClose();
  }

  const canSubmit = charCount >= 1 && !submitting;
  const topicSnippet = topic.title?.length > 32
    ? topic.title.slice(0, 32) + '…'
    : (topic.title || 'topic');

  const sheetContent = (
    <div className={`${styles.sheet}${standalone ? ' ' + styles.sheetFull : ''}`}>

      {/* Drag handle — only for bottom-sheet mode */}
      {!standalone && <div className={styles.dragHandle} />}

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {user?.userName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className={styles.headerMeta}>
              <span className={styles.headerTitle}>Post a Reply</span>
              <span className={styles.headerSub}>
                as <strong>{user?.userName || 'you'}</strong> in {topicSnippet}
              </span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.body}>

          {/* Message card */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>
              Message
              <span className={styles.required}>Required</span>
            </div>
            <div className={styles.editorCard}>
              {/* Toolbar */}
              <div className={styles.toolbar}>
                {TOOLS.map(tool => {
                  if (tool.id.startsWith('sep')) return <div key={tool.id} className={styles.sep} />;
                  const isActive = activeFormats[tool.id];
                  return (
                    <button
                      key={tool.id}
                      title={tool.title}
                      className={[
                        styles.toolBtn,
                        isActive          ? styles.toolBtnActive : '',
                        tool.id === 'bold'   ? styles.toolBold   : '',
                        tool.id === 'italic' ? styles.toolItalic : '',
                        tool.id === 'under'  ? styles.toolUnder  : '',
                      ].join(' ')}
                      onMouseDown={e => { e.preventDefault(); applyTool(tool); }}
                    >
                      {tool.icon ?? tool.label}
                    </button>
                  );
                })}
              </div>
              <div className={styles.toolbarDivider} />
              {/* Editor */}
              <div
                ref={editorRef}
                className={styles.editor}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Enter your message here"
                onInput={() => { syncMetrics(); refreshActive(); }}
                onKeyUp={refreshActive}
                onMouseUp={refreshActive}
                onPaste={e => {
                  e.preventDefault();
                  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
                  syncMetrics();
                }}
              />
              {/* Char counter inside card */}
              <div className={styles.charCount}>{charCount} chars</div>
            </div>
          </div>

          {/* Content flags */}
          <div className={styles.section}>
            <div className={styles.flagRow}>
              <button
                className={`${styles.flagBtn} ${membersOnly ? styles.flagBtnAmber : ''}`}
                onClick={() => setMembersOnly(v => !v)}
                type="button"
              >
                <span className={`${styles.flagCheck} ${membersOnly ? styles.flagCheckOn : ''}`}>
                  {membersOnly && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                Members Only
              </button>
              <button
                className={`${styles.flagBtn} ${matured ? styles.flagBtnRed : ''}`}
                onClick={() => setMatured(v => !v)}
                type="button"
              >
                <span className={`${styles.flagCheck} ${matured ? styles.flagCheckOn : ''}`}>
                  {matured && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                Matured Content
              </button>
            </div>
          </div>

          {/* Tag Users */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Tag Users</div>
            <div className={styles.tagRow}>
              <div className={styles.tagArea}>
                {taggedUsers.map(u => (
                  <span key={u.id} className={styles.tagChip}>
                    @{u.userName}
                    <button
                      className={styles.tagChipRemove}
                      type="button"
                      onClick={() => removeTaggedUser(u.id)}
                      aria-label={`Remove ${u.userName}`}
                    >×</button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  className={styles.tagSearchInput}
                  type="text"
                  placeholder={taggedUsers.length ? 'Add more…' : 'Search buddies to tag'}
                  value={tagSearch}
                  onChange={e => { setTagSearch(e.target.value); if (!showBuddyPicker) setShowBuddyPicker(true); }}
                  onFocus={() => setShowBuddyPicker(true)}
                />
              </div>
              <button
                className={`${styles.tagBuddiesBtn} ${showBuddyPicker ? styles.tagBuddiesBtnActive : ''}`}
                type="button"
                onClick={handleTagBuddies}
              >
                TAG BUDDIES
              </button>
            </div>
            {showBuddyPicker && (
              <div className={styles.buddyPicker}>
                {buddiesLoading && (
                  <div className={styles.buddyPickerState}>Loading buddies…</div>
                )}
                {!buddiesLoading && buddiesError && (
                  <div className={styles.buddyPickerState} style={{ color: 'var(--red)' }}>
                    {buddiesError}
                  </div>
                )}
                {!buddiesLoading && !buddiesError && (() => {
                  const q = tagSearch.trim().toLowerCase();
                  const filtered = q
                    ? buddies.filter(b => (b.userName || '').toLowerCase().includes(q) || (b.realName || '').toLowerCase().includes(q))
                    : buddies;
                  if (filtered.length === 0) return (
                    <div className={styles.buddyPickerState}>
                      {buddies.length === 0 ? 'No buddies found.' : 'No match.'}
                    </div>
                  );
                  return filtered.map((b, i) => {
                    const username = b.userName || 'User';
                    const sub = b.realName && b.realName !== username ? b.realName : (b.groupName || '');
                    const tagged = taggedUsers.some(u => u.id === b.userId);
                    return (
                      <div
                        key={b.userId ?? i}
                        className={styles.buddyPickerRow}
                        onClick={() => selectBuddy(b)}
                      >
                        <div className={styles.buddyPickerAvatar}>
                          {username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className={styles.buddyPickerName}>{username}</div>
                          {sub && <div className={styles.buddyPickerSub}>{sub}</div>}
                        </div>
                        {tagged && (
                          <svg className={styles.buddyPickerCheck} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Post settings */}
          <div className={styles.section}>
            <label className={styles.checkRow}>
              <span className={`${styles.checkBox} ${showSig ? styles.checkBoxOn : ''}`}>
                {showSig && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <input type="checkbox" checked={showSig} onChange={e => setShowSig(e.target.checked)} className={styles.hiddenCheck} />
              <span className={styles.checkLabel}>Show Signature</span>
            </label>
            <label className={styles.checkRow}>
              <span className={`${styles.checkBox} ${watchList ? styles.checkBoxOn : ''}`}>
                {watchList && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              <input type="checkbox" checked={watchList} onChange={e => setWatchList(e.target.checked)} className={styles.hiddenCheck} />
              <span className={styles.checkLabel}>Add To Watch List (To Get Reply Notifications)</span>
            </label>
          </div>

          {/* Mock reCAPTCHA */}
          <div className={styles.section}>
            <div
              className={`${styles.captchaBox} ${captchaDone ? styles.captchaDone : ''}`}
              onClick={() => setCaptchaDone(v => !v)}
              role="checkbox"
              aria-checked={captchaDone}
            >
              <div className={`${styles.captchaCheck} ${captchaDone ? styles.captchaCheckDone : ''}`}>
                {captchaDone && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <span className={styles.captchaLabel}>I'm not a robot</span>
              <div className={styles.captchaBrand}>
                <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" fill="#4285f4" opacity=".15"/>
                  <text x="32" y="40" textAnchor="middle" fontSize="22" fill="#4285f4" fontWeight="700">rC</text>
                </svg>
                <span className={styles.captchaText}>reCAPTCHA</span>
                <span className={styles.captchaPrivacy}>Privacy · Terms</span>
              </div>
            </div>
          </div>

          <div className={styles.bottomSpacer} />
        </div>

        {/* ── Actions footer (sticky) ── */}
        <div className={styles.actions}>
          {error && (
            <div className={styles.errorMsg}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
          <div className={styles.actionsRow}>
            <button
              className={`${styles.submitBtn} ${canSubmit ? styles.submitBtnActive : ''}`}
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  SUBMIT
                </>
              )}
            </button>
            <button className={styles.draftBtn} onClick={handleSaveDraft}>
              SAVE DRAFT
            </button>
            <button className={styles.draftsLink} onClick={onClose}>
              My Drafts
            </button>
          </div>
        </div>

    </div>
  );

  if (standalone) return sheetContent;
  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />
      {sheetContent}
    </div>
  );
}
