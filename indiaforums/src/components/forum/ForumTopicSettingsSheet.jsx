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

const NEEDS_TOPIC = ['edit', 'migrateFF', 'move', 'merge', 'lock', 'trash', 'history'];

export default function ForumTopicSettingsSheet({ forumDetail, topics, selectedForum, onClose, onActionComplete }) {
  const [selectedTopic,    setSelectedTopic]    = useState(null);
  const [activeAction,     setActiveAction]     = useState(null);
  const [busy,             setBusy]             = useState(false);
  const [error,            setError]            = useState(null);
  const [success,          setSuccess]          = useState(null);

  const [targetForumId,    setTargetForumId]    = useState('');
  const [targetTopicId,    setTargetTopicId]    = useState('');
  const [editSubject,      setEditSubject]      = useState('');
  const [hideSignatureOn,  setHideSignatureOn]  = useState(false);

  const [historyLogs,      setHistoryLogs]      = useState([]);
  const [historyLoading,   setHistoryLoading]   = useState(false);

  const fd = forumDetail;

  const menuItems = useMemo(() => {
    if (!fd) return [];
    const items = [];
    if (fd.editPosts > 0)
      items.push({ key: 'edit',        label: 'Edit Topic',     icon: '✏️' });
    if (fd.priorityPosts > 0) {
      items.push({ key: 'migrateFF',   label: 'Migrate FF',     icon: '↗️' });
      items.push({ key: 'move',        label: 'Move Topic',     icon: '📁' });
      items.push({ key: 'merge',       label: 'Merge Topic',    icon: '⤵️' });
      const isLocked = selectedTopic?.locked ?? false;
      items.push({ key: 'lock', label: isLocked ? 'Unlock Topic' : 'Lock Topic', icon: isLocked ? '🔓' : '🔒' });
    }
    if (fd.deletePosts > 0)
      items.push({ key: 'trash',       label: 'Trash Topic',    icon: '🗑️', danger: true });
    if (fd.priorityPosts > 0 || fd.editPosts > 0)
      items.push({ key: 'history',     label: 'Topic History',  icon: '🕐' });
    items.push({ key: 'hideSignature', label: 'Hide Signature', icon: '👁️' });
    items.push({ key: 'team',          label: 'Team',           icon: '👥' });
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
    if (action === 'edit' && selectedTopic) setEditSubject(selectedTopic.title || '');
    if (action === 'history' && selectedTopic) loadHistory(selectedTopic.id);
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
      const res = await getTopicActionHistory({ topicId, pageSize: 30 });
      const raw = res.data?.logs ?? res.data?.results ?? res.data ?? [];
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
        return runAction(() => updateTopicAdminSettings(topicId, { subject }), 'Topic updated.');
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
        return runAction(() => mergeTopic({ topicId, newTopicId: intoId }), 'Topic merged.');
      }
      case 'lock': {
        const locked = selectedTopic?.locked ?? false;
        return runAction(
          locked ? () => openTopic({ topicId, forumId }) : () => closeTopic({ topicId, forumId }),
          locked ? 'Topic unlocked.' : 'Topic locked.',
        );
      }
      case 'trash':
        return runAction(() => trashTopics([topicId], forumId ? [forumId] : undefined), 'Topic trashed.');
      default:
        return;
    }
  }

  const isPickingTopic = typeof activeAction === 'string' && activeAction.startsWith('__pick__');
  const team = parseTeam(fd?.teamJson);
  const displayTitle = isPickingTopic
    ? 'Select Topic'
    : activeAction
      ? (menuItems.find(m => m.key === activeAction)?.label ?? 'Topic Settings')
      : 'Topic Settings';

  return (
    <>
      <div className={styles.backdrop} onClick={() => { reset(); onClose(); }} />
      <div className={styles.sheet}>

        <div className={styles.handle} />

        <div className={styles.header}>
          {activeAction && !isPickingTopic ? (
            <button
              className={styles.backBtn}
              onClick={() => { setActiveAction(null); setError(null); setSuccess(null); }}
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className={styles.headerSpacer} />
          )}
          <span className={styles.title}>{displayTitle}</span>
          <button className={styles.closeBtn} onClick={() => { reset(); onClose(); }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1.5 1.5l11 11M12.5 1.5l-11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Topic picker ──────────────────────────────────────────────────── */}
        {isPickingTopic && (
          <div className={styles.topicPicker}>
            <p className={styles.pickerHint}>Choose a topic to apply this action to:</p>
            <div className={styles.pickerList}>
              {topics.map(t => (
                <button key={t.id} className={styles.pickerItem} onClick={() => pickTopic(t)}>
                  {t.locked && <span className={styles.pickerLock}>🔒</span>}
                  <span className={styles.pickerTitle}>{t.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Main menu ─────────────────────────────────────────────────────── */}
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
                      <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Action sub-views ──────────────────────────────────────────────── */}
        {activeAction && !isPickingTopic && (
          <div className={styles.form}>
            {selectedTopic && NEEDS_TOPIC.includes(activeAction) && (
              <div className={styles.selectedTopicBanner}>
                <span className={styles.selectedTopicLabel}>Topic:</span>
                <span className={styles.selectedTopicTitle}>{selectedTopic.title}</span>
              </div>
            )}

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

            {activeAction === 'lock' && (
              <div className={styles.confirmText}>
                {selectedTopic?.locked
                  ? 'Unlock this topic and allow new replies?'
                  : 'Lock this topic to prevent new replies?'}
              </div>
            )}

            {activeAction === 'trash' && (
              <div className={styles.confirmText}>
                Move this topic to the trash? Moderators can restore it later.
              </div>
            )}

            {activeAction === 'history' && (
              <div className={styles.historyList}>
                {historyLoading && <div className={styles.historyLoading}>Loading history…</div>}
                {!historyLoading && historyLogs.length === 0 && (
                  <div className={styles.historyEmpty}>No history found for this topic.</div>
                )}
                {historyLogs.map((log, i) => (
                  <div key={i} className={styles.historyItem}>
                    <span className={styles.historyAction}>{log.actionText ?? `Action ${log.action}`}</span>
                    <span className={styles.historyMeta}>{log.userName} · {formatDate(log.createdWhen)}</span>
                  </div>
                ))}
              </div>
            )}

            {activeAction === 'hideSignature' && (
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Hide member signatures in this topic</span>
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

            {activeAction === 'team' && (
              <div className={styles.teamList}>
                {team.length === 0 && <div className={styles.historyEmpty}>No team members found.</div>}
                {team.map((member, i) => (
                  <div key={i} className={styles.teamMember}>
                    <div className={styles.teamAvatar}>
                      {(member.userName || member.username || '?')[0].toUpperCase()}
                    </div>
                    <div className={styles.teamInfo}>
                      <span className={styles.teamName}>{member.userName || member.username || 'Unknown'}</span>
                      {member.role && <span className={styles.teamRole}>{member.role}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error   && <div className={styles.error}>{error}</div>}
            {success && <div className={styles.success}>{success}</div>}

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
