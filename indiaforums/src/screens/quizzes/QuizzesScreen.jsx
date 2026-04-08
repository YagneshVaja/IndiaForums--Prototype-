import { useState } from 'react';
import { useQuizzes, useQuizCreators } from '../../hooks/useQuizzes';
import QuizDetailSheet from './QuizDetailSheet';
import QuizPlayer from './QuizPlayer';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/ui/LoadingState';
import styles from './QuizzesScreen.module.css';

// ── Category tabs (hardcoded; API has no /quizzes/categories endpoint)
// "All" is the default — shows every quiz from the API regardless of category.
const QUIZ_CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'bollywood', label: 'Bollywood' },
  { id: 'tv',        label: 'TV Shows' },
  { id: 'reality',   label: 'Reality' },
  { id: 'general',   label: 'General' },
];

const CAT_ICON = { bollywood: '🎬', tv: '📺', reality: '🎤', general: '🌟', all: '🔥' };
const MEDAL    = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ── Difficulty badge ────────────────────────────────────────────────────────
function DiffBadge({ level, variant = 'default' }) {
  const cls = variant === 'small' ? styles.diffSmall : styles.diff;
  const map   = { easy: styles.diffEasy, medium: styles.diffMedium, hard: styles.diffHard };
  const label = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  return <span className={`${cls} ${map[level] || map.medium}`}>{label[level] || 'Medium'}</span>;
}

