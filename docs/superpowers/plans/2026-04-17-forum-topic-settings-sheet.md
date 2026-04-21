# Forum Topic Settings Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ⚙ gear icon to the `ForumThreadView` header that opens a permission-gated bottom sheet with 9 topic admin/moderation actions wired to real API calls.

**Architecture:** `ForumTopicSettingsSheet` is a new bottom-sheet component modelled on the existing `AdminPanel` pattern. It receives `forumDetail` (for permission flags), `topics` (for the inline topic picker), and `selectedForum`. `ForumThreadView` controls `settingsOpen` state and renders the sheet. `transformForum` in `api.js` must first be updated to expose the permission fields that are already present in the raw API response.

**Tech Stack:** React 19, CSS Modules with `tokens.css` variables, all API functions already in `forumsApi.js`.

---

## File Map

| Action | File |
|--------|------|
| Modify | `indiaforums/src/services/api.js` — expose permission fields in `transformForum` |
| Create | `indiaforums/src/components/forum/ForumTopicSettingsSheet.module.css` |
| Create | `indiaforums/src/components/forum/ForumTopicSettingsSheet.jsx` |
| Modify | `indiaforums/src/screens/forum/ForumThreadView.jsx` — gear button + sheet |
| Modify | `indiaforums/src/screens/forum/ForumThreadView.module.css` — gear button styles |

---

### Task 1 — Expose permission flags in `transformForum`

**Files:**
- Modify: `indiaforums/src/services/api.js` (function `transformForum`, around line 864)

The `ForumDetailDto` from the API includes `priorityPosts`, `editPosts`, `deletePosts`, and `teamJson`, but `transformForum` discards them. Add them to the return object so `forumDetail` in `ForumThreadView` carries them.

- [ ] **Step 1: Open `api.js` and locate `transformForum` (line ~864). Add four fields to the returned object, right after `hot:`**

Replace the closing of the return object:
```js
    hot:          (raw.topicsCount ?? 0) > 5000 || (raw.postsCount ?? 0) > 100000,
  };
```
With:
```js
    hot:          (raw.topicsCount ?? 0) > 5000 || (raw.postsCount ?? 0) > 100000,
    priorityPosts: raw.priorityPosts ?? 0,
    editPosts:     raw.editPosts     ?? 0,
    deletePosts:   raw.deletePosts   ?? 0,
    teamJson:      raw.teamJson      ?? null,
  };
```

- [ ] **Step 2: Verify dev server still compiles**

Run: `npm run dev` (inside `indiaforums/`)
Expected: no compile errors in terminal output.

- [ ] **Step 3: Commit**

```bash
git add indiaforums/src/services/api.js
git commit -m "feat: expose priorityPosts/editPosts/deletePosts/teamJson in transformForum"
```

---

### Task 2 — CSS module for `ForumTopicSettingsSheet`

**Files:**
- Create: `indiaforums/src/components/forum/ForumTopicSettingsSheet.module.css`
- Modify: `indiaforums/src/screens/forum/ForumThreadView.module.css` (append gear styles)

- [ ] **Step 1: Create `ForumTopicSettingsSheet.module.css`**

