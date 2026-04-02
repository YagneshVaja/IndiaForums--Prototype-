import { useState, useMemo } from 'react';
import styles from './CelebritiesScreen.module.css';
import useCelebrities from '../hooks/useCelebrities';
import { CELEB_CATEGORIES } from '../services/api';

// ── Helpers ─────────────────────────────────────────────────────────────────
function TrendBadge({ trend, rankDiff, variant = 'default' }) {
  const cls = variant === 'small' ? styles.trendSmall : styles.trend;
  if (trend === 'up') {
    return <span className={`${cls} ${styles.trendUp}`}>▲ {rankDiff}</span>;
  }
  if (trend === 'down') {
    return <span className={`${cls} ${styles.trendDown}`}>▼ {rankDiff}</span>;
  }
  return <span className={`${cls} ${styles.trendStable}`}>—</span>;
}

function Initials({ name }) {
  return (
    <span className={styles.initials}>
      {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
    </span>
  );
}

// ── #1 Hero Card ────────────────────────────────────────────────────────────
function HeroCard({ celeb, onPress }) {
  return (
    <div className={styles.heroCard} onClick={() => onPress(celeb)}>
      {celeb.thumbnail ? (
        <img className={styles.heroImg} src={celeb.thumbnail} alt={celeb.name} loading="eager" />
      ) : (
        <div className={styles.heroImgFallback}><Initials name={celeb.name} /></div>
      )}
      <div className={styles.heroScrim} />

      {/* Top bar */}
      <div className={styles.heroTop}>
        <div className={styles.heroCrown}>
          <span className={styles.heroCrownIcon}>👑</span>
          <span className={styles.heroCrownText}>#1 This Week</span>
        </div>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} />
      </div>

      <div className={styles.heroSpacer} />

      {/* Bottom info */}
      <div className={styles.heroBottom}>
        <h2 className={styles.heroName}>{celeb.name}</h2>
        {celeb.shortDesc && (
          <p className={styles.heroDesc}>{celeb.shortDesc}</p>
        )}
        <div className={styles.heroMeta}>
          {celeb.prevRank > 0 && (
            <span className={styles.heroPrev}>was #{celeb.prevRank}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── #2 & #3 Runner-Up Cards ─────────────────────────────────────────────────
function RunnerCard({ celeb, onPress }) {
  const medal = celeb.rank === 2 ? '🥈' : '🥉';
  const borderCls = celeb.rank === 2 ? styles.runnerSilver : styles.runnerBronze;

  return (
    <div className={`${styles.runnerCard} ${borderCls}`} onClick={() => onPress(celeb)}>
      <div className={styles.runnerImgWrap}>
        {celeb.thumbnail ? (
          <img className={styles.runnerImg} src={celeb.thumbnail} alt={celeb.name} loading="lazy" />
        ) : (
          <div className={styles.runnerImgFallback}><Initials name={celeb.name} /></div>
        )}
        <div className={styles.runnerImgScrim} />
        <span className={styles.runnerBadge}>{medal} #{celeb.rank}</span>
      </div>
      <div className={styles.runnerBody}>
        <div className={styles.runnerName}>{celeb.name}</div>
        {celeb.shortDesc && (
          <div className={styles.runnerDesc}>{celeb.shortDesc}</div>
        )}
        <div className={styles.runnerMeta}>
          <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} variant="small" />
          {celeb.prevRank > 0 && (
            <span className={styles.runnerPrev}>was #{celeb.prevRank}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Rank 4+ list card ───────────────────────────────────────────────────────
function RankRow({ celeb, onPress }) {
  return (
    <div className={styles.rankRow} onClick={() => onPress(celeb)}>
      <div className={styles.rankNum}>
        <span className={styles.rankNumText}>{celeb.rank}</span>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} variant="small" />
      </div>

      <div className={styles.rankAvatar}>
        {celeb.thumbnail ? (
          <img className={styles.rankAvatarImg} src={celeb.thumbnail} alt={celeb.name} loading="lazy" />
        ) : (
          <Initials name={celeb.name} />
        )}
      </div>

      <div className={styles.rankInfo}>
        <div className={styles.rankName}>{celeb.name}</div>
        {celeb.shortDesc ? (
          <div className={styles.rankDesc}>{celeb.shortDesc}</div>
        ) : celeb.prevRank > 0 ? (
          <div className={styles.rankPrev}>Last week: #{celeb.prevRank}</div>
        ) : null}
      </div>

      <span className={styles.rankChevron}>
        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function CelebSkeleton() {
  return (
    <div className={styles.screen}>
      <div className={styles.catBar}>
        <div className={styles.catSegment}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skPill} />)}
        </div>
      </div>
      <div className={styles.skBody}>
        <div className={styles.skHero} />
        <div className={styles.skRunnerRow}>
          <div className={styles.skRunner} />
          <div className={styles.skRunner} />
        </div>
        {[1, 2, 3, 4].map(i => <div key={i} className={styles.skRow} />)}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function CelebritiesScreen({ onCelebPress }) {
  const [activeCat, setActiveCat] = useState('bollywood');
  const { categories, rankDates, loading, error, refresh } = useCelebrities();

  const celebs  = useMemo(() => categories[activeCat] || [], [categories, activeCat]);
  const hero    = celebs[0] || null;
  const runners = celebs.slice(1, 3);
  const rest    = celebs.slice(3);

  if (loading) return <CelebSkeleton />;

  if (error) {
    return (
      <div className={styles.screen}>
        <div className={styles.errorWrap}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorMsg}>{error}</p>
          <button className={styles.retryBtn} onClick={refresh}>Try Again</button>
        </div>
      </div>
    );
  }

  const weekLabel = rankDates.start && rankDates.end
    ? `${new Date(rankDates.start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${new Date(rankDates.end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';

  return (
    <div className={styles.screen}>
      {/* Category selector */}
      <div className={styles.catBar}>
        <div className={styles.catSegment}>
          {CELEB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCat === cat.id ? styles.catBtnActive : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        {weekLabel && (
          <div className={styles.weekRow}>
            <span className={styles.weekDot} />
            <span className={styles.weekText}>{weekLabel}</span>
          </div>
        )}
      </div>

      {celebs.length === 0 ? (
        <div className={styles.emptyWrap}>
          <span className={styles.emptyIcon}>🔍</span>
          <span className={styles.emptyText}>No celebrities found</span>
        </div>
      ) : (
        <div className={styles.feed}>
          {/* #1 Hero */}
          {hero && <HeroCard celeb={hero} onPress={onCelebPress} />}

          {/* #2 & #3 */}
          {runners.length > 0 && (
            <div className={styles.runnerRow}>
              {runners.map((c) => (
                <RunnerCard key={c.id} celeb={c} onPress={onCelebPress} />
              ))}
            </div>
          )}

          {/* Rank 4+ */}
          {rest.length > 0 && (
            <div className={styles.rankList}>
              <div className={styles.rankListHeader}>Rankings</div>
              {rest.map((c) => (
                <RankRow key={c.id} celeb={c} onPress={onCelebPress} />
              ))}
            </div>
          )}

          <div className={styles.spacer} />
        </div>
      )}
    </div>
  );
}