// ── Score arc (SVG) ─────────────────────────────────────────────────────────
function ScoreArc({ value, total, uid, size = 60, stroke = 5, textColor = '#fff', trackColor = 'rgba(255,255,255,0.2)' }) {
  const r      = (size - stroke * 2) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const full   = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const pct    = total > 0 ? value / total : 0;
  const fillLen = pct * arcLen;
  const rotate  = 135;
  const gradId  = `arc-${uid}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={trackColor} strokeWidth={stroke}
        strokeDasharray={`${arcLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#${gradId})`} strokeWidth={stroke}
        strokeDasharray={`${fillLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fontSize={size * 0.22} fontWeight="800" fill={textColor}
        fontFamily="Roboto Condensed, sans-serif">
        {value}/{total}
      </text>
    </svg>
  );
}

// ── #1 Featured quiz hero card ───────────────────────────────────────────────
function TopQuizCard({ quiz, onPress }) {
  return (
    <div className={styles.topQuizCard} style={{ background: quiz.bg }} onClick={() => onPress(quiz)}>
      <div className={styles.topQuizScrim} />
      <div className={styles.topQuizTopRow}>
        <div className={styles.topQuizBadgeWrap}>
          <span className={styles.topQuizFeaturedBadge}>🔥 Most Played</span>
        </div>
        <DiffBadge level={quiz.difficulty} />
      </div>
      <div className={styles.topQuizSpacer} />
      <div className={styles.topQuizEmojiWrap} aria-hidden="true">{quiz.emoji}</div>
      <div className={styles.topQuizBottomRow}>
        <div className={styles.topQuizLeft}>
          <div className={styles.topQuizTitle}>{quiz.title}</div>
          <div className={styles.topQuizMeta}>
            ❓ <span>{quiz.questions} Qs</span>
            &nbsp;·&nbsp;
            👥 <span>{quiz.plays} plays</span>
          </div>
          <div className={styles.topQuizRating}>
            ★ <span>{quiz.rating}</span>
            &nbsp;·&nbsp;
            <span className={styles.topQuizCategory}>{quiz.categoryLabel}</span>
          </div>
        </div>
        <div className={styles.topQuizRight}>
          <button
            className={styles.topPlayBtn}
            onClick={(e) => { e.stopPropagation(); onPress(quiz); }}
          >
            ▶ Play
          </button>
        </div>
      </div>
    </div>
  );
}

// ── #2 & #3 Podium cards ────────────────────────────────────────────────────
function PodiumQuizCard({ quiz, rank, onPress }) {
  const borderVar = rank === 2 ? styles.podiumSilver : styles.podiumBronze;
  return (
    <div className={`${styles.podiumCard} ${borderVar}`} onClick={() => onPress(quiz)}>
      <div className={styles.podiumThumb} style={{ background: quiz.bg }}>
        <div className={styles.podiumThumbScrim} />
        <span className={styles.podiumRankBadge}>{MEDAL[rank]} #{rank}</span>
        <div className={styles.podiumEmoji} aria-hidden="true">{quiz.emoji}</div>
      </div>
      <div className={styles.podiumInfo}>
        <div className={styles.podiumTitle}>{quiz.title}</div>
        <div className={styles.podiumProgressRow}>
          <div className={styles.podiumProgressBar}>
            <div
              className={styles.podiumProgressFill}
              style={{ width: `${Math.min((quiz.plays_raw / 50000) * 100, 100)}%` }}
            />
          </div>
          <span className={styles.podiumPlaysNum}>{quiz.plays}</span>
        </div>
        <div className={styles.podiumMeta}>
          <DiffBadge level={quiz.difficulty} variant="small" />
          <span className={styles.podiumQuestions}>❓ {quiz.questions}Q</span>
        </div>
      </div>
    </div>
  );
}

// ── Rank 4+ row cards ────────────────────────────────────────────────────────
function RankQuizCard({ quiz, rank, onPress }) {
  return (
    <div className={styles.rankCard} onClick={() => onPress(quiz)}>
      <div className={styles.rankNumCol}>
        <span className={styles.rankNumText}>{rank}</span>
      </div>
      <div className={styles.rankAvatar} style={{ background: quiz.bg }}>
        <span className={styles.rankAvatarEmoji}>{quiz.emoji}</span>
      </div>
      <div className={styles.rankInfo}>
        <div className={styles.rankTitle}>{quiz.title}</div>
        <div className={styles.rankCategory}>{quiz.categoryLabel}</div>
        <div className={styles.rankBuzzRow}>
          <div className={styles.rankBuzzTrack}>
            <div
              className={styles.rankBuzzFill}
              style={{ width: `${Math.min((quiz.plays_raw / 50000) * 100, 100)}%` }}
            />
          </div>
          <span className={styles.rankBuzzNum}>{quiz.plays}</span>
        </div>
      </div>
      <div className={styles.rankRight}>
        <DiffBadge level={quiz.difficulty} variant="small" />
        <span className={styles.rankQCount}>❓{quiz.questions}Q</span>
      </div>
    </div>
  );
}

// ── Creators strip ───────────────────────────────────────────────────────────
function CreatorsStrip({ creators }) {
  if (!creators.length) return null;
  return (
    <div className={styles.creatorsSection}>
      <div className={styles.creatorsHeader}>
        <span className={styles.rankLabel}>Top Creators</span>
      </div>
      <div className={styles.creatorsRow}>
        {creators.map((c) => (
          <div key={c.id} className={styles.creatorItem}>
            <div className={styles.creatorAvatar} style={{ background: c.avatarBg }}>
              {c.thumbnail
                ? <img src={c.thumbnail} alt={c.name} className={styles.creatorAvatarImg} />
                : <span className={styles.creatorInitials}>{c.initials}</span>
              }
            </div>
            <span className={styles.creatorName} title={c.name}>
              {c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name}
            </span>
            {c.quizCount > 0 && (
              <span className={styles.creatorQuizCount}>{c.quizCount} quizzes</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const [activeCat,    setActiveCat]    = useState('all');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [activeQuiz,   setActiveQuiz]   = useState(null);

  const { quizzes, loading, error, params, setParams, refresh } = useQuizzes({ category: activeCat });
  const { creators } = useQuizCreators();

  const topThree = quizzes.slice(0, 3);
  const rest     = quizzes.slice(3);

  function handleCatChange(catId) {
    setActiveCat(catId);
    setParams(p => ({ ...p, category: catId }));
  }

  function handleQuizPress(quiz) {
    setSelectedQuizId(quiz.id);
  }

  function handleStart(quiz) {
    setSelectedQuizId(null);
    setActiveQuiz(quiz);
  }

  return (
    <div className={styles.screen}>

      {/* Category segmented control */}
      <div className={styles.catRow}>
        <div className={styles.catSegment}>
          {QUIZ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catBtn} ${activeCat === cat.id ? styles.catBtnActive : ''}`}
              onClick={() => handleCatChange(cat.id)}
            >
              <span>{CAT_ICON[cat.id]}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && quizzes.length === 0 && (
        <div style={{ padding: '14px' }}>
          <LoadingState variant="card" count={4} />
        </div>
      )}

      {/* Error */}
      {error && quizzes.length === 0 && (
        <div style={{ padding: '14px' }}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      {/* Top creators strip */}
      {creators.length > 0 && <CreatorsStrip creators={creators} />}

      {/* Podium section (top 3) */}
      {topThree.length > 0 && (
        <div className={styles.podiumSection}>
          <TopQuizCard quiz={topThree[0]} onPress={handleQuizPress} />
          {topThree.length > 1 && (
            <div className={styles.podiumRow}>
              {topThree.slice(1).map((q, i) => (
                <PodiumQuizCard key={q.id} quiz={q} rank={i + 2} onPress={handleQuizPress} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rank 4+ */}
      {rest.length > 0 && (
        <div className={styles.rankSection}>
          <div className={styles.rankLabel}>More Quizzes</div>
          {rest.map((q, i) => (
            <RankQuizCard key={q.id} quiz={q} rank={i + 4} onPress={handleQuizPress} />
          ))}
        </div>
      )}

      <div className={styles.spacer} />

      {/* Detail sheet */}
      {selectedQuizId && !activeQuiz && (
        <QuizDetailSheet
          quizId={selectedQuizId}
          onClose={() => setSelectedQuizId(null)}
          onStart={handleStart}
        />
      )}

      {/* Active quiz player */}
      {activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
        />
      )}
    </div>
  );
}
