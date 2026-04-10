import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createTopic } from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import styles from './NewTopicComposer.module.css';

// ── Topic type options ───────────────────────────────────────────────────────
const TOPIC_TYPES = [
  {
    id: 1, label: 'Discussion',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    id: 2, label: 'Poll',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9"/><rect x="9.5" y="7" width="4" height="14"/>
        <rect x="16" y="3" width="4" height="18"/>
      </svg>
    ),
  },
  {
    id: 3, label: 'Question',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
      </svg>
    ),
  },
  {
    id: 4, label: 'Vote Up',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
        <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
      </svg>
    ),
  },
];

// ── Toolbar definition ───────────────────────────────────────────────────────
const FORMAT_TOOLS = [
  { id: 'bold',   title: 'Bold',          cmd: 'bold',          cls: 'bold',   label: 'B' },
  { id: 'italic', title: 'Italic',        cmd: 'italic',        cls: 'italic', label: 'I' },
  { id: 'under',  title: 'Underline',     cmd: 'underline',     cls: 'under',  label: 'U' },
  { id: 'strike', title: 'Strikethrough', cmd: 'strikeThrough', cls: 'strike', label: 'S' },
  { id: 'sep1' },
  {
    id: 'link', title: 'Insert link', cmd: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    id: 'img', title: 'Insert image', cmd: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
  },
  {
    id: 'quote', title: 'Quote', cmd: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.58 17.32C3.55 16.23 3 15 3 13.01c0-3.5 2.46-6.64 6.03-8.19l.89 1.38C6.59 8.04 5.94 10.38 5.68 11.86c.54-.28 1.24-.38 1.93-.31 1.8.17 3.23 1.65 3.23 3.49A3.5 3.5 0 017.33 18.5c-1.07 0-2.1-.49-2.75-1.18zm10 0C13.55 16.23 13 15 13 13.01c0-3.5 2.46-6.64 6.03-8.19l.89 1.38c-3.34 1.8-3.99 4.14-4.25 5.62.54-.28 1.24-.38 1.93-.31 1.8.17 3.23 1.65 3.23 3.49A3.5 3.5 0 0117.33 18.5c-1.07 0-2.1-.49-2.75-1.18z"/>
      </svg>
    ),
  },
  { id: 'sep2' },
  {
    id: 'ul', title: 'Bullet list', cmd: 'insertUnorderedList',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/>
        <line x1="9" y1="18" x2="20" y2="18"/>
        <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
        <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    id: 'ol', title: 'Numbered list', cmd: 'insertOrderedList',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
        <line x1="10" y1="18" x2="21" y2="18"/>
        <path d="M4 4v3h1M3 9h2M5 14H3l2-2.5a1.3 1.3 0 00-2.5-.5" strokeWidth="1.5"/>
      </svg>
    ),
  },
  { id: 'sep3' },
  {
    id: 'code', title: 'Code', cmd: null,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
  {
    id: 'clear', title: 'Remove formatting', cmd: 'removeFormat',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 12l6-8 6 8-4 4H10L6 12z"/>
        <line x1="4" y1="20" x2="20" y2="20"/>
        <line x1="14" y1="12" x2="8" y2="18"/>
      </svg>
    ),
  },
];

const QUERYABLE = {
  bold: 'bold', italic: 'italic', under: 'underline',
  strike: 'strikeThrough', ul: 'insertUnorderedList', ol: 'insertOrderedList',
};

