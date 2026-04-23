import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './TopicDetailScreen.module.css';
import useTopicPosts from '../hooks/useTopicPosts';
import { extractApiError, timeAgo } from '../services/api';
import {
  editPost,
  reactToThread,
  getThreadLikes,
  castPollVote,
  getPostEditHistory,
  trashPost,
  closeTopic,
  openTopic,
  THREAD_REACTION_TYPES,
} from '../services/forumsApi';
import { getProfile } from '../services/userProfileApi';
import { useAuth } from '../contexts/AuthContext';
import SocialEmbed, { detectPlatform } from '../components/ui/SocialEmbed';
import AdminPanel from '../components/forum/AdminPanel';
import ReactionsSheet from '../components/forum/ReactionsSheet';
import PostSettingsMenu from '../components/forum/PostSettingsMenu';

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// Parse reactionJson → top reaction types for the summary pill
function parseTopReactionTypes(reactionJson) {
  if (!reactionJson) return [];
  try {
    const entries = JSON.parse(reactionJson)?.json ?? [];
    const byType = {};
    for (const e of entries) {
      if (!e.lt) continue;
      byType[Number(e.lt)] = (byType[Number(e.lt)] || 0) + 1;
    }
    return Object.keys(byType)
      .map(Number)
      .sort((a, b) => byType[b] - byType[a])
      .slice(0, 3);
  } catch {
    return [];
  }
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

// Some backend responses ship raw BBCode that never got server-side-translated
// to HTML — typically [QUOTE=name]…[/QUOTE] blocks. Rendering them via
// dangerouslySetInnerHTML shows the tags as literal text, which is what the
// user is seeing. Convert the common tags to equivalent HTML so the existing
// blockquote/strong styles pick them up. Runs BEFORE image enhancement.
function parseBBCode(html) {
  if (!html) return html;
  let out = html;
  // Quote with attribution, possibly nested, run repeatedly from the innermost
  // pair outward.
  let prev;
  do {
    prev = out;
    out = out.replace(
      /\[QUOTE=([^\]]*?)\]([\s\S]*?)\[\/QUOTE\]/gi,
      (_m, name, body) =>
        `<blockquote><cite>${String(name).trim()} said:</cite>${body}</blockquote>`
    );
    out = out.replace(
      /\[QUOTE\]([\s\S]*?)\[\/QUOTE\]/gi,
      '<blockquote>$1</blockquote>'
    );
  } while (out !== prev);
  return out
    .replace(/\[B\]([\s\S]*?)\[\/B\]/gi,  '<strong>$1</strong>')
    .replace(/\[I\]([\s\S]*?)\[\/I\]/gi,  '<em>$1</em>')
    .replace(/\[U\]([\s\S]*?)\[\/U\]/gi,  '<u>$1</u>')
    .replace(/\[URL=([^\]]+)\]([\s\S]*?)\[\/URL\]/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
    .replace(/\[URL\]([\s\S]*?)\[\/URL\]/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\[IMG\]([\s\S]*?)\[\/IMG\]/gi, '<img src="$1" alt="" />');
}

