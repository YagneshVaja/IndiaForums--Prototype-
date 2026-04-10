import { useState, useEffect, useCallback } from 'react';
import useUserProfile, { useProfileSection } from '../../hooks/useUserProfile';
import { useAuth } from '../../contexts/AuthContext';
import * as profileApi from '../../services/userProfileApi';
import * as buddiesApi from '../../services/buddiesApi';
import { timeAgo, extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './ProfileScreen.module.css';

const BASE_TABS = [
  { key: 'activity',  label: 'Activity' },
  { key: 'posts',     label: 'Posts' },
  { key: 'comments',  label: 'Comments' },
  { key: 'buddies',   label: 'Buddies' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'forums',    label: 'Forums' },
  { key: 'badges',    label: 'Badges' },
];

// Own-profile-only tabs added in Phase 8 (niche read-only feeds).
const SELF_TABS = [
  { key: 'drafts',     label: 'Drafts' },
  { key: 'watching',   label: 'Watching' },
  { key: 'ff-following', label: 'Following' },
  { key: 'ff-followers', label: 'FF Fans' },
  { key: 'warnings',   label: 'Warnings' },
];

/**
 * @param {number|null} userId - null = own profile (uses auth context data)
 */
export default function ProfileScreen({ userId }) {
  const { user: authUser } = useAuth();
  const isOwnProfile = !userId || userId === authUser?.userId;

  // For own profile, use auth context data directly; for others, fetch from API
  const { profile: fetchedProfile, loading, error, refetch } = useUserProfile(isOwnProfile ? 'skip' : userId);

  const profile = isOwnProfile ? authUser : fetchedProfile;
  const effectiveUserId = isOwnProfile ? authUser?.userId : userId;

  const TABS = isOwnProfile ? [...BASE_TABS, ...SELF_TABS] : BASE_TABS;
  const [activeTab, setActiveTab] = useState('activity');

  if (!isOwnProfile && loading) return <div className={styles.screen}><LoadingState variant="card" count={3} /></div>;
  if (!isOwnProfile && error)   return <div className={styles.screen}><ErrorState message={error} onRetry={refetch} /></div>;
  if (!profile) return <div className={styles.screen}><EmptyState message="Profile not found" /></div>;

  return (
    <div className={styles.screen}>
      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {profile.avatar
            ? <img className={styles.avatarImg} src={profile.avatar} alt={profile.displayName || profile.userName} decoding="async" />
            : <span className={styles.avatarLetter}>{(profile.displayName || profile.userName || 'U')[0].toUpperCase()}</span>
          }
        </div>
        <div className={styles.info}>
          <div className={styles.displayName}>{profile.displayName || profile.userName}</div>
          <div className={styles.userName}>@{profile.userName}</div>
          {profile.joinDate && (
            <div className={styles.joined}>Joined {timeAgo(profile.joinDate)}</div>
          )}
        </div>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        <div className={styles.stats}>
          <Stat label="Posts" value={profile.postCount} />
          <Stat label="Buddies" value={profile.buddyCount} />
          <Stat label="Badges" value={profile.badgeCount} />
        </div>
        {!isOwnProfile && effectiveUserId && (
          <ProfileActions targetUserId={effectiveUserId} />
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
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
        {activeTab === 'activity'  && <ActivityTab userId={effectiveUserId} isSelf={isOwnProfile} />}
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

/* ── Stat pill ─────────────────────────────────────────────────────────────── */
function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value ?? 0}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

/* ── Profile actions (other-user only) ─────────────────────────────────────── */
// Renders "Add Buddy" + "Block" buttons under the header on other-user profiles.
// Tracks a single inflight action with `busy` and surfaces success/error inline
// so we don't fight with the rest of the screen's loading state.
function ProfileActions({ targetUserId }) {
  const [busy, setBusy]       = useState(false);
  const [status, setStatus]   = useState(null); // { kind: 'ok'|'err', text }
  const [requestSent, setRequestSent] = useState(false);
  const [blocked, setBlocked] = useState(false);

  async function handleAddBuddy() {
    if (busy || requestSent) return;
    setBusy(true);
    setStatus(null);
    try {
      await buddiesApi.sendFriendRequest(targetUserId);
      setRequestSent(true);
      setStatus({ kind: 'ok', text: 'Friend request sent' });
    } catch (err) {
      setStatus({ kind: 'err', text: extractApiError(err, 'Failed to send friend request') });
    } finally {
      setBusy(false);
    }
  }

  async function handleBlock() {
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
        <button
          className={styles.primaryBtn}
          onClick={handleAddBuddy}
          disabled={busy || requestSent}
        >
          {requestSent ? 'Request Sent' : 'Add Buddy'}
        </button>
        <button
          className={styles.secondaryBtn}
          onClick={handleBlock}
          disabled={busy}
          title={blocked ? 'Unblock user' : 'Block user'}
        >
          {blocked ? 'Unblock' : 'Block'}
        </button>
      </div>
      {status && (
        <div className={`${styles.actionStatus} ${status.kind === 'err' ? styles.actionStatusErr : ''}`}>
          {status.text}
        </div>
      )}
    </>
  );
}

/* ── Tab panels ────────────────────────────────────────────────────────────── */
// Note: /my-activities, /my-buddylist, /my-movies, /my-shows, /my-celebs, /my-forums
// don't exist as self endpoints — those tabs only show data for other users.
// For own profile, tabs without a /my-* endpoint show "No data" gracefully.

function ActivityTab({ userId, isSelf }) {
  // No /my-activities endpoint exists
  const { data, loading, error, refetch } = useProfileSection(profileApi.getActivities, userId, null, false);
  if (isSelf) return <EmptyState message="Activity feed coming soon" />;
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No recent activity" />;
  return (
    <div className={styles.list}>
      {data.map((item, i) => (
        <div key={item.id || i} className={styles.activityItem}>
          <div className={styles.activityText}>{item.description || item.text || item.title}</div>
          {item.createdAt && <div className={styles.activityTime}>{timeAgo(item.createdAt)}</div>}
        </div>
      ))}
    </div>
  );
}

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
          <div className={styles.commentText}>{comment.text || comment.body || comment.content}</div>
          <div className={styles.commentMeta}>
            {comment.articleTitle && <span className={styles.commentSource}>{comment.articleTitle}</span>}
            {comment.createdAt && <span className={styles.postTime}>{timeAgo(comment.createdAt)}</span>}
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
      {data.map((buddy, i) => (
        <div key={buddy.userId || i} className={styles.buddyCard}>
          <div className={styles.buddyAvatar}>
            {(buddy.displayName || buddy.userName || 'U')[0].toUpperCase()}
          </div>
          <div className={styles.buddyName}>{buddy.displayName || buddy.userName}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Favorites tab — Phase 7 wired the other-profile path (`/users/{id}/movies|shows|celebs`);
 * Phase 8 switches own profile to the dedicated self endpoints
 * `/my-favourite-{movies|shows|celebrities}` (MyFavouriteMoviesResponseDto etc.).
 *
 * Response keys (per OpenAPI spec):
 *   movies → { movies: MovieDto[] }
 *   shows  → { shows:  ShowDto[] }
 *   celebs → { celebs|celebrities: CelebDto[] }
 */
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
              const id    = item.titleId || item.celebId || item.id || i;
              const name  = item.titleName || item.celebName || item.name || item.title || '—';
              const poster = item.posterUrl || item.thumbnail || item.imageUrl;
              const year  = item.startYear;
              const rating = item.averageRating;
              return (
                <div key={id} className={styles.posterCard}>
                  {poster ? (
                    <img className={styles.posterImg} src={poster} alt={name} loading="lazy" />
                  ) : (
                    <div className={styles.posterPlaceholder}>
                      {(name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
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
          {badge.icon
            ? <img className={styles.badgeIcon} src={badge.icon} alt={badge.name} loading="lazy" decoding="async" />
            : <div className={styles.badgePlaceholder}>★</div>
          }
          <div className={styles.badgeName}>{badge.name || badge.title}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Phase 8 — own-profile-only tabs ────────────────────────────────────── */

// Forum drafts (unsent replies/topics)
function DraftsTab() {
  const { data, loading, error, refetch } = useProfileSection(
    null, null, profileApi.getMyForumDrafts, true,
  );
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

// Topics the user is watching (subscribed for notifications)
function WatchingTab() {
  const { data, loading, error, refetch } = useProfileSection(
    null, null, profileApi.getMyWatchingTopics, true,
  );
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

// Fanfiction authors the user follows
function FFFollowingTab() {
  const { data, loading, error, refetch } = useProfileSection(
    null, null, profileApi.getMyFanfictionAuthors, true,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="Not following anyone" />;
  return (
    <div className={styles.grid}>
      {data.map((a, i) => (
        <div key={a.userId || i} className={styles.buddyCard}>
          <div className={styles.buddyAvatar}>
            {(a.displayName || a.userName || 'U')[0].toUpperCase()}
          </div>
          <div className={styles.buddyName}>{a.displayName || a.userName}</div>
        </div>
      ))}
    </div>
  );
}

// Users following the authenticated user's fanfictions
function FFFollowersTab() {
  const { data, loading, error, refetch } = useProfileSection(
    null, null, profileApi.getMyFanfictionFollowers, true,
  );
  if (loading) return <LoadingState variant="card" count={3} />;
  if (error)   return <ErrorState message={error} onRetry={refetch} />;
  if (!data.length) return <EmptyState message="No followers yet" />;
  return (
    <div className={styles.grid}>
      {data.map((f, i) => (
        <div key={f.userId || i} className={styles.buddyCard}>
          <div className={styles.buddyAvatar}>
            {(f.displayName || f.userName || 'U')[0].toUpperCase()}
          </div>
          <div className={styles.buddyName}>{f.displayName || f.userName}</div>
        </div>
      ))}
    </div>
  );
}

// Moderation warning history for the authenticated user
function WarningsTab() {
  const { data, loading, error, refetch } = useProfileSection(
    null, null, profileApi.getMyWarningDetails, true,
  );
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
