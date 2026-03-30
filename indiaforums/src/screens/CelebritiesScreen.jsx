import { useState } from 'react';
import styles from './CelebritiesScreen.module.css';
import SectionHeader from '../components/ui/SectionHeader';
import { CELEBS, CELEB_CATEGORIES, WEEK_LABEL } from '../data/celebrities';

// ── Trend badge ───────────────────────────────────────────────────────────────
function TrendBadge({ trend, prevRank, rank, variant = 'default' }) {
  const cls = variant === 'small' ? styles.trendSmall : styles.trend;
  if (trend === 'up') {
    const diff = prevRank - rank;
    return <span className={`${cls} ${styles.trendUp}`}>▲ {diff}</span>;
  }
  if (trend === 'down') {
    const diff = rank - prevRank;
    return <span className={`${cls} ${styles.trendDown}`}>▼ {diff}</span>;
  }
  return <span className={`${cls} ${styles.trendStable}`}>—</span>;
}

const MEDAL      = { 1: '🥇', 2: '🥈', 3: '🥉' };
const CAT_ICON   = { bollywood: '🎬', tv: '📺', digital: '💻' };

// ── Buzz arc (SVG) — unique gradient ID per instance to avoid global conflicts ─
function BuzzArc({ value, uid, size = 60, stroke = 5, textColor = '#fff', trackColor = 'rgba(255,255,255,0.2)' }) {
  const r      = (size - stroke * 2) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const full   = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const fillLen = (value / 100) * arcLen;
  const rotate = 135;
  const gradId = `buzz-grad-${uid}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#3558F0" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={trackColor} strokeWidth={stroke}
        strokeDasharray={`${arcLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      {/* Fill */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={stroke}
        strokeDasharray={`${fillLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fontSize={size * 0.24} fontWeight="800" fill={textColor}
        fontFamily="Roboto Condensed, sans-serif">
        {value}
      </text>
    </svg>
  );
}

// ── #1 Hero Card ──────────────────────────────────────────────────────────────
function TopOneCard({ celeb, onPress }) {
  return (
    <div className={styles.topOneCard} style={{ background: celeb.bg }} onClick={() => onPress(celeb)}>
      {/* Single scrim — bottom-to-top dark fade */}
      <div className={styles.topOneScrim} />

      {/* Top row */}
      <div className={styles.topOneTopRow}>
        <div className={styles.topOneMedal}>
          <span className={styles.topOneMedalEmoji}>{MEDAL[1]}</span>
          <span className={styles.topOneMedalLabel}>#1 This Week</span>
        </div>
        <TrendBadge trend={celeb.trend} prevRank={celeb.prevRank} rank={celeb.rank} />
      </div>

      {/* Spacer pushes bottom content down */}
      <div className={styles.topOneSpacer} />

      {/* Big emoji — decorative, centered */}
      <div className={styles.topOneEmojiWrap} aria-hidden="true">
        {celeb.emoji}
      </div>

      {/* Bottom row */}
      <div className={styles.topOneBottomRow}>
        <div className={styles.topOneLeft}>
          <div className={styles.topOneName}>{celeb.name}</div>
          <div className={styles.topOneRole}>{celeb.role}</div>
          <div className={styles.topOneMeta}>
            👥 <span>{celeb.followers}</span>
            &nbsp;·&nbsp;
            <span className={styles.topOneStars}>★ {celeb.stars}</span>
          </div>
        </div>
        <div className={styles.topOneRight}>
          <BuzzArc value={celeb.buzz} uid={`top1-${celeb.id}`} size={62} stroke={5} />
          <span className={styles.topOneBuzzLabel}>Buzz</span>
        </div>
      </div>
    </div>
  );
}

// ── #2 & #3 Podium Cards ──────────────────────────────────────────────────────
function PodiumCard({ celeb, onPress }) {
  const borderVar = celeb.rank === 2 ? styles.podiumSilver : styles.podiumBronze;
  return (
    <div className={`${styles.podiumCard} ${borderVar}`} onClick={() => onPress(celeb)}>
      {/* Gradient image area */}
      <div className={styles.podiumImg} style={{ background: celeb.bg }}>
        <div className={styles.podiumImgScrim} />
        <span className={styles.podiumRankBadge}>
          {MEDAL[celeb.rank]} #{celeb.rank}
        </span>
        <div className={styles.podiumEmoji} aria-hidden="true">{celeb.emoji}</div>
      </div>

      {/* Info */}
      <div className={styles.podiumInfo}>
        <div className={styles.podiumName}>{celeb.name}</div>
        <div className={styles.podiumBuzzRow}>
          <div className={styles.podiumBuzzBar}>
            <div className={styles.podiumBuzzFill} style={{ width: `${celeb.buzz}%` }} />
          </div>
          <span className={styles.podiumBuzzNum}>{celeb.buzz}</span>
        </div>
        <div className={styles.podiumMeta}>
          <TrendBadge trend={celeb.trend} prevRank={celeb.prevRank} rank={celeb.rank} variant="small" />
          <span className={styles.podiumStars}>★ {celeb.stars}</span>
        </div>
      </div>
    </div>
  );
}

// ── Rank 4+ row cards ─────────────────────────────────────────────────────────
function RankCard({ celeb, onPress }) {
  return (
    <div className={styles.rankCard} onClick={() => onPress(celeb)}>
      {/* Rank number */}
      <div className={styles.rankNumCol}>
        <span className={styles.rankNumText}>{celeb.rank}</span>
        <TrendBadge trend={celeb.trend} prevRank={celeb.prevRank} rank={celeb.rank} variant="small" />
      </div>

      {/* Avatar — initials only, no ghost emoji */}
      <div className={styles.rankAvatar} style={{ background: celeb.bg }}>
        <span className={styles.rankAvatarInitials}>{celeb.initials}</span>
      </div>

      {/* Name + role + buzz */}
      <div className={styles.rankInfo}>
        <div className={styles.rankName}>{celeb.name}</div>
        <div className={styles.rankRole}>{celeb.role}</div>
        <div className={styles.rankBuzzRow}>
          <div className={styles.rankBuzzTrack}>
            <div className={styles.rankBuzzFill} style={{ width: `${celeb.buzz}%` }} />
          </div>
          <span className={styles.rankBuzzNum}>{celeb.buzz}</span>
        </div>
      </div>

      {/* Stars right-aligned */}
      <span className={styles.rankStars}>★ {celeb.stars}</span>
    </div>
  );
}

// ── Celebrity detail bottom-sheet ─────────────────────────────────────────────
function CelebDetail({ celeb, onClose }) {
  if (!celeb) return null;

  const rankLabel = MEDAL[celeb.rank] ? `${MEDAL[celeb.rank]} #${celeb.rank}` : `#${celeb.rank}`;

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>

        {/* ── Gradient hero with drag pill overlaid ── */}
        <div className={styles.sheetHero} style={{ background: celeb.bg }}>
          {/* Pill ON the gradient */}
          <div className={styles.sheetPill} />

          {/* Scrim */}
          <div className={styles.sheetHeroScrim} />

          {/* Top controls */}
          <div className={styles.sheetHeroTop}>
            <button className={styles.sheetCloseBtn} onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className={styles.sheetRankBadge}>{rankLabel}</span>
            <TrendBadge trend={celeb.trend} prevRank={celeb.prevRank} rank={celeb.rank} />
          </div>

          {/* Large emoji */}
          <div className={styles.sheetHeroEmoji} aria-hidden="true">{celeb.emoji}</div>

          {/* Name at bottom */}
          <div className={styles.sheetHeroBottom}>
            <div className={styles.sheetHeroName}>{celeb.name}</div>
            <div className={styles.sheetHeroRole}>{celeb.role}</div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.sheetBody}>

          {/* 3 equal-height stat tiles */}
          <div className={styles.sheetStats}>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#EBF0FF,#DDD6FE)' }}>
              <BuzzArc
                value={celeb.buzz}
                uid={`sheet-${celeb.id}`}
                size={56} stroke={5}
                textColor="#0C1024"
                trackColor="#E6EAF4"
              />
              <span className={styles.sheetStatLbl}>Buzz Score</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFFBEB,#FDE68A)' }}>
              <span className={styles.sheetStatVal}>★ {celeb.stars}</span>
              <span className={styles.sheetStatLbl}>Fan Rating</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
              <span className={styles.sheetStatVal}>{celeb.followers}</span>
              <span className={styles.sheetStatLbl}>Followers</span>
            </div>
          </div>

          {/* About */}
          <div className={styles.sheetSection}>
            <div className={styles.sheetSectionRow}>
              <span className={styles.sheetSectionLabel}>About</span>
            </div>
            <p className={styles.bio}>{celeb.bio}</p>
          </div>

          {/* Recent News */}
          <div className={styles.sheetSection}>
            <div className={styles.sheetSectionRow}>
              <span className={styles.sheetSectionLabel}>Recent News</span>
              <span className={styles.sheetSeeAll}>See all ›</span>
            </div>
            {celeb.recentNews.map((n) => (
              <div key={n.id} className={styles.newsCard}>
                <div className={styles.newsCardMeta}>
                  <span className={styles.newsCardCat}>{n.category}</span>
                  <span className={styles.newsCardTime}>{n.time}</span>
                </div>
                <div className={styles.newsCardTitle}>{n.title}</div>
              </div>
            ))}
          </div>

          {/* Forum Discussions */}
          <div className={styles.sheetSection}>
            <div className={styles.sheetSectionRow}>
              <span className={styles.sheetSectionLabel}>Forum Discussions</span>
              <span className={styles.sheetSeeAll}>See all ›</span>
            </div>
            {celeb.forumThreads.map((t) => (
              <div key={t.id} className={styles.threadCard}>
                <div className={styles.threadCardBody}>
                  <div className={styles.threadCardTitle}>{t.title}</div>
                  <div className={styles.threadReplies}>
                    <span className={styles.threadDot} />
                    {t.replies.toLocaleString()} replies
                  </div>
                </div>
                <span className={styles.threadArrow}>›</span>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <button className={styles.ctaBtn} style={{ background: celeb.bg }}>
            <span className={styles.ctaBtnScrim} />
            <span className={styles.ctaBtnText}>🔖 Follow {celeb.name.split(' ')[0]}</span>
          </button>

          <div className={styles.sheetSpacer} />
        </div>
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CelebritiesScreen() {
  const [activeCat,    setActiveCat]    = useState('bollywood');
  const [selectedCeleb, setSelectedCeleb] = useState(null);

  const celebs   = CELEBS.filter((c) => c.category === activeCat);
  const topThree = celebs.slice(0, 3);
  const rest     = celebs.slice(3);

  return (
    <div className={styles.screen}>

      {/* ── Category segmented control ── */}
      <div className={styles.catRow}>
        <div className={styles.catSegment}>
          {CELEB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCat === cat.id ? styles.catBtnActive : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              <span>{CAT_ICON[cat.id]}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
        {/* Week context strip */}
        <div className={styles.weekStrip}>
          <span className={styles.weekDot} />
          <span className={styles.weekText}>This Week · {WEEK_LABEL}</span>
        </div>
      </div>

      {/* ── Top 3 Podium ── */}
      <div className={styles.podiumSection}>
        {topThree[0] && (
          <TopOneCard celeb={topThree[0]} onPress={setSelectedCeleb} />
        )}
        {topThree.length > 1 && (
          <div className={styles.podiumRow}>
            {topThree.slice(1).map((c) => (
              <PodiumCard key={c.id} celeb={c} onPress={setSelectedCeleb} />
            ))}
          </div>
        )}
      </div>

      {/* ── Rank 4+ ── */}
      {rest.length > 0 && (
        <div className={styles.rankSection}>
          <SectionHeader title="More Rankings" linkLabel={null} />
          {rest.map((c) => (
            <RankCard key={c.id} celeb={c} onPress={setSelectedCeleb} />
          ))}
        </div>
      )}

      <div className={styles.spacer} />

      {/* ── Detail sheet ── */}
      {selectedCeleb && (
        <CelebDetail celeb={selectedCeleb} onClose={() => setSelectedCeleb(null)} />
      )}
    </div>
  );
}
