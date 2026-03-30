import { useState } from 'react';
import styles from './QuizzesScreen.module.css';
import { QUIZZES, QUIZ_CATEGORIES, WEEK_LABEL } from '../data/quizzes';

/* ── Back icon ───────────────────────────────────────────────────────────────── */
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Difficulty badge ────────────────────────────────────────────────────────── */
function DiffBadge({ level, variant = 'default' }) {
  const cls = variant === 'small' ? styles.diffSmall : styles.diff;
  const map = {
    easy:   styles.diffEasy,
    medium: styles.diffMedium,
    hard:   styles.diffHard,
  };
  const label = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  return <span className={`${cls} ${map[level] || map.medium}`}>{label[level] || 'Medium'}</span>;
}

/* ── Score arc (SVG) — mirrors BuzzArc from Celebrities ─────────────────────── */
function ScoreArc({ value, total, uid, size = 60, stroke = 5, textColor = '#fff', trackColor = 'rgba(255,255,255,0.2)' }) {
  const r      = (size - stroke * 2) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const full   = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const pct    = total > 0 ? value / total : 0;
  const fillLen = pct * arcLen;
  const rotate  = 135;
  const gradId  = `score-grad-${uid}`;
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

const MEDAL    = { 1: '🥇', 2: '🥈', 3: '🥉' };
const CAT_ICON = { tv: '📺', bollywood: '🎬', reality: '🎤', general: '🌟' };

/* ── #1 Featured Quiz Hero Card ──────────────────────────────────────────────── */
function TopQuizCard({ quiz, onPress }) {
  return (
    <div className={styles.topQuizCard} style={{ background: quiz.bg }} onClick={() => onPress(quiz)}>
      <div className={styles.topQuizScrim} />

      {/* Top row */}
      <div className={styles.topQuizTopRow}>
        <div className={styles.topQuizBadgeWrap}>
          <span className={styles.topQuizFeaturedBadge}>🔥 Most Played</span>
        </div>
        <DiffBadge level={quiz.difficulty} />
      </div>

      <div className={styles.topQuizSpacer} />

      {/* Big emoji — decorative */}
      <div className={styles.topQuizEmojiWrap} aria-hidden="true">{quiz.emoji}</div>

      {/* Bottom */}
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

/* ── #2 & #3 Podium Quiz Cards ───────────────────────────────────────────────── */
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
              style={{ width: `${(quiz.plays_raw / 50000) * 100}%` }}
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

/* ── Rank 4+ Quiz Row Cards ──────────────────────────────────────────────────── */
function RankQuizCard({ quiz, rank, onPress }) {
  return (
    <div className={styles.rankCard} onClick={() => onPress(quiz)}>
      {/* Rank number */}
      <div className={styles.rankNumCol}>
        <span className={styles.rankNumText}>{rank}</span>
      </div>

      {/* Icon avatar */}
      <div className={styles.rankAvatar} style={{ background: quiz.bg }}>
        <span className={styles.rankAvatarEmoji}>{quiz.emoji}</span>
      </div>

      {/* Info */}
      <div className={styles.rankInfo}>
        <div className={styles.rankTitle}>{quiz.title}</div>
        <div className={styles.rankCategory}>{quiz.categoryLabel}</div>
        <div className={styles.rankBuzzRow}>
          <div className={styles.rankBuzzTrack}>
            <div
              className={styles.rankBuzzFill}
              style={{ width: `${(quiz.plays_raw / 50000) * 100}%` }}
            />
          </div>
          <span className={styles.rankBuzzNum}>{quiz.plays}</span>
        </div>
      </div>

      {/* Difficulty + questions */}
      <div className={styles.rankRight}>
        <DiffBadge level={quiz.difficulty} variant="small" />
        <span className={styles.rankQCount}>❓{quiz.questions}Q</span>
      </div>
    </div>
  );
}

/* ── Quiz Detail Bottom Sheet ────────────────────────────────────────────────── */
function QuizDetail({ quiz, onClose, onStart }) {
  const [activeTab, setActiveTab] = useState('about');
  if (!quiz) return null;

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>

        {/* Hero */}
        <div className={styles.sheetHero} style={{ background: quiz.bg }}>
          <div className={styles.sheetPill} />
          <div className={styles.sheetHeroScrim} />

          <div className={styles.sheetHeroTop}>
            <button className={styles.sheetCloseBtn} onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className={styles.sheetRankBadge}>{quiz.categoryLabel}</span>
            <DiffBadge level={quiz.difficulty} />
          </div>

          <div className={styles.sheetHeroEmoji} aria-hidden="true">{quiz.emoji}</div>

          <div className={styles.sheetHeroBottom}>
            <div className={styles.sheetHeroTitle}>{quiz.title}</div>
            <div className={styles.sheetHeroSub}>by {quiz.author}</div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className={styles.sheetBody}>

          {/* 3 stat tiles — mirrors celebrities stat row */}
          <div className={styles.sheetStats}>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
              <ScoreArc
                value={quiz.avg_score}
                total={quiz.questions}
                uid={`sheet-${quiz.id}`}
                size={56} stroke={5}
                textColor="#7C2D12"
                trackColor="#FDDCB5"
              />
              <span className={styles.sheetStatLbl}>Avg Score</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
              <span className={styles.sheetStatVal}>👥 {quiz.plays}</span>
              <span className={styles.sheetStatLbl}>Total Plays</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFFBEB,#FDE68A)' }}>
              <span className={styles.sheetStatVal}>★ {quiz.rating}</span>
              <span className={styles.sheetStatLbl}>Fan Rating</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className={styles.tabRow}>
            {['about', 'leaderboard', 'comments'].map((t) => (
              <button
                key={t}
                className={`${styles.tabBtn} ${activeTab === t ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab: About */}
          {activeTab === 'about' && (
            <>
              <div className={styles.sheetSection}>
                <div className={styles.sheetSectionRow}>
                  <span className={styles.sheetSectionLabel}>About this Quiz</span>
                </div>
                <p className={styles.bio}>{quiz.description}</p>
              </div>

              {/* Quick info pills */}
              <div className={styles.infoPills}>
                <div className={styles.infoPill}>
                  <span className={styles.infoPillIcon}>⏱</span>
                  <span className={styles.infoPillText}>{quiz.time_limit} mins</span>
                </div>
                <div className={styles.infoPill}>
                  <span className={styles.infoPillIcon}>❓</span>
                  <span className={styles.infoPillText}>{quiz.questions} Questions</span>
                </div>
                <div className={styles.infoPill}>
                  <span className={styles.infoPillIcon}>🏆</span>
                  <span className={styles.infoPillText}>{quiz.points} Points</span>
                </div>
                <div className={styles.infoPill}>
                  <span className={styles.infoPillIcon}>📡</span>
                  <span className={styles.infoPillText}>{quiz.categoryLabel}</span>
                </div>
              </div>

              {/* Tags */}
              <div className={styles.sheetSection}>
                <div className={styles.sheetSectionRow}>
                  <span className={styles.sheetSectionLabel}>Tags</span>
                </div>
                <div className={styles.tagsRow}>
                  {quiz.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tab: Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionRow}>
                <span className={styles.sheetSectionLabel}>Top Players</span>
                <span className={styles.sheetSeeAll}>See all ›</span>
              </div>
              {quiz.leaderboard.map((entry, i) => (
                <div key={entry.id} className={styles.leaderRow}>
                  <span className={styles.leaderRank}>
                    {i < 3 ? MEDAL[i + 1] : `#${i + 1}`}
                  </span>
                  <div className={styles.leaderAvatar}
                    style={{ background: entry.avatarBg }}>
                    <span className={styles.leaderInitials}>{entry.initials}</span>
                  </div>
                  <div className={styles.leaderInfo}>
                    <div className={styles.leaderName}>{entry.name}</div>
                    <div className={styles.leaderScore}>{entry.score}/{quiz.questions} correct</div>
                  </div>
                  <span className={styles.leaderTime}>{entry.time}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Comments */}
          {activeTab === 'comments' && (
            <div className={styles.sheetSection}>
              <div className={styles.sheetSectionRow}>
                <span className={styles.sheetSectionLabel}>Fan Comments</span>
                <span className={styles.sheetSeeAll}>See all ›</span>
              </div>
              {quiz.comments.map((c) => (
                <div key={c.id} className={styles.commentCard}>
                  <div className={styles.commentTop}>
                    <div className={styles.commentAvatar} style={{ background: c.avatarBg }}>
                      <span className={styles.commentInitials}>{c.initials}</span>
                    </div>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentName}>{c.name}</span>
                      <span className={styles.commentTime}>{c.time}</span>
                    </div>
                    <span className={styles.commentLike}>♥ {c.likes}</span>
                  </div>
                  <p className={styles.commentText}>{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            className={styles.ctaBtn}
            style={{ background: quiz.bg }}
            onClick={() => onStart(quiz)}
          >
            <span className={styles.ctaBtnScrim} />
            <span className={styles.ctaBtnText}>▶ Start Quiz · {quiz.questions} Questions</span>
          </button>

          <div className={styles.sheetSpacer} />
        </div>
      </div>
    </div>
  );
}

/* ── Quiz Active Player ───────────────────────────────────────────────────────── */
function QuizPlayer({ quiz, onClose }) {
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers]   = useState([]);
  const [finished, setFinished] = useState(false);

  const q      = quiz.quiz_questions[current];
  const score  = answers.filter(Boolean).length;
  const total  = quiz.quiz_questions.length;

  function handleOption(idx) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function handleNext() {
    const correct = selected === q.correct;
    const next    = [...answers, correct];
    setAnswers(next);
    if (current + 1 >= total) {
      setFinished(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  }

  if (finished) {
    const finalScore = answers.filter(Boolean).length;
    const pct = Math.round((finalScore / total) * 100);
    return (
      <div className={styles.sheetOverlay} onClick={onClose}>
        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div className={styles.resultHero} style={{ background: quiz.bg }}>
            <div className={styles.sheetPill} />
            <div className={styles.sheetHeroScrim} />
            <div className={styles.resultEmoji}>{pct >= 70 ? '🏆' : pct >= 40 ? '👏' : '😅'}</div>
            <div className={styles.resultLabel}>{pct >= 70 ? 'Brilliant!' : pct >= 40 ? 'Good Try!' : 'Keep Practising!'}</div>
            <div className={styles.resultScore}>{finalScore} / {total}</div>
          </div>
          <div className={styles.sheetBody}>
            <div className={styles.sheetStats}>
              <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
                <span className={styles.sheetStatVal}>{pct}%</span>
                <span className={styles.sheetStatLbl}>Score</span>
              </div>
              <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
                <span className={styles.sheetStatVal}>{finalScore}</span>
                <span className={styles.sheetStatLbl}>Correct</span>
              </div>
              <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF1F2,#FECDD3)' }}>
                <span className={styles.sheetStatVal}>{total - finalScore}</span>
                <span className={styles.sheetStatLbl}>Wrong</span>
              </div>
            </div>
            <button className={styles.ctaBtn} style={{ background: quiz.bg }} onClick={onClose}>
              <span className={styles.ctaBtnScrim} />
              <span className={styles.ctaBtnText}>✓ Done · Back to Quizzes</span>
            </button>
            <div className={styles.sheetSpacer} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sheetOverlay}>
      <div className={styles.sheet}>
        {/* Progress bar */}
        <div className={styles.quizProgressBar}>
          <div
            className={styles.quizProgressFill}
            style={{ width: `${((current) / total) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className={styles.quizHeader} style={{ background: quiz.bg }}>
          <div className={styles.sheetHeroScrim} />
          <div className={styles.quizHeaderTop}>
            <button className={styles.sheetCloseBtn} onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className={styles.quizCounter}>{current + 1} / {total}</span>
            <span className={styles.quizScorePill}>★ {score}</span>
          </div>
          <div className={styles.quizQuestion}>{q.question}</div>
        </div>

        {/* Options */}
        <div className={styles.quizBody}>
          {q.options.map((opt, idx) => {
            let cls = styles.optionBtn;
            if (selected !== null) {
              if (idx === q.correct) cls = `${styles.optionBtn} ${styles.optionCorrect}`;
              else if (idx === selected) cls = `${styles.optionBtn} ${styles.optionWrong}`;
            }
            return (
              <button key={idx} className={cls} onClick={() => handleOption(idx)}>
                <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                <span className={styles.optionText}>{opt}</span>
                {selected !== null && idx === q.correct && <span className={styles.optionTick}>✓</span>}
                {selected !== null && idx === selected && idx !== q.correct && <span className={styles.optionCross}>✗</span>}
              </button>
            );
          })}

          {selected !== null && (
            <button className={styles.nextBtn} onClick={handleNext}>
              {current + 1 < total ? 'Next Question →' : 'See Results →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────────── */
export default function QuizzesScreen({ onBack }) {
  const [activeCat,    setActiveCat]    = useState('bollywood');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [activeQuiz,   setActiveQuiz]   = useState(null);

  const quizzes  = QUIZZES.filter((q) => q.category === activeCat);
  const topThree = quizzes.slice(0, 3);
  const rest     = quizzes.slice(3);

  function handleStart(quiz) {
    setSelectedQuiz(null);
    setActiveQuiz(quiz);
  }

  return (
    <div className={styles.screen}>

      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Go back">
          <BackIcon />
        </button>
        <span className={styles.headerTitle}>Fan Quizzes</span>
        <div className={styles.headerSpacer} />
      </div>

      {/* Category segmented control */}
      <div className={styles.catRow}>
        <div className={styles.catSegment}>
          {QUIZ_CATEGORIES.map((cat) => (
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
        <div className={styles.weekStrip}>
          <span className={styles.weekDot} />
          <span className={styles.weekText}>This Week · {WEEK_LABEL}</span>
        </div>
      </div>

      {/* Top 3 */}
      <div className={styles.podiumSection}>
        {topThree[0] && (
          <TopQuizCard quiz={topThree[0]} onPress={setSelectedQuiz} />
        )}
        {topThree.length > 1 && (
          <div className={styles.podiumRow}>
            {topThree.slice(1).map((q, i) => (
              <PodiumQuizCard key={q.id} quiz={q} rank={i + 2} onPress={setSelectedQuiz} />
            ))}
          </div>
        )}
      </div>

      {/* Rank 4+ */}
      {rest.length > 0 && (
        <div className={styles.rankSection}>
          <div className={styles.rankLabel}>More Quizzes</div>
          {rest.map((q, i) => (
            <RankQuizCard key={q.id} quiz={q} rank={i + 4} onPress={setSelectedQuiz} />
          ))}
        </div>
      )}

      <div className={styles.spacer} />

      {/* Detail sheet */}
      {selectedQuiz && !activeQuiz && (
        <QuizDetail
          quiz={selectedQuiz}
          onClose={() => setSelectedQuiz(null)}
          onStart={handleStart}
        />
      )}

      {/* Active quiz player */}
      {activeQuiz && (
        <QuizPlayer quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />
      )}
    </div>
  );
}
