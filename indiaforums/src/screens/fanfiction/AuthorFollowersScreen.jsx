import styles from './AuthorFollowersScreen.module.css';
import { useFanFictionAuthorFollowers } from '../../hooks/useFanFictions';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState   from '../../components/ui/EmptyState';

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

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

export default function AuthorFollowersScreen({ authorId, authorName }) {
  const { followers, pagination, loading, error, loadMore } = useFanFictionAuthorFollowers(authorId);

  if (loading && followers.length === 0) {
    return <div className={styles.screen}><LoadingState count={6} /></div>;
  }
  if (error && followers.length === 0) {
    // /fan-fictions/author/{id}/followers currently returns HTTP 400
    // (backend bug — tracked in docs/backend-issues-2026-04-07.md). Show a
    // friendly notice rather than the raw error message.
    return (
      <div className={styles.screen}>
        <EmptyState
          icon="🛠"
          title="Followers temporarily unavailable"
          subtitle="The followers service is being fixed. Please check back later."
        />
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>👥</div>
        <div className={styles.headerBody}>
          <div className={styles.headerTitle}>
            {authorName ? `${authorName}'s followers` : 'Followers'}
          </div>
          <div className={styles.headerSub}>
            {pagination?.totalCount > 0 || pagination?.totalItems > 0
              ? `${(pagination.totalCount || pagination.totalItems).toLocaleString()} total`
              : `${followers.length} loaded`}
          </div>
        </div>
      </div>

      {followers.length === 0 ? (
        <EmptyState icon="👥" title="No followers yet" subtitle="This author hasn't been followed by anyone." />
      ) : (
        <div className={styles.grid}>
          {followers.map((f, i) => {
            const name   = pick(f, 'userName', 'displayName', 'name') || 'Reader';
            const id     = pick(f, 'userId', 'id') || i;
            const avatar = pick(f, 'avatarUrl', 'thumbnail', 'profileImage');
            const level  = pick(f, 'level', 'rank', 'tier');

            return (
              <div key={id} className={styles.card}>
                {avatar
                  ? <img className={styles.avatar} src={avatar} alt={name} loading="lazy" decoding="async" />
                  : <div className={styles.avatarFallback} style={{ background: accentFor(name) }}>
                      {name.charAt(0).toUpperCase()}
                    </div>}
                <div className={styles.name}>{name}</div>
                {level && <div className={styles.level}>{level}</div>}
              </div>
            );
          })}
        </div>
      )}

      {pagination?.hasNextPage && (
        <button className={styles.loadMore} onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <div className={styles.spacer} />
    </div>
  );
}
