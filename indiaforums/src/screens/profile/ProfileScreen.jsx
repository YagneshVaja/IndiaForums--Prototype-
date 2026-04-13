import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import useUserProfile, { useProfileSection } from '../../hooks/useUserProfile';
import { useAuth } from '../../contexts/AuthContext';
import * as profileApi from '../../services/userProfileApi';
import * as buddiesApi from '../../services/buddiesApi';
import { timeAgo, extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './ProfileScreen.module.css';

function formatNum(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

const BASE_TABS = [
  { key: 'activity',  label: 'Activity' },
  { key: 'posts',     label: 'Posts' },
  { key: 'comments',  label: 'Comments' },
  { key: 'buddies',   label: 'Buddies' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'forums',    label: 'Forums' },
  { key: 'badges',    label: 'Badges' },
];

const SELF_TABS = [
  { key: 'drafts',       label: 'Drafts' },
  { key: 'watching',     label: 'Watching' },
  { key: 'ff-following', label: 'Following' },
  { key: 'ff-followers', label: 'FF Fans' },
  { key: 'warnings',     label: 'Warnings' },
];

// Activity feed type labels and color classes
const FEED_META = {
  38: { label: 'Update',      cls: 'feedUpdate' },
  16: { label: 'Testimonial', cls: 'feedTestimonial' },
  17: { label: 'Slambook',    cls: 'feedSlambook' },
  18: { label: 'Scrapbook',   cls: 'feedScrapbook' },
};

// Left-border accent colors for activity cards — matches feed pill palette
const FEED_ACCENTS = {
  feedUpdate:      'var(--brand)',
  feedTestimonial: '#16a96b',
  feedSlambook:    '#7c5ce9',
  feedScrapbook:   'var(--amber)',
};

export default function ProfileScreen({ userId, onMessageUser }) {
  const { user: authUser } = useAuth();
  const isOwnProfile = !userId || userId === authUser?.userId;

  const {
    profile: fetchedProfile,
    activities: fetchedActivities,
    buddyDetails,
    loading,
    error,
    refetch,
  } = useUserProfile(isOwnProfile ? 'skip' : userId);

  const profile         = isOwnProfile ? authUser : fetchedProfile;
  const effectiveUserId = isOwnProfile ? authUser?.userId : userId;
  const profileActivities = isOwnProfile ? [] : fetchedActivities;

  const TABS = isOwnProfile ? [...BASE_TABS, ...SELF_TABS] : BASE_TABS;
  const [activeTab, setActiveTab] = useState('activity');

  // API now returns thumbnailUrl and bannerUrl directly — use them first
  const avatarUrl = useMemo(() => {
    if (profile?.thumbnailUrl) return profile.thumbnailUrl;
    if (profile?.avatar)       return profile.avatar;
    // Fallback: construct from updateChecksum (older accounts)
    if (!profile?.updateChecksum || !profile?.avatarType || profile.avatarType === 0) return null;
    const uid = profile.userId ?? effectiveUserId;
    if (!uid) return null;
    const dir = Math.floor(uid / 10000);
    return `https://img.indiaforums.com/member/200x200/${dir}/${uid}.webp?uc=${profile.updateChecksum}`;
  }, [profile?.thumbnailUrl, profile?.avatar, profile?.updateChecksum, profile?.avatarType, profile?.userId, effectiveUserId]);

  // bannerUrl is provided directly by the API (1200×400)
  const bannerUrl = profile?.bannerUrl || profile?.coverUrl || null;

  // Format last seen date
  const lastSeen = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [profile?.lastVisitedDate]);

  // Green "online" dot — active within the last 24 hours
  const isOnline = useMemo(() => {
    const raw = profile?.lastVisitedDate;
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d)) return false;
    return (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
  }, [profile?.lastVisitedDate]);

  // Parse badge icons from badgeJson — same pattern as TopicDetailScreen mini-card
  const profileBadges = useMemo(() => {
    if (!profile?.badgeJson) return [];
    try {
      const parsed = JSON.parse(profile.badgeJson);
      const list = parsed?.json || [];
      return list.map(b => ({
        id:       b.id,
        name:     b.nm,
        imageUrl: `https://img.indiaforums.com/badge/200x200/0/${b.lid}.webp${b.uc ? '?uc=' + b.uc : ''}`,
      }));
    } catch (_) { return []; }
  }, [profile?.badgeJson]);

  // Stats bar: Posts | Comments | Joined | Visited — matches live website layout
  // Posts and Comments always appear; use '—' when the API doesn't return a count
  const profileStats = useMemo(() => {
    const items = [];
    const cc = profile?.commentCount ?? profile?.commentsCount ?? profile?.totalComments ?? null;
    items.push({
      key: 'posts',
      label: 'Posts',
      display: profile?.postCount != null ? formatNum(profile.postCount) : '—',
      tab: profile?.postCount != null ? 'posts' : null,
    });
    items.push({
      key: 'comments',
      label: 'Comments',
      display: cc != null ? formatNum(cc) : '—',
      tab: cc != null ? 'comments' : null,
    });
    if (profile?.joinDate) {
      const d = new Date(profile.joinDate);
      if (!isNaN(d)) items.push({ key: 'joined',  label: 'Joined',  display: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }), tab: null });
    }
    if (profile?.lastVisitedDate) {
      const d = new Date(profile.lastVisitedDate);
      if (!isNaN(d)) items.push({ key: 'visited', label: 'Visited', display: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), tab: null });
    }
    return items;
  }, [profile?.postCount, profile?.commentCount, profile?.commentsCount, profile?.totalComments, profile?.joinDate, profile?.lastVisitedDate]);

  if (!isOwnProfile && loading) return <div className={styles.screen}><LoadingState variant="card" count={3} /></div>;
  if (!isOwnProfile && error)   return <div className={styles.screen}><ErrorState message={error} onRetry={refetch} /></div>;
  if (!profile) return <div className={styles.screen}><EmptyState message="Profile not found" /></div>;

  const displayName = profile.displayName || profile.userName || 'User';
  const userName    = profile.userName || '';
  const rank        = profile.rank || profile.groupName || profile.userGroup || profile.memberGroup || profile.roleName || '';

  return (
    <div className={styles.screen}>

      {/* ── Header: Cover + White profile card ─────────────────────────── */}
      <div className={styles.headerOuter}>
        {/* Banner: API provides bannerUrl directly; fall back to blurred avatar */}
        <div className={styles.coverBanner}>
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className={styles.coverImg} decoding="async" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.coverBgAvatar} decoding="async" aria-hidden="true" />
          ) : null}
        </div>

        {/* White card slides up over the cover */}
        <div className={styles.profileCard}>

          {/* ── Horizontal header: avatar LEFT + identity RIGHT ────────── */}
          <div className={styles.profileHeader}>

            {/* Avatar — lifts up into the cover banner */}
            <div className={styles.avatarWrap}>
              <div
                className={styles.avatar}
                style={profile.avatarAccent && !avatarUrl ? { background: profile.avatarAccent } : {}}
              >
                {avatarUrl
                  ? <img className={styles.avatarImg} src={avatarUrl} alt={displayName} decoding="async" />
                  : <span className={styles.avatarLetter}>{displayName[0].toUpperCase()}</span>
                }
              </div>
              {!isOwnProfile && isOnline && (
                <span className={styles.onlineDot} aria-label="Active recently" />
              )}
            </div>

            {/* Identity — stacked vertically on the right */}
            <div className={styles.identity}>
              <div className={styles.displayName}>{displayName}</div>
              <div className={styles.usernameRow}>
                <span className={styles.userName}>@{userName}</span>
              </div>

              {rank && (
                <div className={styles.rankPill}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {rank}
                </div>
              )}

              {(profile.location || profile.joinDate) && (
                <div className={styles.locationRow}>
                  {profile.location && (
                    <span className={styles.locationItem}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      {profile.location}
                    </span>
                  )}
                  {profile.location && profile.joinDate && <span className={styles.locationDot}>·</span>}
                  {profile.joinDate && (
                    <span className={styles.locationItem}>
                      Member since {new Date(profile.joinDate).getFullYear()}
                    </span>
                  )}
                </div>
              )}

              {lastSeen && (
                <div className={styles.lastSeen}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                  </svg>
                  Last seen {lastSeen}
                </div>
              )}

              {(profile.signature || profile.bio) && (
                <p className={styles.sigBio}>{profile.signature || profile.bio}</p>
              )}
            </div>{/* /identity */}
          </div>{/* /profileHeader */}

          {/* Badge icon strip — shown when profile has badges */}
          {profileBadges.length > 0 && (
            <div className={styles.badgeStrip}>
              {profileBadges.slice(0, 6).map(b => (
                <img
                  key={b.id}
                  className={styles.badgeStripImg}
                  src={b.imageUrl}
                  alt={b.name}
                  title={b.name}
                  loading="lazy"
                  decoding="async"
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              ))}
              {profileBadges.length > 6 && (
                <span className={styles.badgeStripMore}>+{profileBadges.length - 6}</span>
              )}
            </div>
          )}

          {/* Stats bar: Posts | Comments | Joined | Visited */}
          {profileStats.length > 0 && (
            <div className={styles.statsBar}>
              {profileStats.map((stat, idx) => (
                <Fragment key={stat.key}>
                  {idx > 0 && <div className={styles.statDivider} />}
                  {stat.tab ? (
                    <button
                      className={`${styles.statBtn} ${activeTab === stat.tab ? styles.statBtnActive : ''}`}
                      onClick={() => setActiveTab(stat.tab)}
                    >
                      <span className={styles.statVal}>{stat.display}</span>
                      <span className={styles.statLbl}>{stat.label}</span>
                    </button>
                  ) : (
                    <div className={styles.statInfo}>
                      <span className={`${styles.statVal} ${stat.display === '—' ? styles.statValEmpty : styles.statValDate}`}>{stat.display}</span>
                      <span className={styles.statLbl}>{stat.label}</span>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}

          {/* Profile actions (other-user only) */}
          {!isOwnProfile && effectiveUserId && (
            <ProfileActions
              targetUserId={effectiveUserId}
              targetUsername={profile.userName}
              onMessageUser={onMessageUser}
              buddyDetails={buddyDetails}
            />
          )}
        </div>
      </div>

      {/* ── Sticky tab bar ─────────────────────────────────────────────── */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div className={styles.content}>
        {activeTab === 'activity'  && <ActivityTab userId={effectiveUserId} isSelf={isOwnProfile} preloaded={profileActivities} />}
        {activeTab === 'posts'     && <PostsTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'comments'  && <CommentsTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'buddies'   && <BuddiesTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'favorites' && <FavoritesTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'forums'    && <ForumsTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'badges'    && <BadgesTab userId={effectiveUserId} isSelf={isOwnProfile} />}
        {activeTab === 'drafts'       && <DraftsTab />}
        {activeTab === 'watching'     && <WatchingTab />}
        {activeTab === 'ff-following' && <FFFollowingTab />}
        {activeTab === 'ff-followers' && <FFFollowersTab />}
        {activeTab === 'warnings'     && <WarningsTab />}
      </div>
    </div>
  );
}

/* ── Profile actions ─────────────────────────────────────────────────────── */
function ProfileActions({ targetUserId, targetUsername, onMessageUser, buddyDetails }) {
  const [busy, setBusy]               = useState(false);
  const [status, setStatus]           = useState(null);
  const [requestSent, setRequestSent] = useState(buddyDetails?.friend === 1);
  const [blocked, setBlocked]         = useState(buddyDetails?.block === 1);
  const [showMore, setShowMore]       = useState(false);
  const moreRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showMore) return;
    function handler(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  async function handleAddBuddy() {
    if (busy || requestSent) return;
    setBusy(true);
    setStatus(null);
    try {
      await buddiesApi.sendFriendRequest(targetUserId);
      setRequestSent(true);
      setStatus({ kind: 'ok', text: 'Friend request sent!' });
    } catch (err) {
      setStatus({ kind: 'err', text: extractApiError(err, 'Failed to send friend request') });
    } finally {
      setBusy(false);
    }
  }

  async function handleBlock() {
    setShowMore(false);
    if (busy) return;
    const next = !blocked;
    if (next && !confirm('Block this user? They will not be able to message or interact with you.')) return;
    setBusy(true);
    setStatus(null);
    try {
      await buddiesApi.blockUser({ blockedUserId: targetUserId, block: next });
      setBlocked(next);
      setStatus({ kind: 'ok', text: next ? 'User blocked' : 'User unblocked' });
    } catch (err) {
      setStatus({ kind: 'err', text: extractApiError(err, next ? 'Failed to block user' : 'Failed to unblock user') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.actions}>
        {/* Add Buddy — switches to outlined success style once sent */}
        <button
          className={`${styles.primaryBtn} ${requestSent ? styles.primaryBtnSuccess : ''}`}
          onClick={handleAddBuddy}
          disabled={busy || requestSent}
        >
          {requestSent ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 5 }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              Buddies
            </>
          ) : '+ Add Buddy'}
        </button>

        {/* Message */}
        {onMessageUser && (
          <button
            className={styles.secondaryBtn}
            onClick={() => onMessageUser({ userId: targetUserId, username: targetUsername })}
            disabled={busy}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Message
          </button>
        )}

        {/* More — opens dropdown with Block/Unblock */}
        <div className={styles.moreWrap} ref={moreRef}>
          <button
            className={`${styles.iconBtn} ${blocked ? styles.iconBtnActive : ''}`}
            onClick={() => setShowMore(v => !v)}
            disabled={busy}
            title="More options"
            aria-expanded={showMore}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {showMore && (
            <div className={styles.moreMenu} role="menu">
              <button
                className={`${styles.moreMenuItem} ${blocked ? styles.moreMenuItemActive : ''}`}
                onClick={handleBlock}
                role="menuitem"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/>
                </svg>
                {blocked ? 'Unblock User' : 'Block User'}
              </button>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className={`${styles.actionStatus} ${status.kind === 'err' ? styles.actionStatusErr : ''}`}>
          {status.text}
        </div>
      )}
    </>
  );
}

/* ── Activity tab — uses activities embedded in the profile API response ─── */
function ActivityCard({ item }) {
  const feed = FEED_META[item.feedTypeId] || { label: 'Activity', cls: 'feedUpdate' };
  const accentColor = FEED_ACCENTS[feed.cls] || 'var(--brand)';
  const isOwnPost = item.userId === item.wallUserId;
  const showAuthor = !isOwnPost && (item.realName || item.userName);

  return (
    <div className={styles.activityCard} style={{ borderLeft: `3px solid ${accentColor}` }}>
      <div className={styles.activityCardTop}>
        <span className={`${styles.feedPill} ${styles[feed.cls]}`}>{feed.label}</span>
        <span className={styles.activityCardTime}>{timeAgo(item.publishedWhen)}</span>
      </div>

      {showAuthor && (
        <div className={styles.activityCardAuthor}>
          from {item.realName || item.userName}
        </div>
      )}

      {item.subject && (
        <div className={styles.activityCardSubject}>{item.subject}</div>
      )}

      {item.content && (
        <p className={styles.activityCardContent}>{item.content}</p>
      )}

      {(item.likeCount > 0 || item.commentCount > 0) && (
        <div className={styles.activityCardCounts}>
          {item.likeCount > 0 && (
            <span className={styles.activityCardCount}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
              </svg>
              {item.likeCount}
            </span>
          )}
          {item.commentCount > 0 && (
            <span className={styles.activityCardCount}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
              </svg>
              {item.commentCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ userId, isSelf, preloaded }) {
  // Pass null userId so useProfileSection skips the API call when we have preloaded data
  const hasPreloaded = preloaded && preloaded.length > 0;
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getActivities,
    hasPreloaded ? null : userId,
    null,
    false,
  );

  if (isSelf) return <EmptyState message="Activity feed coming soon" />;

  const activities = hasPreloaded ? preloaded : data;

  if (loading && !hasPreloaded) return <LoadingState variant="card" count={3} />;
  if (error   && !hasPreloaded) return <ErrorState message={error} onRetry={refetch} />;
  if (!activities.length) return <EmptyState message="No recent activity" />;

  return (
    <div className={styles.list}>
      {activities.map((item) => (
        <ActivityCard key={item.activityId || item.id} item={item} />
      ))}
    </div>
  );
}

/* ── Remaining tab panels (unchanged logic) ──────────────────────────────── */
function PostsTab({ userId, isSelf }) {
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getPosts, userId, profileApi.getMyPosts, isSelf,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No posts yet" />;
  return (
    <div className={styles.list}>
      {data.map((post, i) => (
        <div key={post.id || post.postId || i} className={styles.postItem}>
          <div className={styles.postTitle}>{post.title || post.subject}</div>
          <div className={styles.postMeta}>
            {post.topicName && <span className={styles.postTopic}>{post.topicName}</span>}
            {post.createdAt && <span className={styles.postTime}>{timeAgo(post.createdAt)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CommentsTab({ userId, isSelf }) {
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getComments, userId, profileApi.getMyComments, isSelf,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No comments yet" />;
  return (
    <div className={styles.list}>
      {data.map((comment, i) => (
        <div key={comment.id || comment.commentId || i} className={styles.commentItem}>
          <div className={styles.commentText}>{comment.text || comment.body || comment.contents || comment.content}</div>
          <div className={styles.commentMeta}>
            {comment.articleTitle && <span className={styles.commentSource}>{comment.articleTitle}</span>}
            {(comment.createdAt || comment.createdWhen) && (
              <span className={styles.postTime}>{timeAgo(comment.createdAt || comment.createdWhen)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BuddiesTab({ userId, isSelf }) {
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getBuddyList, userId, profileApi.getMyBuddyList, isSelf,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No buddies yet" />;
  return (
    <div className={styles.grid}>
      {data.map((buddy, i) => {
        const name = buddy.displayName || buddy.userName || 'U';
        return (
          <div key={buddy.userId || i} className={styles.buddyCard}>
            <div className={styles.buddyAvatar} style={buddy.avatarAccent ? { background: buddy.avatarAccent } : {}}>
              {buddy.avatarUrl
                ? <img className={styles.buddyAvatarImg} src={buddy.avatarUrl} alt={name} loading="lazy" decoding="async" />
                : <span>{name[0].toUpperCase()}</span>
              }
            </div>
            <div className={styles.buddyName}>{name}</div>
          </div>
        );
      })}
    </div>
  );
}

function FavoritesTab({ userId, isSelf }) {
  const [subTab, setSubTab] = useState('shows');
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!isSelf && !userId) return;
    setLoading(true);
    setError(null);
    try {
      let res;
      if (isSelf) {
        const selfFn = subTab === 'shows'  ? profileApi.getMyShows
                     : subTab === 'movies' ? profileApi.getMyMovies
                     : profileApi.getMyCelebs;
        res = await selfFn();
      } else {
        const apiFn = subTab === 'shows'  ? profileApi.getShows
                    : subTab === 'movies' ? profileApi.getMovies
                    : profileApi.getCelebs;
        res = await apiFn(userId);
      }
      const d = res.data || {};
      const items = d.movies || d.shows || d.celebs || d.celebrities || d.items || d.data || [];
      setData(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(extractApiError(err, `Failed to load ${subTab}`));
    } finally {
      setLoading(false);
    }
  }, [userId, subTab, isSelf]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <>
      <div className={styles.subTabs}>
        {['shows', 'movies', 'celebs'].map((t) => (
          <button
            key={t}
            className={`${styles.subTab} ${subTab === t ? styles.subTabActive : ''}`}
            onClick={() => setSubTab(t)}
          >
            {t === 'celebs' ? 'Celebs' : t === 'movies' ? 'Movies' : 'Shows'}
          </button>
        ))}
      </div>
      {loading ? <LoadingState variant="card" count={3} />
        : error ? <ErrorState message={error} onRetry={fetch} />
        : !data.length ? <EmptyState message={`No ${subTab} added`} />
        : (
          <div className={styles.posterGrid}>
            {data.map((item, i) => {
              const id     = item.titleId || item.celebId || item.id || i;
              const name   = item.titleName || item.celebName || item.name || item.title || '—';
              const poster = item.posterUrl || item.thumbnail || item.imageUrl;
              const year   = item.startYear;
              const rating = item.averageRating;
              return (
                <div key={id} className={styles.posterCard}>
                  {poster
                    ? <img className={styles.posterImg} src={poster} alt={name} loading="lazy" />
                    : <div className={styles.posterPlaceholder}>{(name || '?').charAt(0).toUpperCase()}</div>
                  }
                  <div className={styles.posterName} title={name}>{name}</div>
                  {(year || rating > 0) && (
                    <div className={styles.posterMeta}>
                      {year && <span>{year}</span>}
                      {rating > 0 && <span>★ {Number(rating).toFixed(1)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      }
    </>
  );
}

function ForumsTab({ userId, isSelf }) {
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getForums, userId, profileApi.getMyForums, isSelf,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No forum activity" />;
  return (
    <div className={styles.list}>
      {data.map((forum, i) => (
        <div key={forum.id || forum.forumId || i} className={styles.forumItem}>
          <div className={styles.forumName}>{forum.name || forum.title || forum.forumName}</div>
          {(forum.postCount ?? forum.topicCount) != null && (
            <div className={styles.forumMeta}>
              {(forum.postCount ?? forum.topicCount)} {forum.postCount != null ? 'posts' : 'topics'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BadgesTab({ userId, isSelf }) {
  const { data, loading, error, refetch } = useProfileSection(
    profileApi.getBadges, userId, profileApi.getMyBadges, isSelf,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No badges earned" />;
  return (
    <div className={styles.badgeGrid}>
      {data.map((badge, i) => (
        <div key={badge.id || badge.badgeId || i} className={styles.badgeCard}>
          {badge.icon || badge.imageUrl
            ? <img className={styles.badgeIcon} src={badge.icon || badge.imageUrl} alt={badge.name} loading="lazy" decoding="async" />
            : <div className={styles.badgePlaceholder}>★</div>
          }
          <div className={styles.badgeName}>{badge.name || badge.title}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Own-profile-only tabs ───────────────────────────────────────────────── */
function DraftsTab() {
  const { data, loading, error, refetch } = useProfileSection(null, null, profileApi.getMyForumDrafts, true);
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No drafts saved" />;
  return (
    <div className={styles.list}>
      {data.map((draft, i) => (
        <div key={draft.draftId || draft.id || i} className={styles.postItem}>
          <div className={styles.postTitle}>{draft.subject || draft.title || '(untitled draft)'}</div>
          <div className={styles.postMeta}>
            {draft.forumName && <span className={styles.postTopic}>{draft.forumName}</span>}
            {draft.savedWhen && <span className={styles.postTime}>{timeAgo(draft.savedWhen)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchingTab() {
  const { data, loading, error, refetch } = useProfileSection(null, null, profileApi.getMyWatchingTopics, true);
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="Not watching any topics" />;
  return (
    <div className={styles.list}>
      {data.map((topic, i) => (
        <div key={topic.topicId || topic.id || i} className={styles.postItem}>
          <div className={styles.postTitle}>{topic.subject || topic.title || topic.topicName}</div>
          <div className={styles.postMeta}>
            {topic.forumName && <span className={styles.postTopic}>{topic.forumName}</span>}
            {topic.lastPostWhen && <span className={styles.postTime}>{timeAgo(topic.lastPostWhen)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function FFFollowingTab() {
  const { data, loading, error, refetch } = useProfileSection(null, null, profileApi.getMyFanfictionAuthors, true);
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="Not following anyone" />;
  return (
    <div className={styles.grid}>
      {data.map((a, i) => {
        const name = a.displayName || a.userName || 'U';
        return (
          <div key={a.userId || i} className={styles.buddyCard}>
            <div className={styles.buddyAvatar}><span>{name[0].toUpperCase()}</span></div>
            <div className={styles.buddyName}>{name}</div>
          </div>
        );
      })}
    </div>
  );
}

function FFFollowersTab() {
  const { data, loading, error, refetch } = useProfileSection(null, null, profileApi.getMyFanfictionFollowers, true);
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No followers yet" />;
  return (
    <div className={styles.grid}>
      {data.map((f, i) => {
        const name = f.displayName || f.userName || 'U';
        return (
          <div key={f.userId || i} className={styles.buddyCard}>
            <div className={styles.buddyAvatar}><span>{name[0].toUpperCase()}</span></div>
            <div className={styles.buddyName}>{name}</div>
          </div>
        );
      })}
    </div>
  );
}

function WarningsTab() {
  const { data, loading, error, refetch } = useProfileSection(null, null, profileApi.getMyWarningDetails, true);
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No warnings on record" />;
  return (
    <div className={styles.list}>
      {data.map((w, i) => (
        <div key={w.warningId || w.id || i} className={styles.commentItem}>
          <div className={styles.commentText}>{w.reason || w.note || w.message || 'Warning issued'}</div>
          <div className={styles.commentMeta}>
            {w.issuedBy && <span className={styles.commentSource}>{w.issuedBy}</span>}
            {w.issuedWhen && <span className={styles.postTime}>{timeAgo(w.issuedWhen)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