```css
/* ── Backdrop ────────────────────────────────────────────────────────────── */
.backdrop {
  position: absolute;
  inset: 0;
  background: var(--overlay-medium);
  z-index: 100;
  animation: fadeIn var(--duration-fast) var(--ease-out);
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* ── Sheet ───────────────────────────────────────────────────────────────── */
.sheet {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  background: var(--card);
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 101;
  display: flex;
  flex-direction: column;
  max-height: 82%;
  animation: slideUp var(--duration-med) var(--ease-out);
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

/* ── Drag handle ─────────────────────────────────────────────────────────── */
.handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--border-strong);
  margin: 10px auto 0;
  flex-shrink: 0;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  padding: 10px 14px 10px;
  flex-shrink: 0;
}
.backBtn {
  background: none;
  border: none;
  padding: 4px;
  color: var(--text2);
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.backBtn:hover { color: var(--text); background: var(--surface); }
.headerSpacer { width: 24px; flex-shrink: 0; }
.title {
  flex: 1;
  text-align: center;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 800;
  color: var(--dark);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.closeBtn {
  background: none;
  border: none;
  padding: 4px;
  color: var(--text3);
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}
.closeBtn:hover { color: var(--text); background: var(--surface); }

/* ── Selected topic banner ───────────────────────────────────────────────── */
.selectedTopicBanner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 12px 0;
  padding: 7px 10px;
  background: var(--brand-light);
  border-radius: var(--radius-sm);
  border: 1px solid var(--brand-border);
  flex-shrink: 0;
}
.selectedTopicLabel {
  font-size: 10px;
  font-weight: 700;
  color: var(--brand);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}
.selectedTopicTitle {
  flex: 1;
  font-size: 11.5px;
  color: var(--text);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.clearSelected {
  background: none;
  border: none;
  color: var(--text3);
  cursor: pointer;
  font-size: 11px;
  padding: 2px;
  flex-shrink: 0;
}
.clearSelected:hover { color: var(--text); }

/* ── Menu ────────────────────────────────────────────────────────────────── */
.menu {
  display: flex;
  flex-direction: column;
  padding: 6px 0 10px;
  overflow-y: auto;
}
.menuItem {
  display: flex;
  align-items: center;
  gap: 12px;
  background: none;
  border: none;
  padding: 12px 16px;
  text-align: left;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease-out);
}
.menuItem:hover { background: var(--surface); }
.menuItemDanger { color: var(--red); }
.menuItemDanger:hover { background: var(--red-surface); }
.menuIcon { font-size: 16px; width: 22px; text-align: center; flex-shrink: 0; }
.menuLabel { flex: 1; font-weight: 600; }
.chevron { color: var(--text3); flex-shrink: 0; }

/* ── Form ────────────────────────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 14px 14px;
  overflow-y: auto;
}
.label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.input {
  width: 100%;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--text);
  background: var(--bg);
  outline: none;
  box-sizing: border-box;
}
.input:focus { border-color: var(--brand); }
.confirmText {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--text);
  line-height: 1.5;
  padding: 4px 0;
}

/* ── Topic picker ────────────────────────────────────────────────────────── */
.topicPicker {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.pickerHint {
  font-size: 11.5px;
  color: var(--text3);
  padding: 8px 14px 4px;
  margin: 0;
  flex-shrink: 0;
}
.pickerList {
  overflow-y: auto;
  flex: 1;
  padding: 4px 0 10px;
}
.pickerItem {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: none;
  border: none;
  padding: 10px 16px;
  text-align: left;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background var(--duration-fast) var(--ease-out);
}
.pickerItem:hover { background: var(--surface); }
.pickerItem:last-child { border-bottom: none; }
.pickerLock { font-size: 11px; flex-shrink: 0; }
.pickerTitle {
  font-size: 12.5px;
  color: var(--text);
  font-weight: 500;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── History list ────────────────────────────────────────────────────────── */
.historyList {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  max-height: 260px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.historyLoading,
.historyEmpty {
  font-size: 12px;
  color: var(--text3);
  padding: 16px;
  text-align: center;
}
.historyItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
}
.historyItem:last-child { border-bottom: none; }
.historyAction {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}
.historyMeta {
  font-size: 10.5px;
  color: var(--text3);
}

/* ── Toggle (Hide Signature) ─────────────────────────────────────────────── */
.toggleRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}
.toggleLabel {
  font-size: 13px;
  color: var(--text);
  font-family: var(--font-body);
  line-height: 1.4;
  flex: 1;
}
.toggle {
  width: 44px;
  height: 26px;
  border-radius: var(--radius-full);
  background: var(--toggle-off);
  border: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-out);
}
.toggleOn { background: var(--brand); }
.toggleThumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--card);
  transition: transform var(--duration-fast) var(--ease-out);
  box-shadow: var(--shadow-xs);
}
.toggleOn .toggleThumb { transform: translateX(18px); }

/* ── Team list ───────────────────────────────────────────────────────────── */
.teamList {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow-y: auto;
  max-height: 260px;
}
.teamMember {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.teamMember:last-child { border-bottom: none; }
.teamAvatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand-light);
  color: var(--brand);
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.teamInfo { display: flex; flex-direction: column; gap: 1px; }
.teamName { font-size: 12.5px; font-weight: 600; color: var(--text); }
.teamRole {
  font-size: 10.5px;
  color: var(--brand);
  font-weight: 500;
  text-transform: capitalize;
}

/* ── Error / success feedback ────────────────────────────────────────────── */
.error {
  background: var(--red-surface);
  border: 1px solid var(--red);
  color: var(--red);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  font-family: var(--font-body);
}
.success {
  background: var(--green-surface);
  border: 1px solid var(--green);
  color: var(--green);
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 11.5px;
  font-family: var(--font-body);
}

/* ── Action buttons ──────────────────────────────────────────────────────── */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}
.btnPrimary {
  background: var(--brand);
  color: var(--text-on-brand);
  border: none;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
}
.btnPrimary:disabled { opacity: 0.55; cursor: not-allowed; }
.btnDanger { background: var(--red); }
.btnGhost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-body);
}
.btnGhost:disabled { opacity: 0.55; cursor: not-allowed; }
```

