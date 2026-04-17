import { useState, useEffect, useMemo } from 'react';
import { getThreadLikes } from '../../services/forumsApi';
import { extractApiError } from '../../services/api';
import styles from './ReactionsSheet.module.css';

const REACTION_OPTIONS = [
  { code: 1, emoji: '👍', label: 'Like'  },
  { code: 2, emoji: '❤️', label: 'Love'  },
  { code: 3, emoji: '😮', label: 'Wow'   },
  { code: 4, emoji: '😂', label: 'Lol'   },
  { code: 5, emoji: '😱', label: 'Shock' },
  { code: 6, emoji: '😢', label: 'Sad'   },
  { code: 7, emoji: '😠', label: 'Angry' },
];

function emojiForType(lt) {
  return REACTION_OPTIONS.find(o => o.code === Number(lt))?.emoji ?? '👍';
}
function labelForType(lt) {
  return REACTION_OPTIONS.find(o => o.code === Number(lt))?.label ?? 'Like';
}

// Construct member avatar URL from ThreadLikeDto fields
// avatarType === 0 → no photo (use initials); > 0 → has photo
function buildAvatarUrl(userId, avatarType, updateChecksum) {
  if (!avatarType || avatarType === 0 || !userId) return null;
  const bucket = Math.floor(Number(userId) / 10000);
  const qs = updateChecksum ? `?uc=${updateChecksum}` : '';
  return `https://img.indiaforums.com/member/100x100/${bucket}/${userId}.webp${qs}`;
}

// Parse badgeJson string → array of { id, name, imageUrl }
function parseBadges(liker) {
  try {
    if (liker.badgeJson) {
      const parsed = JSON.parse(liker.badgeJson);
      return (parsed?.json || []).map(b => ({
        id:       b.id ?? b.lid,
        name:     b.nm || '',
        imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
      }));
    }
  } catch {}
  return [];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReactionsSheet({ post, onClose }) {
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [likers,    setLikers]    = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    console.log('[ReactionsSheet] fetching likes for threadId:', post.id);
    getThreadLikes(post.id)
      .then(res => {
        if (cancelled) return;
        console.log('[ReactionsSheet] raw response:', res?.data);
        // Schema: GetThreadLikesResponseDto → { threadId, likes: ThreadLikeDto[], totalCount }
        const d = res?.data;
        const list =
          Array.isArray(d?.likes)       ? d.likes       :
          Array.isArray(d)              ? d              :
          Array.isArray(d?.data?.likes) ? d.data.likes   :
          Array.isArray(d?.data)        ? d.data         :
          Array.isArray(d?.items)       ? d.items        :
          [];
        console.log('[ReactionsSheet] parsed likers:', list.length, list[0]);
        setLikers(list);
      })
      .catch(err => {
        if (!cancelled) setError(extractApiError(err, 'Could not load reactions'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [post.id]);

  // Count per reaction type (using likeType field from ThreadLikeDto)
  const countsByType = useMemo(() => {
    const map = {};
    for (const l of likers) {
      const lt = String(l.likeType ?? l.reactionType ?? l.lt ?? 1);
      map[lt] = (map[lt] || 0) + 1;
    }
    return map;
  }, [likers]);

  // Tabs: ALL + each reaction type sorted by count desc
  const tabs = useMemo(() => {
    const typeTabs = Object.entries(countsByType)
      .sort((a, b) => b[1] - a[1])
      .map(([lt, count]) => ({
        key:   lt,
        emoji: emojiForType(lt),
        label: labelForType(lt),
        count,
      }));
    return [
      { key: 'all', emoji: null, label: 'ALL', count: likers.length },
      ...typeTabs,
    ];
  }, [likers.length, countsByType]);

  // Filtered list for the active tab
  const filtered = useMemo(() => {
    if (activeTab === 'all') return likers;
    return likers.filter(l => {
      const lt = String(l.likeType ?? l.reactionType ?? l.lt ?? 1);
      return lt === activeTab;
    });
  }, [likers, activeTab]);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle} />

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.headerTitle}>Reactions</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.emoji && <span className={styles.tabEmoji}>{tab.emoji}</span>}
              <span className={styles.tabLabel}>{tab.label}</span>
              <span className={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className={styles.list}>
          {loading && (
            <div className={styles.stateWrap}>
              <div className={styles.spinner} />
              <span className={styles.stateText}>Loading reactions…</span>
            </div>
          )}
          {!loading && error && (
            <div className={styles.stateWrap}>
              <span className={styles.stateError}>{error}</span>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className={styles.stateWrap}>
              <span className={styles.stateText}>No reactions yet.</span>
            </div>
          )}

          {!loading && !error && filtered.map((liker, i) => {
            // ── Field mapping per ThreadLikeDto schema ──────────────────────
            const lt           = liker.likeType ?? liker.reactionType ?? liker.lt ?? 1;
            const emoji        = emojiForType(lt);
            const displayName  = liker.realName  || liker.userName || 'User';
            const username     = liker.userName  || '';
            const rank         = liker.groupName || liker.rank || '';
            const rankLevel    = liker.userLevel ?? liker.rankId ?? null;
            const avatarUrl    = buildAvatarUrl(liker.userId, liker.avatarType, liker.updateChecksum);
            const avatarAccent = liker.avatarAccent || null;
            const badges       = parseBadges(liker);
            const MAX_VISIBLE  = 3;
            const visibleBadges = badges.slice(0, MAX_VISIBLE);
            const extraBadges   = badges.length > MAX_VISIBLE ? badges.length - MAX_VISIBLE : 0;

            return (
              <div key={liker.userId ?? i} className={styles.row}>
                {/* Avatar + reaction emoji corner */}
                <div className={styles.avatarWrap}>
                  <div
                    className={styles.avatar}
                    style={avatarAccent ? { background: avatarAccent } : undefined}
                  >
                    {avatarUrl ? (
                      <>
                        <img
                          src={avatarUrl}
                          alt=""
                          className={styles.avatarImg}
                          loading="lazy"
                          decoding="async"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <span className={styles.avatarLetter} style={{ display: 'none' }}>
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </>
                    ) : (
                      <span className={styles.avatarLetter}>
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className={styles.reactionCorner}>{emoji}</span>
                </div>

                {/* Name + meta */}
                <div className={styles.info}>
                  <span className={styles.displayName}>{displayName}</span>
                  <div className={styles.metaRow}>
                    {username && (
                      <span className={styles.username}>@{username}</span>
                    )}
                    {rank && (
                      <span className={styles.rankPill}>
                        {rank}
                        {rankLevel != null && (
                          <span className={styles.rankNum}>{rankLevel}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Achievement badges */}
                {visibleBadges.length > 0 && (
                  <div className={styles.badges}>
                    {visibleBadges.map((b, bi) => (
                      <img
                        key={b.id ?? bi}
                        src={b.imageUrl}
                        alt={b.name}
                        title={b.name}
                        className={styles.badge}
                        loading="lazy"
                        decoding="async"
                      />
                    ))}
                    {extraBadges > 0 && (
                      <span className={styles.badgeExtra}>+{extraBadges}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
