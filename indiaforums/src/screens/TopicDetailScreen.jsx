import React, { useState, useMemo, useEffect } from 'react';
import styles from './TopicDetailScreen.module.css';
import useTopicPosts from '../hooks/useTopicPosts';
import { extractApiError } from '../services/api';
import {
  replyToTopic,
  editPost,
  reactToThread,
  castPollVote,
  getPostEditHistory,
  trashPost,
  THREAD_REACTION_TYPES,
} from '../services/forumsApi';
import { getProfile } from '../services/userProfileApi';
import { useAuth } from '../contexts/AuthContext';
import SocialEmbed, { detectPlatform } from '../components/ui/SocialEmbed';
import AdminPanel from '../components/forum/AdminPanel';

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// Forum thread reactions (mirrors THREAD_REACTION_TYPES from forumsApi)
const REACTION_OPTIONS = [
  { code: THREAD_REACTION_TYPES.LIKE,  emoji: '👍', label: 'Like'  },
  { code: THREAD_REACTION_TYPES.LOVE,  emoji: '❤️', label: 'Love'  },
  { code: THREAD_REACTION_TYPES.WOW,   emoji: '😮', label: 'Wow'   },
  { code: THREAD_REACTION_TYPES.LOL,   emoji: '😂', label: 'Lol'   },
  { code: THREAD_REACTION_TYPES.SHOCK, emoji: '😱', label: 'Shock' },
  { code: THREAD_REACTION_TYPES.SAD,   emoji: '😢', label: 'Sad'   },
  { code: THREAD_REACTION_TYPES.ANGRY, emoji: '😠', label: 'Angry' },
];