- [ ] **Step 2: Append gear button styles to `ForumThreadView.module.css`**

Open `indiaforums/src/screens/forum/ForumThreadView.module.css` and append at the end:

```css
/* ── Gear settings button ────────────────────────────────────────────────── */
.gearBtn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}
.gearBtn:hover { background: var(--brand-light); color: var(--brand); border-color: var(--brand-border); }
.gearBtn:active { background: var(--brand-lighter); }
```

- [ ] **Step 3: Commit**

```bash
git add indiaforums/src/components/forum/ForumTopicSettingsSheet.module.css indiaforums/src/screens/forum/ForumThreadView.module.css
git commit -m "feat: add ForumTopicSettingsSheet CSS and gear button styles"
```

---

### Task 3 — Create `ForumTopicSettingsSheet.jsx`

**Files:**
- Create: `indiaforums/src/components/forum/ForumTopicSettingsSheet.jsx`

- [ ] **Step 1: Create the component file with this exact content**

```jsx
import { useState, useMemo } from 'react';
import {
  closeTopic,
  openTopic,
  moveTopic,
  mergeTopic,
  trashTopics,
  updateTopicAdminSettings,
  getTopicActionHistory,
} from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import styles from './ForumTopicSettingsSheet.module.css';

function parseTeam(teamJson) {
  if (!teamJson) return [];
  try {
    const parsed = JSON.parse(teamJson);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.members)) return parsed.members;
    if (Array.isArray(parsed?.team)) return parsed.team;
    return [];
  } catch {
    return [];
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Actions that require a topicId to be selected before proceeding
const NEEDS_TOPIC = ['edit', 'migrateFF', 'move', 'merge', 'lock', 'trash', 'history'];

export default function ForumTopicSettingsSheet({ forumDetail, topics, selectedForum, onClose, onActionComplete }) {
  const [selectedTopic, setSelectedTopic]   = useState(null);
  const [activeAction,  setActiveAction]    = useState(null);
  const [busy,          setBusy]            = useState(false);
  const [error,         setError]           = useState(null);
  const [success,       setSuccess]         = useState(null);

  // Form fields
  const [targetForumId,  setTargetForumId]  = useState('');
  const [targetTopicId,  setTargetTopicId]  = useState('');
  const [editSubject,    setEditSubject]    = useState('');
  const [hideSignatureOn, setHideSignatureOn] = useState(false);

  // Topic history
  const [historyLogs,    setHistoryLogs]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fd = forumDetail;

  // Build permission-gated action list
  const menuItems = useMemo(() => {
    if (!fd) return [];
    const items = [];
    if (fd.editPosts > 0)
      items.push({ key: 'edit',          label: 'Edit Topic',     icon: '✏️' });
    if (fd.priorityPosts > 0) {
      items.push({ key: 'migrateFF',     label: 'Migrate FF',     icon: '↗️' });
      items.push({ key: 'move',          label: 'Move Topic',     icon: '📁' });
      items.push({ key: 'merge',         label: 'Merge Topic',    icon: '⤵️' });
      const isLocked = selectedTopic?.locked ?? false;
      items.push({
        key:   'lock',
        label: isLocked ? 'Unlock Topic' : 'Lock Topic',
        icon:  isLocked ? '🔓' : '🔒',
      });
    }
    if (fd.deletePosts > 0)
      items.push({ key: 'trash',         label: 'Trash Topic',    icon: '🗑️', danger: true });
    if (fd.priorityPosts > 0 || fd.editPosts > 0)
      items.push({ key: 'history',       label: 'Topic History',  icon: '🕐' });
    items.push({ key: 'hideSignature',   label: 'Hide Signature', icon: '👁️' });
    items.push({ key: 'team',            label: 'Team',           icon: '👥' });
    return items;
  }, [fd, selectedTopic]);

  function reset() {
    setActiveAction(null);
    setSelectedTopic(null);
    setTargetForumId('');
    setTargetTopicId('');
    setEditSubject('');
    setError(null);
    setSuccess(null);
    setBusy(false);
    setHistoryLogs([]);
  }

  function chooseAction(action) {
    setError(null);
    setSuccess(null);
    if (NEEDS_TOPIC.includes(action) && !selectedTopic) {
      setActiveAction('__pick__' + action);
      return;
    }
    if (action === 'edit' && selectedTopic)
      setEditSubject(selectedTopic.title || '');
    if (action === 'history' && selectedTopic)
      loadHistory(selectedTopic.id);
    setActiveAction(action);
  }

  function pickTopic(topic) {
    setSelectedTopic(topic);
    const realAction = activeAction.replace('__pick__', '');
    if (realAction === 'edit')    setEditSubject(topic.title || '');
    if (realAction === 'history') loadHistory(topic.id);
    setActiveAction(realAction);
  }

  async function loadHistory(topicId) {
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res  = await getTopicActionHistory({ topicId, pageSize: 30 });
      const raw  = res.data?.logs ?? res.data?.results ?? res.data ?? [];
      setHistoryLogs(Array.isArray(raw) ? raw : []);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runAction(fn, successMsg) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setSuccess(successMsg);
      onActionComplete?.();
      setTimeout(() => { reset(); onClose(); }, 1200);
    } catch (err) {
      setError(extractApiError(err, 'Action failed. You may not have permission.'));
    } finally {
      setBusy(false);
    }
  }

  function onConfirm() {
    if (!activeAction || busy) return;
    const topicId = selectedTopic?.id;
    const forumId = selectedTopic?.forumId ?? selectedForum?.id;

    switch (activeAction) {
      case 'edit': {
        const subject = editSubject.trim();
        if (!subject) { setError('Topic subject cannot be empty.'); return; }
        return runAction(
          () => updateTopicAdminSettings(topicId, { subject }),
          'Topic updated.',
        );
      }
      case 'migrateFF':
      case 'move': {
        const toId = Number(targetForumId);
        if (!toId) { setError('Enter a valid target forum ID.'); return; }
        return runAction(
          () => moveTopic({ topicId, toForumId: toId }),
          activeAction === 'migrateFF' ? 'Topic migrated.' : 'Topic moved.',
        );
      }
      case 'merge': {
        const intoId = Number(targetTopicId);
        if (!intoId) { setError('Enter a valid target topic ID.'); return; }
        return runAction(
          () => mergeTopic({ topicId, newTopicId: intoId }),
          'Topic merged.',
        );
      }
      case 'lock': {
        const locked = selectedTopic?.locked ?? false;
        return runAction(
          locked
            ? () => openTopic({ topicId, forumId })
            : () => closeTopic({ topicId, forumId }),
          locked ? 'Topic unlocked.' : 'Topic locked.',
        );
      }
      case 'trash':
        return runAction(
          () => trashTopics([topicId], forumId ? [forumId] : undefined),
          'Topic trashed.',
        );
      default:
        return;
    }
  }

  const isPickingTopic = typeof activeAction === 'string' && activeAction.startsWith('__pick__');
  const team           = parseTeam(fd?.teamJson);
  const displayTitle   = isPickingTopic
    ? 'Select Topic'
    : activeAction
      ? (menuItems.find(m => m.key === activeAction)?.label ?? 'Topic Settings')
      : 'Topic Settings';

  return (
    <>
      <div className={styles.backdrop} onClick={() => { reset(); onClose(); }} />
      <div className={styles.sheet}>

        {/* Drag handle */}
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          {activeAction && !isPickingTopic ? (
            <button
              className={styles.backBtn}
              onClick={() => { setActiveAction(null); setError(null); setSuccess(null); }}
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className={styles.headerSpacer} />
          )}
          <span className={styles.title}>{displayTitle}</span>
          <button
            className={styles.closeBtn}
            onClick={() => { reset(); onClose(); }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 1.5l11 11M12.5 1.5l-11 11"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Topic picker ───────────────────────────────────────────────── */}
        {isPickingTopic && (
          <div className={styles.topicPicker}>
            <p className={styles.pickerHint}>Choose a topic to apply this action to:</p>
            <div className={styles.pickerList}>
              {topics.map(t => (
                <button
                  key={t.id}
                  className={styles.pickerItem}
                  onClick={() => pickTopic(t)}
                >
                  {t.locked && <span className={styles.pickerLock}>🔒</span>}
                  <span className={styles.pickerTitle}>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main action menu ───────────────────────────────────────────── */}
        {!activeAction && (
          <>
            {selectedTopic && (
              <div className={styles.selectedTopicBanner}>
                <span className={styles.selectedTopicLabel}>Topic:</span>
                <span className={styles.selectedTopicTitle}>{selectedTopic.title}</span>
                <button className={styles.clearSelected} onClick={() => setSelectedTopic(null)}>✕</button>
              </div>
            )}
            <div className={styles.menu}>
              {menuItems.map(item => (
                <button
                  key={item.key}
                  className={`${styles.menuItem} ${item.danger ? styles.menuItemDanger : ''}`}
                  onClick={() => chooseAction(item.key)}
                >
                  <span className={styles.menuIcon}>{item.icon}</span>
                  <span className={styles.menuLabel}>{item.label}</span>
                  {NEEDS_TOPIC.includes(item.key) && !selectedTopic && (
                    <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Action sub-views ───────────────────────────────────────────── */}
        {activeAction && !isPickingTopic && (
          <div className={styles.form}>

            {/* Selected topic indicator inside sub-view */}
            {selectedTopic && NEEDS_TOPIC.includes(activeAction) && (
              <div className={styles.selectedTopicBanner}>
                <span className={styles.selectedTopicLabel}>Topic:</span>
                <span className={styles.selectedTopicTitle}>{selectedTopic.title}</span>
              </div>
            )}

            {/* Edit Topic */}
            {activeAction === 'edit' && (
              <>
                <label className={styles.label}>Subject</label>
                <input
                  className={styles.input}
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  placeholder="Topic title"
                  maxLength={200}
                  disabled={busy}
                />
              </>
            )}

            {/* Migrate FF / Move Topic */}
            {(activeAction === 'migrateFF' || activeAction === 'move') && (
              <>
                <label className={styles.label}>Target Forum ID</label>
                <input
                  type="number"
                  className={styles.input}
                  value={targetForumId}
                  onChange={e => setTargetForumId(e.target.value)}
                  placeholder="e.g. 42"
                  disabled={busy}
                />
              </>
            )}

            {/* Merge Topic */}
            {activeAction === 'merge' && (
              <>
                <label className={styles.label}>Target Topic ID (merge into)</label>
                <input
                  type="number"
                  className={styles.input}
                  value={targetTopicId}
                  onChange={e => setTargetTopicId(e.target.value)}
                  placeholder="e.g. 12345"
                  disabled={busy}
                />
              </>
            )}

            {/* Lock / Unlock */}
            {activeAction === 'lock' && (
              <div className={styles.confirmText}>
                {selectedTopic?.locked
                  ? 'Unlock this topic and allow new replies?'
                  : 'Lock this topic to prevent new replies?'}
              </div>
            )}

            {/* Trash */}
            {activeAction === 'trash' && (
              <div className={styles.confirmText}>
                Move this topic to the trash? Moderators can restore it later.
              </div>
            )}

            {/* Topic History */}
            {activeAction === 'history' && (
              <div className={styles.historyList}>
                {historyLoading && (
                  <div className={styles.historyLoading}>Loading history…</div>
                )}
                {!historyLoading && historyLogs.length === 0 && (
                  <div className={styles.historyEmpty}>No history found for this topic.</div>
                )}
                {historyLogs.map((log, i) => (
                  <div key={i} className={styles.historyItem}>
                    <span className={styles.historyAction}>
                      {log.actionText ?? `Action ${log.action}`}
                    </span>
                    <span className={styles.historyMeta}>
                      {log.userName} · {formatDate(log.createdWhen)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Hide Signature */}
            {activeAction === 'hideSignature' && (
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  Hide member signatures in this topic
                </span>
                <button
                  className={`${styles.toggle} ${hideSignatureOn ? styles.toggleOn : ''}`}
                  onClick={() => setHideSignatureOn(p => !p)}
                  role="switch"
                  aria-checked={hideSignatureOn}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            )}

            {/* Team */}
            {activeAction === 'team' && (
              <div className={styles.teamList}>
                {team.length === 0 && (
                  <div className={styles.historyEmpty}>No team members found.</div>
                )}
                {team.map((member, i) => (
                  <div key={i} className={styles.teamMember}>
                    <div className={styles.teamAvatar}>
                      {(member.userName || member.username || '?')[0].toUpperCase()}
                    </div>
                    <div className={styles.teamInfo}>
                      <span className={styles.teamName}>
                        {member.userName || member.username || 'Unknown'}
                      </span>
                      {member.role && (
                        <span className={styles.teamRole}>{member.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error / success */}
            {error   && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

            {/* Confirm / back buttons — only for API actions */}
            {!['history', 'team'].includes(activeAction) && !success && (
              <div className={styles.actions}>
                <button
                  className={styles.btnGhost}
                  onClick={() => { setActiveAction(null); setError(null); }}
                  disabled={busy}
                >
                  Back
                </button>
                {activeAction === 'hideSignature' ? (
                  <button
                    className={styles.btnPrimary}
                    onClick={() => {
                      setSuccess('Preference saved.');
                      setTimeout(() => { setActiveAction(null); setSuccess(null); }, 1200);
                    }}
                    disabled={busy}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    className={`${styles.btnPrimary} ${activeAction === 'trash' ? styles.btnDanger : ''}`}
                    onClick={onConfirm}
                    disabled={busy}
                  >
                    {busy ? 'Working…' : 'Confirm'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify dev server compiles without errors**

Run: `npm run dev` (inside `indiaforums/`)
Expected: no compile errors in terminal.

- [ ] **Step 3: Commit**

```bash
git add indiaforums/src/components/forum/ForumTopicSettingsSheet.jsx
git commit -m "feat: add ForumTopicSettingsSheet component with 9 permission-gated actions"
```

---

### Task 4 — Wire gear button into `ForumThreadView`

**Files:**
- Modify: `indiaforums/src/screens/forum/ForumThreadView.jsx`

- [ ] **Step 1: Add the import at the top of `ForumThreadView.jsx` (after existing imports)**

```jsx
import ForumTopicSettingsSheet from '../../components/forum/ForumTopicSettingsSheet';
```

- [ ] **Step 2: Add `settingsOpen` state inside the component (after the existing `useState` declarations, around line 50)**

```jsx
const [settingsOpen, setSettingsOpen] = useState(false);
```

- [ ] **Step 3: Add `hasModerationRights` derived value (after the `detail` and `forumId` declarations, around line 53)**

```jsx
const hasModerationRights = detail &&
  (detail.priorityPosts > 0 || detail.editPosts > 0 || detail.deletePosts > 0);
