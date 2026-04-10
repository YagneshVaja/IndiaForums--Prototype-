import { useMemo } from 'react';
import styles from './FanFictionAuthorsScreen.module.css';
import { useFanFictionAuthors } from '../../hooks/useFanFictions';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState   from '../../components/ui/EmptyState';

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

function formatCount(n) {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (num >= 100000)   return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (num >= 1000)     return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

// Deterministic accent color per author so the cards have visual variety
// without depending on backend-provided colors.
const ACCENTS = [
  'linear-gradient(135deg,#3558F0,#7C3AED)',
  'linear-gradient(135deg,#E03A5C,#F59E0B)',
  'linear-gradient(135deg,#16A34A,#3558F0)',
  'linear-gradient(135deg,#7C3AED,#E03A5C)',
  'linear-gradient(135deg,#D97706,#16A34A)',
];
function accentFor(name = '') {
  const n = String(name).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ACCENTS[n % ACCENTS.length];
}

// ── Author leaderboard row ───────────────────────────────────────────────────
function AuthorRow({ author, rank, onPress, onFollowersPress }) {
  const id        = pick(author, 'authorId', 'userId', 'id');
  const name      = pick(author, 'authorName', 'userName', 'name', 'displayName') || 'Unknown';
  const stories   = pick(author, 'storyCount', 'fanFictionCount', 'storiesCount') || 0;
  const followers = pick(author, 'followerCount', 'followers') || 0;
  const views     = pick(author, 'viewCount', 'views') || 0;
  const avatar    = pick(author, 'avatarUrl', 'thumbnail', 'profileImage');
  const tagline   = pick(author, 'bio', 'tagline', 'description');

  const isTop3 = rank <= 3;

  return (
    <div className={styles.row}>
      <div className={`${styles.rank} ${isTop3 ? styles.rankTop : ''}`}>
        {rank <= 3 && <span className={styles.medal}>{['🥇', '🥈', '🥉'][rank - 1]}</span>}
        <span className={styles.rankNum}>#{rank}</span>
      </div>

      <button className={styles.author} onClick={() => onPress?.(id, author)}>
        {avatar
          ? <img className={styles.avatar} src={avatar} alt={name} loading="lazy" decoding="async" />
          : <div className={styles.avatarFallback} style={{ background: accentFor(name) }}>
              {name.charAt(0).toUpperCase()}
            </div>}

        <div className={styles.body}>
          <div className={styles.name}>{name}</div>
          {tagline && <div className={styles.tagline}>{tagline}</div>}
          <div className={styles.statsRow}>
            <span className={styles.statPill}>📖 {formatCount(stories)} stories</span>
            <span
              className={`${styles.statPill} ${styles.statPillLink}`}
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onFollowersPress?.(id, name); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onFollowersPress?.(id, name); } }}
            >
              👥 {formatCount(followers)} followers
            </span>
            {views > 0 && <span className={styles.statPill}>👁 {formatCount(views)}</span>}
          </div>
        </div>
      </button>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function FanFictionAuthorsScreen({ onAuthorPress, onAuthorFollowersPress }) {
  const { authors, loading, error, pagination, loadMore } = useFanFictionAuthors({ pageSize: 20 });

  const ranked = useMemo(() => {
    return authors.map((a, i) => ({ author: a, rank: i + 1 }));
  }, [authors]);

  if (loading && authors.length === 0) {
    return <div className={styles.screen}><LoadingState count={6} /></div>;
  }
  if (error && authors.length === 0) {
    // /fan-fictions/authors currently returns HTTP 500 (backend bug —
    // tracked in docs/backend-issues-2026-04-07.md). Show a clearer notice
    // than a raw error message so users understand it's not their fault.
    return (
      <div className={styles.screen}>
        <EmptyState
          icon="🛠"
          title="Top authors temporarily unavailable"
          subtitle="The leaderboard service is being fixed. Please check back later."
        />
      </div>
    );
  }
  if (authors.length === 0) {
    return <div className={styles.screen}><EmptyState icon="✍️" title="No authors yet" /></div>;
  }

  return (
    <div className={styles.screen}>
      <div className={styles.intro}>
        <div className={styles.introIcon}>🏆</div>
        <div className={styles.introBody}>
          <div className={styles.introTitle}>Top Fan Fiction Authors</div>
          <div className={styles.introSub}>The community's most prolific storytellers</div>
        </div>
      </div>

      <div className={styles.list}>
        {ranked.map(({ author, rank }) => (
          <AuthorRow
            key={pick(author, 'authorId', 'userId', 'id') || rank}
            author={author}
            rank={rank}
            onPress={onAuthorPress}
            onFollowersPress={onAuthorFollowersPress}
          />
        ))}
      </div>

      {pagination?.hasNextPage && (
        <button className={styles.loadMore} onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more authors'}
        </button>
      )}

      <div className={styles.spacer} />
    </div>
  );
}