export default function NewTopicComposer({ forum, flairs = [], onClose, onCreated }) {
  const { isAuthenticated } = useAuth();
  const editorRef  = useRef(null);
  const savedRange = useRef(null);

  const [topicTypeId, setTopicTypeId]       = useState(1);
  const [subject, setSubject]               = useState('');
  const [charCount, setCharCount]           = useState(0);
  const [wordCount, setWordCount]           = useState(0);
  const [flairId, setFlairId]               = useState('');
  const [tags, setTags]                     = useState('');
  const [membersOnly, setMembersOnly]       = useState(false);
  const [maturedContent, setMaturedContent] = useState(false);
  const [showSignature, setShowSignature]   = useState(true);
  const [addToWatchList, setAddToWatchList] = useState(true);
  const [showSettings, setShowSettings]     = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState(null);
  const [activeFormats, setActiveFormats]   = useState({});
  const [showFormat, setShowFormat]         = useState(true);

  // ── Poll-specific state (only used when topicTypeId === 2) ───────────────
  const [pollQuestion, setPollQuestion]     = useState('');
  const [pollOptions, setPollOptions]       = useState(['', '']);
  const [pollMultiple, setPollMultiple]     = useState(false);
  const [pollOnly, setPollOnly]             = useState(false);

  const canSubmit =
    subject.trim().length >= 3 &&
    charCount >= 10 &&
    !submitting;

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
  }, []);

  function syncMetrics() {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText || '';
    setCharCount(text.length);
    setWordCount(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
  }

  function refreshActive() {
    const next = {};
    for (const [id, cmd] of Object.entries(QUERYABLE)) {
      try { next[id] = document.queryCommandState(cmd); } catch { next[id] = false; }
    }
    setActiveFormats(next);
  }

  // ── Poll helpers ────────────────────────────────────────────────────────
  function addPollOption() {
    if (pollOptions.length >= 10) return;
    setPollOptions(v => [...v, '']);
  }
  function removePollOption(idx) {
    if (pollOptions.length <= 2) return;
    setPollOptions(v => v.filter((_, i) => i !== idx));
  }
  function updatePollOption(idx, value) {
    setPollOptions(v => v.map((o, i) => i === idx ? value : o));
  }

  function handleInput()   { syncMetrics(); refreshActive(); }
  function handleKeyUp()   { refreshActive(); }
  function handleMouseUp() { refreshActive(); }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  function saveRange() {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }
  function restoreRange() {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }

  function applyFormat(toolId) {
    const el = editorRef.current;
    if (!el) return;
    const tool = FORMAT_TOOLS.find(t => t.id === toolId);

    if (tool?.cmd) {
      el.focus();
      document.execCommand(tool.cmd, false, null);
      syncMetrics(); refreshActive();
      return;
    }

    switch (toolId) {
      case 'link': {
        saveRange();
        const url = window.prompt('Enter URL (e.g. https://example.com):');
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
            bq.innerHTML = '<br>'; range.insertNode(bq);
            const r = document.createRange();
            r.setStart(bq, 0); r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
          }
          syncMetrics();
        }
        break;
      }
      case 'code': {
        el.focus();
        const sel = window.getSelection();
        if (sel?.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const code = document.createElement('code');
          code.className = styles.codeFmt;
          try { range.surroundContents(code); }
          catch { code.textContent = sel.toString(); range.deleteContents(); range.insertNode(code); }
          sel.removeAllRanges(); syncMetrics();
        } else {
          document.execCommand('formatBlock', false, 'pre');
        }
        break;
      }
      default: break;
    }
    refreshActive();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true); setError(null);
    try {
      const htmlContent = editorRef.current?.innerHTML || '';
      const res = await createTopic({
        forumId: forum.id,
        subject: subject.trim(),
        message: htmlContent,
        topicTypeId,
        flairId: flairId ? Number(flairId) : undefined,
        addToWatchList, showSignature,
        membersOnly, maturedContent,
        titleTags: tags.trim() || undefined,
        ...(topicTypeId === 2 && {
          pollQuestion: pollQuestion.trim() || undefined,
          pollOptions:  pollOptions.filter(Boolean),
          pollMultiple,
          pollOnly,
        }),
      });
      const newId = res?.data?.topicId ?? res?.data?.id ?? res?.data?.data?.topicId ?? null;
      onCreated?.(newId, res?.data);
      onClose?.();
    } catch (err) {
      setError(extractApiError(err, 'Failed to create topic. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className={styles.topBar}>
        <div className={styles.topBarCenter}>
          <span className={styles.topBarTitle}>New Topic</span>
          {forum?.name && (
            <span className={styles.topBarForum}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
                <circle cx="5" cy="5" r="5"/>
              </svg>
              {forum.name}
            </span>
          )}
        </div>

        <div className={styles.topActions}>
          <button
            className={`${styles.iconBtn} ${showFormat ? styles.iconBtnActive : ''}`}
            title="Format text"
            aria-label="Toggle formatting"
            aria-pressed={showFormat}
            onClick={() => setShowFormat(v => !v)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7"/>
              <line x1="9" y1="20" x2="15" y2="20"/>
              <line x1="12" y1="4" x2="12" y2="20"/>
            </svg>
          </button>

          <button
            className={`${styles.postBtn} ${canSubmit ? styles.postBtnActive : ''}`}
            title="Post topic"
            aria-label="Post topic"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? <span className={styles.spinner} /> : 'Post'}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className={styles.body}>

        {!isAuthenticated && (
          <div className={styles.authBanner}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            Sign in to post a topic.
          </div>
        )}

        {/* ─ Type selector — horizontal pill tabs ────────────────────────── */}
        <div className={styles.typeTabs}>
          {TOPIC_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.typeTab} ${topicTypeId === t.id ? styles.typeTabActive : ''}`}
              onClick={() => setTopicTypeId(t.id)}
            >
              <span className={styles.typeTabIcon}>{t.icon}</span>
              <span className={styles.typeTabLabel}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ─ Post card — Title + Body + Toggles in one container ────────── */}
        <div className={styles.postCard}>

          {/* Title row with character counter */}
          <div className={styles.subjectRow}>
            <input
              className={styles.subjectInput}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Write a title…"
              maxLength={200}
              disabled={submitting}
            />
            {subject.length > 0 && (
              <span className={`${styles.subjectCount} ${subject.length > 180 ? styles.subjectCountWarn : ''}`}>
                {subject.length}/200
              </span>
            )}
          </div>

          <div className={styles.postCardDivider} />

          {/* ─ Poll fields — visible only when Poll type is selected ──── */}
          {topicTypeId === 2 && (
            <>
              <div className={styles.pollSection}>

                {/* Poll question */}
                <div className={styles.pollBlock}>
                  <div className={styles.pollBlockLabel}>Question</div>
                  <input
                    className={styles.pollInput}
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask the community a question…"
                    disabled={submitting}
                  />
                </div>

                {/* Poll options */}
                <div className={styles.pollBlock}>
                  <div className={styles.pollBlockLabel}>Options</div>
                  <div className={styles.pollOptions}>
                    {pollOptions.map((opt, idx) => (
                      <div key={idx} className={styles.pollOption}>
                        <span className={styles.pollOptionNum}>{idx + 1}</span>
                        <input
                          className={styles.pollOptionInput}
                          type="text"
                          value={opt}
                          onChange={(e) => updatePollOption(idx, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          disabled={submitting}
                        />
                        <button
                          type="button"
                          className={styles.pollOptionDelete}
                          onClick={() => removePollOption(idx)}
                          disabled={pollOptions.length <= 2 || submitting}
                          aria-label="Remove option"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.pollAddBtn}
                      onClick={addPollOption}
                      disabled={submitting || pollOptions.length >= 10}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Option
                    </button>
                  </div>
                </div>

                {/* Poll settings */}
                <div className={styles.pollChecksBlock}>
                  <label className={styles.pollCheckRow}>
                    <input type="checkbox" className={styles.checkBox}
                      checked={pollMultiple}
                      onChange={(e) => setPollMultiple(e.target.checked)}
                      disabled={submitting} />
                    <span className={styles.checkLabel}>Allow Multiple Votes</span>
                  </label>
                  <label className={styles.pollCheckRow}>
                    <input type="checkbox" className={styles.checkBox}
                      checked={pollOnly}
                      onChange={(e) => setPollOnly(e.target.checked)}
                      disabled={submitting} />
                    <span className={styles.checkLabel}>Poll Only (No Replies Allowed)</span>
                  </label>
                </div>

              </div>
              <div className={styles.postCardDivider} />
            </>
          )}

          {/* WYSIWYG body editor */}
          <div
            ref={editorRef}
            className={styles.messageArea}
            contentEditable={submitting ? 'false' : 'true'}
            suppressContentEditableWarning
            tabIndex={0}
            spellCheck
            data-placeholder="What's on your mind?"
            onInput={handleInput}
            onKeyUp={handleKeyUp}
            onMouseUp={handleMouseUp}
            onPaste={handlePaste}
            role="textbox"
            aria-multiline="true"
            aria-label="Message body"
          />

          {charCount > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.wordPill}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
            </div>
          )}

          {/* Members Only + Matured Content toggles */}
          <div className={styles.contentToggles}>
            <button
              type="button"
              className={[
                styles.contentToggle,
                styles.contentToggleAmber,
                membersOnly ? styles.contentToggleActive : '',
              ].join(' ')}
              onClick={() => setMembersOnly(v => !v)}
              disabled={submitting}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              Members Only
            </button>
            <button
              type="button"
              className={[
                styles.contentToggle,
                styles.contentToggleRose,
                maturedContent ? styles.contentToggleActive : '',
              ].join(' ')}
              onClick={() => setMaturedContent(v => !v)}
              disabled={submitting}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Matured Content
            </button>
          </div>

        </div>
        {/* end postCard */}

        {/* ─ Post Settings — collapsible section ─────────────────────────── */}
        <button
          type="button"
          className={styles.settingsToggle}
          onClick={() => setShowSettings(v => !v)}
          aria-expanded={showSettings}
        >
          <span className={styles.settingsToggleLabel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
              <circle cx="9" cy="6" r="2.5" fill="currentColor" stroke="none"/>
              <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none"/>
              <circle cx="9" cy="18" r="2.5" fill="currentColor" stroke="none"/>
            </svg>
            Post Settings
            {(flairId || tags.trim() || !showSignature || !addToWatchList || membersOnly || maturedContent) && (
              <span className={styles.settingsBadge} />
            )}
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`${styles.settingsChevron} ${showSettings ? styles.settingsChevronOpen : ''}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showSettings && (
          <div className={styles.settingsBody}>

            {/* Flair */}
            {flairs.length > 0 && (
              <>
                <div className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>Flair</span>
                  <div className={styles.flairChips}>
                    <button
                      type="button"
                      className={`${styles.flairChip} ${!flairId ? styles.flairChipActive : ''}`}
                      onClick={() => setFlairId('')}
                    >None</button>
                    {flairs.map((f) => {
                      const active = flairId === String(f.id);
                      return (
                        <button key={f.id} type="button"
                          className={`${styles.flairChip} ${active ? styles.flairChipActive : ''}`}
                          style={active && f.bgColor ? { background: f.bgColor, borderColor: f.bgColor, color: '#fff' } : undefined}
                          onClick={() => setFlairId(String(f.id))}
                        >{f.name}</button>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.divider} />
              </>
            )}

            {/* Tags */}
            <div className={styles.fieldRow}>
              <span className={styles.fieldLabel}>Tags</span>
              <input
                className={styles.fieldInput}
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. bollywood, SRK, review"
                disabled={submitting}
              />
            </div>

            <div className={styles.divider} />

            {/* Signature + Watch List */}
            <div className={styles.optionsGroup}>
              <label className={styles.checkRow}>
                <input type="checkbox" className={styles.checkBox}
                  checked={showSignature} onChange={(e) => setShowSignature(e.target.checked)}
                  disabled={submitting} />
                <span className={styles.checkLabel}>Show Signature</span>
              </label>
              <label className={styles.checkRow}>
                <input type="checkbox" className={styles.checkBox}
                  checked={addToWatchList} onChange={(e) => setAddToWatchList(e.target.checked)}
                  disabled={submitting} />
                <span className={styles.checkLabel}>Add To Watch List (Get Reply Notifications)</span>
              </label>
            </div>

          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* ─ Footer — Save Draft + My Drafts ─────────────────────────────── */}
        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.draftBtn}
            onClick={() => {}}
            disabled={submitting || subject.trim().length < 3}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Draft
          </button>
          <button type="button" className={styles.draftsLink} onClick={() => {}}>
            My Drafts
          </button>
        </div>

        <div style={{ height: 24 }} />

      </div>
      {/* end body */}

      {/* ── Format toolbar — pinned above keyboard ──────────────────────────
          Lives outside .body so it stays anchored when the keyboard opens.
      ─────────────────────────────────────────────────────────────────────── */}
      {showFormat && (
        <div className={styles.formatBar} role="toolbar" aria-label="Text formatting">
          <div className={styles.formatTools}>
            {FORMAT_TOOLS.map((tool) =>
              !tool.id || tool.id.startsWith('sep') ? (
                <span key={tool.id} className={styles.formatSep} aria-hidden="true" />
              ) : (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.title}
                  aria-label={tool.title}
                  aria-pressed={activeFormats[tool.id] ?? false}
                  className={[
                    styles.formatBtn,
                    tool.cls ? styles[tool.cls] : '',
                    activeFormats[tool.id] ? styles.formatBtnActive : '',
                  ].filter(Boolean).join(' ')}
                  onMouseDown={(e) => { e.preventDefault(); applyFormat(tool.id); }}
                >
                  {tool.icon ?? tool.label}
                </button>
              )
            )}
          </div>
        </div>
      )}

    </div>
  );
}