// Sanitize and wire up fault-tolerant behavior for any renderable media
// inside a backend HTML block. Must run AFTER the browser has parsed the HTML.
//
// Cases we have to handle, discovered from real posts:
//   1. <img> errors outright (404) — hide it.
//   2. <img> already failed before our effect ran — check complete+naturalSize.
//   3. <img> is still loading when effect runs, so neither 'load' nor 'error'
//      has fired. Meanwhile the browser reserves placeholder space using the
//      HTML-attribute width/height, which paired with our border/shadow CSS
//      shows as a huge empty bordered card (the "big white box" bug).
//   4. <img> "loads" successfully but the response was empty / a broken image
//      with 0×0 natural dimensions — 'load' fires, 'error' does not.
//   5. <iframe> embeds blocked by CSP / X-Frame-Options — also render as empty
//      boxes. Hide if the frame can't load or ends up empty.
//   6. Obviously-broken src patterns (empty, "about:blank", "data:" 1x1
//      pixel markers) — hide proactively.
function useHideBrokenImages(ref, deps) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const cleanups = [];

    const imgs = Array.from(root.querySelectorAll('img'));
    for (const img of imgs) {
      img.decoding = 'async';
      try { img.referrerPolicy = 'no-referrer'; } catch { /* read-only in old Safari */ }

      const src = img.getAttribute('src') || '';
      // Proactive: src is empty, about:blank, or a known 1x1 placeholder pixel.
      if (!src || src === 'about:blank' || /^data:image\/gif;base64,R0lGOD/i.test(src)) {
        img.style.display = 'none';
        continue;
      }

      const hide = () => { img.style.display = 'none'; };
      const markLoaded = () => { img.classList.add(styles.imgLoaded); };
      const handleLoad = () => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) hide();
        else markLoaded();
      };
      img.addEventListener('error', hide);
      img.addEventListener('load', handleLoad);
      cleanups.push(() => {
        img.removeEventListener('error', hide);
        img.removeEventListener('load', handleLoad);
      });

      if (img.complete) {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) hide();
        else markLoaded();
      }
    }

    const frames = Array.from(root.querySelectorAll('iframe'));
    for (const frame of frames) {
      const src = frame.getAttribute('src') || '';
      if (!src || src === 'about:blank') {
        frame.style.display = 'none';
        continue;
      }
      const hideFrame = () => { frame.style.display = 'none'; };
      frame.addEventListener('error', hideFrame);
      cleanups.push(() => frame.removeEventListener('error', hideFrame));
    }

    return () => { cleanups.forEach(fn => fn()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

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
  const cleanText = useMemo(
    () => parseBBCode(cleanDescription(topic.description)),
    [topic.description]
  );
  const socialUrls = useMemo(() => getTopicSocialUrls(topic), [topic]);
  const bodyRef = useRef(null);
  useHideBrokenImages(bodyRef, [cleanText]);

  return (
    <>
      {cleanText && (
        <div
          ref={bodyRef}
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
// Two layouts:
//   • Not voted → rows with checkbox (multi) / radio (single), a CAST VOTE!!
//     button, and a "*Vote to see the results" hint.
//   • Voted    → text + % on top, green progress bar underneath. Read-only.
// The gear icon only renders for moderators and opens a small menu with a
// Lock/Unlock Topic action (hits `closeTopic` / `openTopic` via onToggleLock).
function PollWidget({
  poll, voted, votedIds, voting, error, onVote,
  locked = false, onToggleLock,
  lockBusy = false,
}) {
  const [selected, setSelected] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);

  // Close the gear menu when clicking outside of it.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onDocClick(e) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  if (!poll) return null;
  const total = poll.totalVotes || 0;

  function toggleChoice(id) {
    if (voting) return;
    setSelected(cur => {
      if (poll.multiple) {
        return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      }
      return [id];
    });
  }

  function handleCast() {
    if (voting || selected.length === 0) return;
    onVote(selected);
  }

  async function handleLockClick() {
    if (lockBusy || !onToggleLock) return;
    setMenuOpen(false);
    await onToggleLock();
  }

  return (
    <div className={styles.pollBox}>
      <div className={styles.pollHeader}>
        <span className={styles.pollLabel}>POLL</span>
        <div className={styles.pollMenuWrap} ref={menuWrapRef}>
            <button
              type="button"
              className={styles.pollSettingsBtn}
              aria-label="Poll options"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              disabled={lockBusy}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.pollMenu} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.pollMenuItem}
                  onClick={handleLockClick}
                  disabled={lockBusy}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {locked ? (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 019.9-1"/>
                      </>
                    ) : (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                      </>
                    )}
                  </svg>
                  <span>{locked ? 'Unlock Topic' : 'Lock Topic'}</span>
                </button>
              </div>
            )}
        </div>
      </div>

      {poll.question && <div className={styles.pollQuestion}>{poll.question}</div>}

      {voted ? (
        <div className={styles.pollResults}>
          {poll.options.map((opt) => {
            const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
            const mine = votedIds.includes(opt.id);
            return (
              <div
                key={opt.id}
                className={`${styles.pollResultRow} ${mine ? styles.pollResultMine : ''}`}
              >
                <div className={styles.pollResultTop}>
                  <span className={styles.pollResultText}>{opt.text}</span>
                  <span className={styles.pollResultPct}>{pct}%</span>
                </div>
                <div className={styles.pollResultTrack}>
                  <div
                    className={styles.pollResultFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className={styles.pollMeta}>
            {total} {total === 1 ? 'vote' : 'votes'}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.pollChoices}>
            {poll.options.map((opt) => {
              const checked = selected.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={`${styles.pollChoiceRow} ${checked ? styles.pollChoiceRowOn : ''}`}
                >
                  <input
                    type={poll.multiple ? 'checkbox' : 'radio'}
                    name={`poll-${poll.pollId}`}
                    className={styles.pollChoiceInput}
                    checked={checked}
                    onChange={() => toggleChoice(opt.id)}
                    disabled={voting}
                  />
                  <span className={styles.pollChoiceBox} aria-hidden="true">
                    {checked && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                  <span className={styles.pollChoiceText}>{opt.text}</span>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.pollCastBtn}
            onClick={handleCast}
            disabled={voting || selected.length === 0}
          >
            {voting ? 'CASTING…' : 'CAST VOTE!!'}
          </button>

          <div className={styles.pollHint}>*Vote to see the results</div>

          {error && <div className={styles.pollError}>{error}</div>}
        </>
      )}
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
  const safeHtml   = useMemo(() => parseBBCode(html), [html]);
  const bodyRef    = useRef(null);
  useHideBrokenImages(bodyRef, [safeHtml]);

  return (
    <>
      <div
        ref={bodyRef}
        className={styles.postBody}
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
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
              referrerPolicy="no-referrer"
              onError={e => { e.currentTarget.style.display = 'none'; }}
              aria-hidden="true"
            />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className={styles.miniCardBannerBg}
              decoding="async"
              referrerPolicy="no-referrer"
              onError={e => { e.currentTarget.style.display = 'none'; }}
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
                <img
                  src={avatarUrl}
                  alt=""
                  className={styles.miniCardAvatarImg}
                  decoding="async"
                  referrerPolicy="no-referrer"
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
                decoding="async"
                referrerPolicy="no-referrer"
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

export default function TopicDetailScreen({ topic, onVisitProfile, onMessageUser, onComposeReply }) {
  const { posts, topicDetail, loading, loadingMore, error, hasMore, loadMore, refresh } = useTopicPosts(topic?.id);
  const { user, isAuthenticated, isModerator } = useAuth();

  const [sortBy, setSortBy] = useState('date');

  // Mini user card (avatar tap)
  const [activeUserCard, setActiveUserCard] = useState(null);

  // Per-post UI state for edit + reactions
  const [editingId, setEditingId]   = useState(null);
  const [editText, setEditText]     = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState(null);
  // { [postId]: reactionCode | null }
  const [postReactions, setPostReactions] = useState({});
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  // server-authoritative like counts received from reactToThread response
  const [postLikeCounts, setPostLikeCounts] = useState({});
  // { [postId]: threadLikeId } — returned by the API, must be sent back on update/remove
  const [postThreadLikeIds, setPostThreadLikeIds] = useState({});
  // Toast for action errors (react/trash/undo failures)
  const [actionError, setActionError] = useState(null);
  // Toast for post-menu success confirmations (report, mod note, matured flag)
  const [actionSuccess, setActionSuccess] = useState(null);
  // "You already posted same reaction" alert — stores postId of active alert
  const [sameReactionAlert, setSameReactionAlert] = useState(null);
  const sameReactionTimer = useRef(null);
  // Tracks what each post's reaction was BEFORE the most recent change,
  // so UNDO can revert to it instead of removing entirely.
  const prevReactionRef = useRef({});

  // ── Reaction persistence via localStorage ────────────────────────────────
  // The posts-list API (TopicPostDto) has no per-user reaction field, so we
  // can't know the current user's saved reaction from the posts response alone.
  // We persist reactions in localStorage (keyed by userId) so they survive
  // navigation and page reloads within the same browser session.

  function getStoredReactions(userId) {
    try { return JSON.parse(localStorage.getItem(`if_reactions_${userId}`) || '{}'); }
    catch (_) { return {}; }
  }

  function saveStoredReaction(userId, postId, reactionCode) {
    try {
      const stored = getStoredReactions(userId);
      if (reactionCode == null) { delete stored[postId]; }
      else { stored[String(postId)] = reactionCode; }
      localStorage.setItem(`if_reactions_${userId}`, JSON.stringify(stored));
    } catch (_) {}
  }

  // Restore saved reactions when posts load.
  // Primary: parse post.reactionJson (from TopicPostDto.jsonData) — the backend already
  // includes the full reaction breakdown per post, so we find the current user's entry
  // by matching uid. Format: {"json":[{"lt":<reactionType>,"lc":<count>,"uid":<userId>},...]}
  // Fallback: localStorage for any posts where reactionJson is absent or doesn't include us.
  useEffect(() => {
    if (!posts.length || !user?.userId) return;
    const stored = getStoredReactions(user.userId);
    let storedLikeIds = {};
    try { storedLikeIds = JSON.parse(localStorage.getItem(`if_likeids_${user.userId}`) || '{}'); }
    catch (_) {}

    const seededReactions = {};
    const seededLikeIds   = {};

    for (const post of posts) {
      // 1. Try server data first
      if (post.reactionJson) {
        try {
          const entries = JSON.parse(post.reactionJson)?.json ?? [];
          const mine = entries.find(r => Number(r.uid) === Number(user.userId));
          if (mine?.lt) {
            seededReactions[post.id] = Number(mine.lt);
          }
        } catch (_) { /* malformed */ }
      }
      // 2. Fall back to localStorage if server data didn't include this user's reaction
      if (seededReactions[post.id] == null) {
        const saved = stored[String(post.id)];
        if (saved != null) seededReactions[post.id] = saved;
      }
      // Restore threadLikeId from localStorage (not in posts response)
      const likeId = storedLikeIds[String(post.id)];
      if (likeId != null) seededLikeIds[post.id] = likeId;
    }

    if (Object.keys(seededReactions).length > 0) {
      setPostReactions(prev => ({ ...seededReactions, ...prev }));
    }
    if (Object.keys(seededLikeIds).length > 0) {
      setPostThreadLikeIds(prev => ({ ...seededLikeIds, ...prev }));
    }
  }, [posts, user?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // likes bottom sheet — null = closed
  const [likesSheet, setLikesSheet] = useState(null);

  // Poll vote state
  const [pollVoting, setPollVoting]   = useState(false);
  const [pollError, setPollError]     = useState(null);
  const [pollVotedIds, setPollVotedIds] = useState(null); // null = use server hasVoted
  const [pollLockBusy, setPollLockBusy] = useState(false);

  // Post edit-history modal
  const [historyForPostId, setHistoryForPostId] = useState(null);


  // Reactions list sheet
  const [reactionsSheetPost, setReactionsSheetPost] = useState(null);

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

  async function handlePollVote(poll, optionIds) {
    if (pollVoting) return;
    if (!isAuthenticated) {
      setPollError('Please sign in to vote.');
      return;
    }
    const ids = Array.isArray(optionIds) ? optionIds : [optionIds];
    if (ids.length === 0) return;
    setPollVoting(true);
    setPollError(null);
    try {
      const res = await castPollVote(poll.pollId, ids);
      const serverIds = res?.data?.votedChoiceIds?.map(Number).filter(Number.isFinite);
      setPollVotedIds(serverIds?.length ? serverIds : ids);
    } catch (err) {
      setPollError(extractApiError(err, 'Failed to record vote'));
    } finally {
      setPollVoting(false);
    }
  }

  async function handleToggleLock() {
    if (pollLockBusy) return;
    if (!liveTopic?.id || !liveTopic?.forumId) return;
    if (!isAuthenticated) {
      setPollError('Please sign in to change topic state.');
      return;
    }
    const topicId = Number(liveTopic.id);
    const forumId = Number(liveTopic.forumId);
    setPollLockBusy(true);
    setPollError(null);
    try {
      if (liveTopic.locked) {
        await openTopic({ topicId, forumId });
      } else {
        await closeTopic({ topicId, forumId });
      }
      refresh();
    } catch (err) {
      // Backend returns 400 (not 403) with { isSuccess, message } when the
      // user lacks moderator rights. extractApiError flattens the message.
      setPollError(extractApiError(err, 'Failed to update topic lock state'));
    } finally {
      setPollLockBusy(false);
    }
  }

  async function handleTrashPost(post) {
    if (!confirm('Trash this post? It will be moved to the trash topic.')) return;
    try {
      await trashPost({ threadId: post.id, topicId: liveTopic.id });
      refresh();
    } catch (err) {
      setActionError(extractApiError(err, 'Failed to trash post'));
    }
  }

  function showSameReactionAlert(postId) {
    setSameReactionAlert(postId);
    clearTimeout(sameReactionTimer.current);
    sameReactionTimer.current = setTimeout(() => setSameReactionAlert(null), 4000);
  }

  // Core API call shared by both handleReact and handleUnreact
  async function sendReaction(post, reactionCode) {
    const res = await reactToThread({
      threadId: post.id,
      forumId,
      reactionType: reactionCode, // 0 = 'None' (remove), 1-7 = specific reaction
      threadLikeId: postThreadLikeIds[post.id] ?? undefined,
    });
    saveStoredReaction(user.userId, post.id, reactionCode === 0 ? null : reactionCode);
    const likeId = res?.data?.threadLikeId;
    if (likeId != null) {
      setPostThreadLikeIds((m) => ({ ...m, [post.id]: likeId }));
      try {
        const likeIds = JSON.parse(localStorage.getItem(`if_likeids_${user.userId}`) || '{}');
        if (reactionCode === 0) { delete likeIds[String(post.id)]; }
        else { likeIds[String(post.id)] = likeId; }
        localStorage.setItem(`if_likeids_${user.userId}`, JSON.stringify(likeIds));
      } catch (_) {}
    }
    if (reactionCode === 0) {
      setPostThreadLikeIds((m) => { const n = { ...m }; delete n[post.id]; return n; });
    }
    const likeCount = res?.data?.likeCount;
    if (likeCount != null) {
      setPostLikeCounts((m) => ({ ...m, [post.id]: likeCount }));
    }
  }

  async function handleReact(post, reactionCode) {
    if (!isAuthenticated) {
      setActionError('Please sign in to react.');
      return;
    }

    const current = postReactions[post.id] ?? null;

    // Same reaction tapped again → show "already reacted" alert with UNDO
    if (current === reactionCode) {
      setReactionPickerFor(null);
      showSameReactionAlert(post.id);
      return;
    }

    // Save what we had before this change so UNDO can revert to it
    prevReactionRef.current[post.id] = current;

    setPostReactions((m) => ({ ...m, [post.id]: reactionCode })); // optimistic
    setReactionPickerFor(null);
    setSameReactionAlert(null);

    try {
      await sendReaction(post, reactionCode);
    } catch (err) {
      setPostReactions((m) => ({ ...m, [post.id]: current })); // rollback
      setActionError(extractApiError(err, 'Failed to record reaction'));
    }
  }

  async function handleUnreact(post) {
    setSameReactionAlert(null);
    clearTimeout(sameReactionTimer.current);

    // If the user changed reactions before clicking the same one, UNDO reverts
    // to the previous reaction. If they added the reaction fresh, UNDO removes it.
    const revertTo = prevReactionRef.current[post.id] ?? null;
    const current  = postReactions[post.id] ?? null;

    delete prevReactionRef.current[post.id];
    setPostReactions((m) => ({ ...m, [post.id]: revertTo })); // optimistic

    try {
      await sendReaction(post, revertTo ?? 0); // 0 = remove
    } catch (err) {
      setPostReactions((m) => ({ ...m, [post.id]: current })); // rollback
      setActionError(extractApiError(err, 'Failed to undo reaction'));
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
                decoding="async"
                referrerPolicy="no-referrer"
                onError={e => {
                  const wrap = e.currentTarget.closest('.' + styles.topicImageWrap);
                  if (wrap) wrap.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Poll (if attached to topic) */}
          {liveTopic.poll && (
            <PollWidget
              poll={liveTopic.poll}
              voted={pollVotedIds != null || liveTopic.poll.hasVoted}
              votedIds={pollVotedIds || liveTopic.poll.myVotedIds || []}
              voting={pollVoting}
              error={pollError}
              onVote={(optIds) => handlePollVote(liveTopic.poll, optIds)}
              locked={!!liveTopic.locked}
              lockBusy={pollLockBusy}
              onToggleLock={handleToggleLock}
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
                          decoding="async"
                          referrerPolicy="no-referrer"
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
                    </div>
                    {/* Achievement badges inline under meta */}
                    {post.badges?.length > 0 && (
                      <div className={styles.userBadges}>
                        {post.badges.map(b => (
                          <img
                            key={b.id}
                            src={b.imageUrl}
                            alt={b.name}
                            title={b.name}
                            className={styles.userBadgeImg}
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
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
                  <div className={styles.postNumGroup}>
                    <span className={styles.postNumber}>#{i + 1}</span>
                    <PostSettingsMenu
                      post={post}
                      topicId={liveTopic.id}
                      forumId={forumId}
                      isOwner={isMine}
                      isModerator={isModerator}
                      onEdit={startEdit}
                      onTrash={handleTrashPost}
                      onShowHistory={(p) => setHistoryForPostId(p.id)}
                      onRefresh={refresh}
                      onSuccess={(msg) => {
                        setActionSuccess(msg);
                        setTimeout(() => setActionSuccess(null), 3500);
                      }}
                      onError={(msg) => setActionError(msg)}
                    />
                  </div>
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

                {/* Edited-by line — matches IndiaForums live style */}
                {!isEditing && post.isEdited && post.editedWhen && (
                  <button
                    type="button"
                    className={styles.editedLine}
                    onClick={() => setHistoryForPostId(post.id)}
                    title="View edit history"
                  >
                    Edited by {post.editedBy || post.author} – {timeAgo(post.editedWhen)}
                  </button>
                )}

                {/* Post footer with actions */}
                {!isEditing && (() => {
                  const totalLikes = postLikeCounts[post.id] ?? post.likes ?? 0;
                  const topTypes   = parseTopReactionTypes(post.reactionJson);
                  return (
                  <div className={styles.postFooter}>
                    {/* Left: aggregate reaction summary → taps to open likers sheet */}
                    <div className={styles.reactWrap}>
                      {totalLikes > 0 && (
                        <button
                          className={styles.reactSummary}
                          onClick={() => setReactionsSheetPost(post)}
                          title="See who reacted"
                        >
                          <span className={styles.reactSummaryEmojis}>
                            {topTypes.length > 0
                              ? topTypes.map(lt => (
                                  <span key={lt} className={styles.reactSummaryEmoji}>
                                    {REACTION_OPTIONS.find(o => o.code === lt)?.emoji}
                                  </span>
                                ))
                              : <span className={styles.reactSummaryEmoji}>👍</span>
                            }
                          </span>
                          <span className={styles.reactSummaryCount}>{formatNum(totalLikes)}</span>
                        </button>
                      )}

                      {/* Emoji picker popup */}
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

                    {/* LIKE action button → opens emoji picker */}
                    <button
                      className={`${styles.postAction} ${myReact != null ? styles.postActionReacted : ''}`}
                      onClick={() => setReactionPickerFor(pickerOpen ? null : post.id)}
                    >
                      {myReact ? (
                        <>
                          <span>{REACTION_OPTIONS.find(o => o.code === myReact)?.emoji}</span>
                          {REACTION_OPTIONS.find(o => o.code === myReact)?.label}
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                            <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                          </svg>
                          Like
                        </>
                      )}
                    </button>

                    {/* Action buttons */}
                    <button
                      className={styles.postAction}
                      onClick={() => { if (!forumId) return; onComposeReply?.({ topic: liveTopic, forumId, quotedPost: null }); }}
                    >
                      <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                        <path d="M2 2h9a1 1 0 011 1v5a1 1 0 01-1 1H4l-3 2.5V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                      </svg>
                      Reply
                    </button>
                    {!isMine && (
                      <button
                        className={styles.postAction}
                        onClick={() => {
                          // Pass full quote context so the API can link back to this post
                          const plainText = (post.message || '')
                            .replace(/<br\s*\/?>/gi, ' ')
                            .replace(/<[^>]+>/g, '')
                            .trim()
                            .slice(0, 300);
                          if (!forumId) return;
                          onComposeReply?.({
                            topic:      liveTopic,
                            forumId,
                            quotedPost: {
                              author:   post.author,
                              message:  plainText,
                              threadId: post.id,
                              userId:   post.authorId,
                            },
                          });
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                          <path d="M2 3h6v7H2z" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M5 1h6v7" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                        Quote
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
                  );
                })()}

                {/* "Already reacted" inline alert */}
                {sameReactionAlert === post.id && (
                  <div className={styles.sameReactionAlert}>
                    <span className={styles.sameReactionText}>
                      You already posted same reaction on this post.
                    </span>
                    <button
                      className={styles.sameReactionUndo}
                      onClick={() => handleUnreact(post)}
                    >
                      UNDO
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

      {/* ── Action error toast ── */}
      {actionError && (
        <div className={styles.actionErrorBar} onClick={() => setActionError(null)}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div className={styles.actionSuccessBar} onClick={() => setActionSuccess(null)}>
          {actionSuccess}
        </div>
      )}

      {/* ── Reply bar (tap to open full composer) ── */}
      {!liveTopic.locked && (
        <div className={styles.replyBar} onClick={() => { if (!forumId) return; onComposeReply?.({ topic: liveTopic, forumId, quotedPost: null }); }} style={{ cursor: 'pointer' }}>
          <div className={styles.replyAvatar}>{user?.userName?.charAt(0)?.toUpperCase() || '?'}</div>
          <div className={styles.replyInput} style={{ color: 'var(--text3)', userSelect: 'none' }}>
            {isAuthenticated ? `Reply as ${user?.userName || 'you'}…` : 'Sign in to reply…'}
          </div>
          <div className={`${styles.sendBtn} ${styles.sendActive}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8l5-6v4h5a2 2 0 012 2v0a2 2 0 01-2 2H7v4L2 8z" fill="currentColor"/>
            </svg>
          </div>
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

      {/* ── Reactions likers sheet ── */}
      {reactionsSheetPost && (
        <ReactionsSheet
          post={reactionsSheetPost}
          onClose={() => setReactionsSheetPost(null)}
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