// ── Extract social-media URLs from text/html ────────────────────────────────
const SOCIAL_URL_RE = /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.watch|tiktok\.com|reddit\.com|youtube\.com|youtu\.be)[^\s"'<)]+/gi;

function extractSocialUrls(html) {
  if (!html) return [];
  const matches = html.match(SOCIAL_URL_RE);
  if (!matches) return [];
  return [...new Set(matches)];
}

/** Strip social URLs from plain text so they render as embeds instead */
function cleanDescription(text) {
  if (!text) return '';
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  return text.replace(urlRegex, (match) => {
    const cleaned = match.replace(/[.,;:!?]+$/, '');
    return detectPlatform(cleaned) ? '' : match;
  }).replace(/\s{2,}/g, ' ').trim();
}

/** Collect all social URLs from topic description + linkTypeValue */
function getTopicSocialUrls(topic) {
  const urls = new Set();
  if (topic.linkTypeValue && detectPlatform(topic.linkTypeValue)) {
    urls.add(topic.linkTypeValue);
  }
  const matches = topic.description?.match(SOCIAL_URL_RE) || [];
  matches.forEach(u => {
    const cleaned = u.replace(/[.,;:!?]+$/, '');
    if (detectPlatform(cleaned)) urls.add(cleaned);
  });
  return [...urls];
}

// Country code → flag emoji
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// ── Topic description with embedded social content ──────────────────────────
function TopicBodyWithEmbeds({ topic }) {
  const cleanText = useMemo(() => cleanDescription(topic.description), [topic.description]);
  const socialUrls = useMemo(() => getTopicSocialUrls(topic), [topic]);

  return (
    <>
      {cleanText && (
        <div
          className={styles.topicBody}
          dangerouslySetInnerHTML={{ __html: cleanText }}
        />
      )}
      {socialUrls.length > 0 && (
        <div className={styles.embedsRow}>
          {socialUrls.map(url => (
            <SocialEmbed key={url} url={url} />
          ))}
        </div>
      )}
    </>
  );
}

// ── Poll widget ──────────────────────────────────────────────────────────────
function PollWidget({ poll, voted, votedIds, voting, error, onVote }) {
  if (!poll) return null;
  const total = poll.totalVotes || 0;
  return (
    <div className={styles.pollBox}>
      {poll.question && <div className={styles.pollQuestion}>{poll.question}</div>}
      <div className={styles.pollOptions}>
        {poll.options.map((opt) => {
          const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
          const mine = votedIds.includes(opt.id);
          if (voted) {
            return (
              <div key={opt.id} className={`${styles.pollResult} ${mine ? styles.pollResultMine : ''}`}>
                <div className={styles.pollResultBar} style={{ width: `${pct}%` }} />
                <div className={styles.pollResultRow}>
                  <span className={styles.pollResultText}>{opt.text}</span>
                  <span className={styles.pollResultPct}>{pct}%</span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={opt.id}
              className={styles.pollOptionBtn}
              onClick={() => onVote(opt.id)}
              disabled={voting}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
      <div className={styles.pollMeta}>
        {total} {total === 1 ? 'vote' : 'votes'}
      </div>
      {error && <div className={styles.pollError}>{error}</div>}
    </div>
  );
}

// ── Rank badge — smart role detection ────────────────────────────────────────
function RankBadge({ rank }) {
  if (!rank) return null;
  const lower = rank.toLowerCase();
  const isMod   = lower.includes('moderator') || lower.includes('mod');
  const isAdmin = lower.includes('admin') || lower.includes('super');

  if (isMod || isAdmin) {
    return (
      <span className={`${styles.rankBadge} ${isAdmin ? styles.rankBadgeAdmin : styles.rankBadgeMod}`}>
        {isAdmin ? (
          /* Crown for admin */
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 20h20v2H2v-2zM4 17l4-8 4 4 4-6 4 10H4z"/>
          </svg>
        ) : (
          /* Shield for moderator */
          <svg width="8" height="9" viewBox="0 0 12 14" fill="currentColor">
            <path d="M6 0L0 2.5V7c0 3.9 2.56 6.73 6 7 3.44-.27 6-3.1 6-7V2.5L6 0z"/>
          </svg>
        )}
        {rank}
      </span>
    );
  }

  return <span className={styles.rankBadge}>{rank}</span>;
}

// ── Post body with embedded social content ──────────────────────────────────
function PostBodyWithEmbeds({ html }) {
  const socialUrls = useMemo(() => extractSocialUrls(html), [html]);

  return (
    <>
      <div className={styles.postBody} dangerouslySetInnerHTML={{ __html: html }} />
      {socialUrls.length > 0 && (
        <div className={styles.embedsRow}>
          {socialUrls.map(url => (
            <SocialEmbed key={url} url={url} />
          ))}
        </div>
      )}
    </>
  );
}

// ── User mini-card (bottom sheet popup on avatar tap) ──────────────────────
function UserMiniCard({ post, onVisitProfile, onMessageUser, onClose }) {
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(!!post.authorId);

  useEffect(() => {
    if (!post.authorId) return;
    let cancelled = false;
    setFetching(true);
    getProfile(post.authorId)
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        setProfile(d?.user || d || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetching(false); });
    return () => { cancelled = true; };
  }, [post.authorId]);

  // ── Data extraction ────────────────────────────────────────────────────────
  // Confirmed profile endpoint fields: displayName, userName, avatarAccent,
  // avatarType, updateChecksum, userId, lastVisitedDate, badgeJson,
  // groupId, statusCode, privacy, showFeeds, showScrapbook, showSlambook, showTestimonial, email

  const displayName = profile?.displayName || post.realName || post.author;
  const username    = profile?.userName    || post.author;
  const rank        = post.rank || '';
  const flag        = countryFlag(post.countryCode);
  const avatarBg    = profile?.avatarAccent || post.avatarAccent;

  // Avatar: profile API returns thumbnailUrl directly
  const avatarUrl = profile?.thumbnailUrl || post.avatarUrl;

  // Banner: profile API returns bannerUrl directly (1200×400 cover photo)
  const bannerUrl = profile?.bannerUrl || null;

  // Badges: profile.badgeJson is the full set; post.badges is capped at 3
  const badges = useMemo(() => {
    if (profile?.badgeJson) {
      try {
        const parsed = JSON.parse(profile.badgeJson);
        const list = parsed?.json || [];
        return list.map(b => ({
          id: b.id,
          name: b.nm,
          imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
        }));
      } catch (_) { /* fall through */ }
    }
    return post.badges || [];
  }, [profile?.badgeJson, post.badges]);

  // Last visited — human-friendly: "13 Apr 2026"
  const lastSeen = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [profile?.lastVisitedDate]);

  // Online: active within the last 24 hours
  const isOnline = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d)) return false;
    return (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
  }, [profile?.lastVisitedDate]);

  // Post count from post data (API may include it)
  const postCount = post.postCount ?? null;

  return (
    <>
      <div className={styles.miniCardBackdrop} onClick={onClose} />
      <div className={styles.miniCard} role="dialog" aria-modal="true">
        <button type="button" className={styles.miniCardClose} onClick={onClose} aria-label="Close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Banner: real cover photo or blurred avatar fallback ── */}
        <div className={styles.miniCardBanner}>
          <div className={styles.miniCardHandle} />
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt=""
              className={styles.miniCardBannerImg}
              decoding="async"
              aria-hidden="true"
            />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={styles.miniCardBannerBg}
              decoding="async"
              aria-hidden="true"
            />
          ) : null}
          {/* Soft white fade at the bottom so the avatar ring pops cleanly */}
          <div className={styles.miniCardBannerFade} />
        </div>

        {/* ── Horizontal row: avatar LEFT + identity RIGHT ── */}
        <div className={styles.miniCardProfileRow}>

          {/* Avatar — lifts up into the banner */}
          <div className={styles.miniCardAvatar} style={avatarBg ? { background: avatarBg } : undefined}>
            {avatarUrl ? (
              <>
                <img src={avatarUrl} alt="" className={styles.miniCardAvatarImg}
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling.style.display = 'flex'; }}
                />
                <span className={styles.miniCardAvatarLetter} style={{ display: 'none' }}>
                  {(displayName || 'A').charAt(0).toUpperCase()}
                </span>
              </>
            ) : (
              <span className={styles.miniCardAvatarLetter}>{(displayName || 'A').charAt(0).toUpperCase()}</span>
            )}
            {isOnline && <span className={styles.miniCardOnlineDot} aria-label="Online now" />}
          </div>

          {/* Identity — stacked on the right */}
          <div className={styles.miniCardIdentity}>
            <div className={styles.miniCardRealName}>{displayName}</div>
            <div className={styles.miniCardUsernameRow}>
              <span className={styles.miniCardUsername}>@{username}</span>
              {post.countryCode && post.countryCode.length === 2 && (
                <span className={styles.miniCardCountryCode}>{post.countryCode.toUpperCase()}</span>
              )}
            </div>
            {(rank || postCount != null) && (
              <div className={styles.miniCardRankRow}>
                {rank && (
                  <div className={styles.miniCardRankPill}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    {rank}
                  </div>
                )}
                {postCount != null && (
                  <span className={styles.miniCardPostCount}>{formatNum(postCount)} posts</span>
                )}
              </div>
            )}
            {!fetching && lastSeen && (
              <div className={styles.miniCardLastSeenInline}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {lastSeen}
              </div>
            )}
          </div>
        </div>{/* /miniCardProfileRow */}

        {/* ── Badges ── */}
        {fetching && badges.length === 0 ? (
          <div className={styles.miniCardBadgesSkeleton}>
            {[0,1,2].map(i => <div key={i} className={styles.miniCardBadgeSkeletonItem} />)}
          </div>
        ) : badges.length > 0 ? (
          <div className={styles.miniCardBadges}>
            {badges.slice(0, 6).map(b => (
              <img
                key={b.id}
                src={b.imageUrl}
                alt={b.name}
                title={b.name}
                className={styles.miniCardBadgeImg}
                loading="lazy"
                decoding="async"
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ))}
            {badges.length > 6 && (
              <span className={styles.miniCardBadgeMore}>+{badges.length - 6}</span>
            )}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className={styles.miniCardActions}>
          {post.authorId && onVisitProfile && (
            <button
              type="button"
              className={styles.miniCardVisitBtn}
              onClick={() => { onClose(); onVisitProfile({ userId: post.authorId, username: post.author }); }}
            >
              Visit Profile
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {post.authorId && onMessageUser && (
            <button
              type="button"
              className={styles.miniCardMsgBtn}
              onClick={() => { onClose(); onMessageUser({ userId: post.authorId, username: post.author }); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Message
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default function TopicDetailScreen({ topic, onVisitProfile, onMessageUser }) {
  const { posts, topicDetail, loading, loadingMore, error, hasMore, loadMore, refresh } = useTopicPosts(topic?.id);
  const { user, isAuthenticated, isModerator } = useAuth();

  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);
  const [replyError, setReplyError] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  // Mini user card (avatar tap)
  const [activeUserCard, setActiveUserCard] = useState(null);

  // Per-post UI state for edit + reactions
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);
  const [postReactions, setPostReactions] = useState({}); // { [postId]: reactionTypeCode }
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

  // Poll vote state
  const [pollVoting, setPollVoting]   = useState(false);
  const [pollError, setPollError]     = useState(null);
  const [pollVotedIds, setPollVotedIds] = useState(null); // null = use server hasVoted

  // Post edit-history modal
  const [historyForPostId, setHistoryForPostId] = useState(null);

  // Sticky header
  const [stickyVisible, setStickyVisible] = useState(false);
  function handleScroll(e) {
    setStickyVisible(e.currentTarget.scrollTop > 110);
  }

  if (!topic) return null;

  // Merge in any topicDetail returned from the posts call (forumId, latest stats)
  const liveTopic = topicDetail ? { ...topic, ...topicDetail } : topic;
  const forumId = liveTopic.forumId;

  const sortedPosts = sortBy === 'likes'
    ? [...posts].sort((a, b) => (b.likes || 0) - (a.likes || 0))
    : posts;

  async function handleReply() {
    if (!replyText.trim() || sending) return;
    if (!isAuthenticated) {
      setReplyError('Please sign in to reply.');
      return;
    }
    setSending(true);
    setReplyError(null);
    try {
      await replyToTopic(liveTopic.id, {
        forumId,
        message: replyText.trim(),
      });
      setReplyText('');
      refresh();
    } catch (err) {
      setReplyError(extractApiError(err, 'Failed to send reply'));
    } finally {
      setSending(false);
    }
  }

  function startEdit(post) {
    setEditingId(post.id);
    // Strip basic HTML for the textarea — backend re-formats on save
    const plain = (post.message || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
    setEditText(plain);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
    setEditError(null);
  }

  async function saveEdit(post) {
    if (!editText.trim() || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await editPost(post.id, {
        topicId: liveTopic.id,
        message: editText.trim(),
      });
      setEditingId(null);
      setEditText('');
      refresh();
    } catch (err) {
      setEditError(extractApiError(err, 'Failed to save edit'));
    } finally {
      setEditSaving(false);
    }
  }

  async function handlePollVote(poll, optionId) {
    if (pollVoting) return;
    if (!isAuthenticated) {
      setPollError('Please sign in to vote.');
      return;
    }
    setPollVoting(true);
    setPollError(null);
    try {
      await castPollVote(poll.pollId, [optionId]);
      setPollVotedIds([optionId]);
    } catch (err) {
      setPollError(extractApiError(err, 'Failed to record vote'));
    } finally {
      setPollVoting(false);
    }
  }

  async function handleTrashPost(post) {
    if (!confirm('Trash this post? It will be moved to the trash topic.')) return;
    try {
      await trashPost({ threadId: post.id, topicId: liveTopic.id });
      refresh();
    } catch (err) {
      setReplyError(extractApiError(err, 'Failed to trash post'));
    }
  }

  async function handleReact(post, reactionCode) {
    if (!isAuthenticated) {
      setReplyError('Please sign in to react.');
      return;
    }
    const prev = postReactions[post.id] ?? null;
    // Optimistic toggle
    setPostReactions((m) => ({ ...m, [post.id]: reactionCode }));
    setReactionPickerFor(null);
    try {
      await reactToThread({
        threadId: post.id,
        forumId,
        reactionType: reactionCode,
      });
    } catch (err) {
      // Rollback
      setPostReactions((m) => ({ ...m, [post.id]: prev }));
      setReplyError(extractApiError(err, 'Failed to record reaction'));
    }
  }

  return (
    <div className={styles.screen}>
      {/* Floating moderator action panel — hidden for non-moderators */}
      <AdminPanel topic={liveTopic} onActionComplete={refresh} />

      {/* Sticky collapsed header */}
      <div className={`${styles.stickyHeader} ${stickyVisible ? styles.stickyHeaderVisible : ''}`}>
        <div className={styles.stickyInner}>
          {topic.forumThumbnail
            ? <img src={topic.forumThumbnail} alt="" className={styles.stickyThumb} decoding="async" />
            : <div className={styles.stickyThumbFallback} style={{ background: topic.forumBg || 'var(--brand)' }}>{topic.forumEmoji || '💬'}</div>
          }
          <div className={styles.stickyText}>
            <span className={styles.stickyForum}>{topic.forumName}</span>
            <span className={styles.stickyTitle}>{topic.title}</span>
          </div>
        </div>
      </div>

      <div className={styles.scrollArea} onScroll={handleScroll}>

        {/* ── Topic card (OP) ── */}
        <div className={styles.topicCard}>

          {/* Forum breadcrumb */}
          <div className={styles.forumRow}>
            {topic.forumThumbnail ? (
              <img src={topic.forumThumbnail} alt="" className={styles.forumThumb} decoding="async" />
            ) : (
              <div className={styles.forumBadge} style={{ background: topic.forumBg || 'var(--brand)' }}>
                {topic.forumEmoji || '💬'}
              </div>
            )}
            <span className={styles.forumName}>{topic.forumName || 'Forum'}</span>
            {(topic.locked || topic.pinned) && (
              <div className={styles.badgeRow}>
                {topic.pinned && <span className={styles.pinnedBadge}>Pinned</span>}
                {topic.locked && <span className={styles.lockedBadge}>Locked</span>}
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className={styles.topicTitle}>{topic.title}</h2>

          {/* Author chip */}
          {liveTopic.poster && (
            <div className={styles.authorChip}>
              <div className={styles.authorAvatar} style={{ background: 'var(--brand)' }}>
                {liveTopic.poster.charAt(0).toUpperCase()}
              </div>
              <div className={styles.authorInfo}>
                <span className={styles.authorName}>{liveTopic.poster}</span>
                <span className={styles.authorTime}>{liveTopic.time}</span>
              </div>
            </div>
          )}

          {/* Topic description */}
          <TopicBodyWithEmbeds topic={liveTopic} />

          {/* Topic image */}
          {liveTopic.topicImage && (
            <div className={styles.topicImageWrap}>
              <img
                src={liveTopic.topicImage}
                alt=""
                className={styles.topicImage}
                loading="lazy"
                onError={e => { e.currentTarget.closest('.' + styles.topicImageWrap).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Poll (if attached to topic) */}
          {liveTopic.poll && (
            <PollWidget
              poll={liveTopic.poll}
              voted={pollVotedIds != null || liveTopic.poll.hasVoted}
              votedIds={pollVotedIds || []}
              voting={pollVoting}
              error={pollError}
              onVote={(optId) => handlePollVote(liveTopic.poll, optId)}
            />
          )}

          {/* Tags */}
          {topic.tags?.length > 0 && (
            <div className={styles.tagRow}>
              {topic.tags.map(t => (
                <span key={t.id} className={styles.tag}>{t.name}</span>
              ))}
            </div>
          )}

        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className={styles.postsList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonPost}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMed}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className={styles.errorBox}>
            <span className={styles.errorText}>{error}</span>
            <button className={styles.retryBtn} onClick={refresh}>Retry</button>
          </div>
        )}

        {/* ── Posts ── */}
        {!loading && !error && (
          <div className={styles.postsList}>
            {posts.length === 0 && (
              <div className={styles.emptyBox}>
                <div className={styles.emptyIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M2 2h20a1 1 0 011 1v14a1 1 0 01-1 1H6l-5 4V3a1 1 0 011-1z" stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M7 8h10M7 12h6" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className={styles.emptyTitle}>No replies yet</span>
                {!liveTopic.locked && (
                  <span className={styles.emptyText}>Be the first to share your thoughts!</span>
                )}
              </div>
            )}

            {sortedPosts.map((post, i) => {
              const isMine    = isAuthenticated && user?.userId && post.authorId === user.userId;
              const isEditing = editingId === post.id;
              const myReact   = postReactions[post.id] ?? null;
              const pickerOpen = reactionPickerFor === post.id;

              return (
              <React.Fragment key={post.id}>
              <div className={`${styles.postCard} ${post.isOp ? styles.postCardOp : ''}`} style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                {/* Post header */}
                <div className={styles.postHeader}>
                  <div
                    className={`${styles.postAvatar} ${post.isOp ? styles.postAvatarOp : ''} ${styles.postAvatarTappable}`}
                    style={post.avatarAccent ? { background: post.avatarAccent } : undefined}
                    role="button"
                    tabIndex={0}
                    title={`View ${post.author}'s profile`}
                    onClick={() => setActiveUserCard(post)}
                    onKeyDown={e => e.key === 'Enter' && setActiveUserCard(post)}
                  >
                    {post.avatarUrl ? (
                      <>
                        <img
                          src={post.avatarUrl}
                          alt=""
                          className={styles.postAvatarImg}
                          loading="lazy"
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling.style.display = 'flex';
                          }}
                        />
                        <span className={styles.postAvatarLetter} style={{ display: 'none' }}>
                          {(post.author || 'A').charAt(0).toUpperCase()}
                        </span>
                      </>
                    ) : (
                      <span className={styles.postAvatarLetter}>
                        {(post.author || 'A').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={styles.postAuthorInfo}>
                    <div className={styles.postAuthorRow}>
                      <span className={styles.postAuthor}>{post.author}</span>
                      {post.isOp && <span className={styles.opBadge}>OP</span>}
                      {post.countryCode && (
                        <span className={styles.countryFlag} title={post.countryCode}>
                          {countryFlag(post.countryCode)}
                        </span>
                      )}
                    </div>
                    {post.realName && (
                      <span className={styles.postRealName}>{post.realName}</span>
                    )}
                    <div className={styles.postMetaRow}>
                      {post.rank && <RankBadge rank={post.rank} />}
                      {post.postCount != null && (
                        <span className={styles.postMemberMeta}>
                          {post.rank ? ' · ' : ''}{formatNum(post.postCount)} posts
                        </span>
                      )}
                      {(post.rank || post.postCount != null) && <span className={styles.metaDot}>·</span>}
                      <span
                        className={styles.postTime}
                        title={post.rawTime ? new Date(post.rawTime).toLocaleString() : undefined}
                      >{post.time}</span>
                      {post.isEdited && (
                        <button
                          type="button"
                          className={styles.editedChip}
                          onClick={() => setHistoryForPostId(post.id)}
                          title="View edit history"
                        >
                          edited
                        </button>
                      )}
                    </div>
                    {/* Achievement badges inline under meta */}
                    {post.badges?.length > 0 && (
                      <div className={styles.userBadges}>
                        {post.badges.map(b => (
                          <img key={b.id} src={b.imageUrl} alt={b.name} title={b.name} className={styles.userBadgeImg} loading="lazy" decoding="async" />
                        ))}
                      </div>
                    )}
                    {post.authorId && onVisitProfile && (
                      <button
                        type="button"
                        className={styles.visitProfileBtn}
                        onClick={() => onVisitProfile({ userId: post.authorId, username: post.author })}
                      >
                        Visit Profile
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                          <path d="M2 8L8 2M8 2H4M8 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <span className={styles.postNumber}>#{i + 1}</span>
                </div>

                {/* Post content (or edit textarea) */}
                {isEditing ? (
                  <div className={styles.editBox}>
                    <textarea
                      className={styles.editTextarea}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      disabled={editSaving}
                      rows={4}
                    />
                    {editError && <div className={styles.editError}>{editError}</div>}
                    <div className={styles.editActions}>
                      <button className={styles.editCancel} onClick={cancelEdit} disabled={editSaving}>
                        Cancel
                      </button>
                      <button
                        className={styles.editSave}
                        onClick={() => saveEdit(post)}
                        disabled={editSaving || !editText.trim()}
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <PostBodyWithEmbeds html={post.message} />
                )}

                {/* Post footer with actions */}
                {!isEditing && (
                  <div className={styles.postFooter}>
                    {/* Reaction pill */}
                    <div className={styles.reactWrap}>
                      <button
                        className={`${styles.reactBtn} ${myReact != null ? styles.reactBtnActive : ''}`}
                        onClick={() => setReactionPickerFor(pickerOpen ? null : post.id)}
                      >
                        <span className={styles.reactBtnEmoji}>
                          {myReact ? REACTION_OPTIONS.find(o => o.code === myReact)?.emoji : '👍'}
                        </span>
                        {post.likes > 0 && (
                          <span className={styles.reactBtnCount}>{formatNum(post.likes)}</span>
                        )}
                      </button>
                      {pickerOpen && (
                        <>
                          <div className={styles.reactBackdrop} onClick={() => setReactionPickerFor(null)} />
                          <div className={styles.reactPicker}>
                            {REACTION_OPTIONS.map((opt) => (
                              <button
                                key={opt.code}
                                className={styles.reactOption}
                                title={opt.label}
                                onClick={() => handleReact(post, opt.code)}
                              >
                                <span className={styles.reactEmoji}>{opt.emoji}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Action buttons */}
                    <button className={styles.postAction}>
                      <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                        <path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      Reply
                    </button>
                    {isMine ? (
                      <button className={styles.postAction} onClick={() => startEdit(post)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 20h9"/>
                          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/>
                        </svg>
                        Edit
                      </button>
                    ) : (
                      <button className={styles.postAction}>
                        <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                          <path d="M2 3h6v7H2z" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M5 1h6v7" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        Quote
                      </button>
                    )}
                    {isModerator && !isMine && (
                      <button
                        className={`${styles.postAction} ${styles.postActionDanger}`}
                        onClick={() => handleTrashPost(post)}
                        title="Trash this post (moderator)"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3 6h18"/>
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        </svg>
                        Trash
                      </button>
                    )}
                    <button className={`${styles.postAction} ${styles.postActionRight}`}>
                      <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                        <path d="M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 5H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      Share
                    </button>
                  </div>
                )}
              </div>
              {i === 0 && (
                <div className={styles.topicStatsBar}>
                  <div className={styles.topicStatItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <span className={styles.topicStatVal}>{formatNum(liveTopic.replies ?? 0)}</span>
                    <span className={styles.topicStatLbl}>Replies</span>
                  </div>
                  <div className={styles.topicStatItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span className={styles.topicStatVal}>{formatNum(liveTopic.views ?? 0)}</span>
                    <span className={styles.topicStatLbl}>Views</span>
                  </div>
                  <div className={styles.topicStatItem}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.6"><path d="M7 22V11l5-9 1.5 1L12 7h8a2 2 0 012 2v2a6 6 0 01-.3 1.8l-2.4 6A2 2 0 0117.4 20H7z"/><path d="M2 11h3v11H2z"/></svg>
                    <span className={styles.topicStatVal}>{formatNum(liveTopic.likes ?? 0)}</span>
                    <span className={styles.topicStatLbl}>Likes</span>
                  </div>
                </div>
              )}
              {i === 0 && (
                <div className={styles.sortRow}>
                  <div className={styles.sectionLabel}>
                    <span className={styles.sectionText}>Replies</span>
                    <span className={styles.sectionCount}>{posts.length}</span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button
                    className={`${styles.sortBtn} ${sortBy === 'date' ? styles.sortBtnActive : ''}`}
                    onClick={() => setSortBy('date')}
                  >Latest</button>
                  <button
                    className={`${styles.sortBtn} ${sortBy === 'likes' ? styles.sortBtnActive : ''}`}
                    onClick={() => setSortBy('likes')}
                  >Top</button>
                </div>
              )}
              </React.Fragment>
              );
            })}

            {loadingMore && Array.from({ length: 2 }).map((_, i) => (
              <div key={`lm-${i}`} className={styles.skeletonPost}>
                <div className={styles.skeletonAvatar} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !loadingMore && !loading && (
          <button className={styles.loadMoreBtn} onClick={loadMore}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
            Load More Replies
          </button>
        )}

        <div className={styles.spacer} />
      </div>

      {/* ── Reply input (fixed at bottom) ── */}
      {!liveTopic.locked && (
        <div className={styles.replyBar}>
          <div className={styles.replyAvatar}>{user?.userName?.charAt(0)?.toUpperCase() || '?'}</div>
          <input
            className={styles.replyInput}
            placeholder={isAuthenticated ? `Reply as ${user?.userName || 'you'}…` : 'Sign in to reply…'}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
            disabled={sending}
          />
          <button
            className={`${styles.sendBtn} ${replyText.trim() ? styles.sendActive : ''}`}
            onClick={handleReply}
            disabled={!replyText.trim() || sending}
          >
            {sending ? (
              <span className={styles.sendSpinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l5-6v4h5a2 2 0 012 2v0a2 2 0 01-2 2H7v4L2 8z" fill="currentColor"/>
              </svg>
            )}
          </button>
          {replyError && <div className={styles.replyError}>{replyError}</div>}
        </div>
      )}
      {liveTopic.locked && (
        <div className={styles.lockedBar}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          This topic is locked
        </div>
      )}
      {historyForPostId != null && (
        <PostEditHistoryModal
          postId={historyForPostId}
          onClose={() => setHistoryForPostId(null)}
        />
      )}

      {/* ── User mini-card popup (avatar tap) ── */}
      {activeUserCard && (
        <UserMiniCard
          post={activeUserCard}
          onVisitProfile={onVisitProfile}
          onMessageUser={onMessageUser}
          onClose={() => setActiveUserCard(null)}
        />
      )}
    </div>
  );
}

/* ── Edit history modal ──────────────────────────────────────────────────── */
function PostEditHistoryModal({ postId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getPostEditHistory(postId)
      .then((res) => {
        if (cancelled) return;
        const d = res?.data;
        const list =
          (Array.isArray(d) && d) ||
          d?.history ||
          d?.data?.history ||
          d?.editHistory ||
          d?.items ||
          [];
        setEntries(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, 'Failed to load edit history'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [postId]);

  return (
    <div className={styles.historyOverlay} onClick={onClose}>
      <div className={styles.historyModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.historyHeader}>
          <span className={styles.historyTitle}>Edit history</span>
          <button className={styles.historyClose} onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className={styles.historyBody}>
          {loading && <div className={styles.historyState}>Loading...</div>}
          {!loading && error && <div className={styles.historyState}>{error}</div>}
          {!loading && !error && entries.length === 0 && (
            <div className={styles.historyState}>No edit history recorded.</div>
          )}
          {!loading && !error && entries.length > 0 && entries.map((entry, i) => {
            const when = entry.editedWhen || entry.updatedWhen || entry.modifiedWhen || entry.createdWhen;
            const body = entry.message || entry.oldMessage || entry.content || entry.text || '';
            const editor = entry.editedByUserName || entry.editorName || entry.userName || '';
            return (
              <div key={entry.id || entry.historyId || i} className={styles.historyEntry}>
                <div className={styles.historyEntryMeta}>
                  <span>{editor || 'Unknown'}</span>
                  <span>{when ? new Date(when).toLocaleString() : ''}</span>
                </div>
                <div
                  className={styles.historyEntryBody}
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