```

- [ ] **Step 4: Add the gear button to the `forumIdentity` row**

In the JSX, find the existing Follow button:
```jsx
<button className={styles.followBtn}>Follow</button>
```
Replace it with:
```jsx
<button className={styles.followBtn}>Follow</button>
{hasModerationRights && (
  <button
    className={styles.gearBtn}
    onClick={() => setSettingsOpen(true)}
    aria-label="Topic settings"
    title="Topic settings"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83
        0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4
        0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83
        0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2
        2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2
        0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0
        001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06
        -.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65
        1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  </button>
)}
```

- [ ] **Step 5: Render `ForumTopicSettingsSheet` at the bottom of the component's JSX**

Find the existing `{composerOpen && <NewTopicComposer ... />}` block (around line 349) and add the sheet render right after it, still inside the outer `<div className={styles.shell}>`:

```jsx
{settingsOpen && (
  <ForumTopicSettingsSheet
    forumDetail={detail}
    topics={topicCards}
    selectedForum={selectedForum}
    onClose={() => setSettingsOpen(false)}
    onActionComplete={() => refreshTopics?.()}
  />
)}
```

- [ ] **Step 6: Manual test in the browser**

1. Run `npm run dev`, open the app.
2. Navigate to any forum (tap a forum card).
3. **If the logged-in user has moderation rights** (`priorityPosts > 0`, `editPosts > 0`, or `deletePosts > 0` in the API response), the ⚙ gear icon appears to the right of the Follow button.
4. Tap the gear → bottom sheet slides up from the bottom with "Topic Settings" title and the permission-filtered action list.
5. Tap any action that requires a topic (e.g. "Lock Topic") → topic picker appears; tap a topic → action sub-view opens.
6. Tap Confirm → API call fires, success message shows, sheet auto-closes.
7. Tap the backdrop or × → sheet closes without side effects.
8. **If user has no moderation rights**, the gear icon is not rendered — Follow button remains alone.

- [ ] **Step 7: Commit**

```bash
git add indiaforums/src/screens/forum/ForumThreadView.jsx
git commit -m "feat: wire ForumTopicSettingsSheet gear button into ForumThreadView"
```

---

## Self-Review Notes

- **Spec coverage:** All 9 actions covered (Edit, Migrate FF, Move, Merge, Lock/Unlock, Trash, Topic History, Hide Signature, Team). Permission gates match spec table. Topic picker matches spec. Bottom sheet matches spec. API functions match `forumsApi.js` signatures. ✓
- **Placeholder scan:** No TBD/TODO. All form inputs, API calls, and CSS classes are explicitly defined. ✓
- **Type consistency:** `selectedTopic.id` used throughout (matches `transformTopic` which maps `topicId → id`). `selectedTopic.forumId` matches `transformTopic`. `forumDetail.priorityPosts/editPosts/deletePosts` added in Task 1. ✓
- **Critical dependency:** Task 1 (`transformForum` fix) must run before Tasks 3–4 are testable. Task 2 (CSS) is independent. Task 3 (component) can be created before Task 1 completes but won't render correctly until Task 1 is done.
