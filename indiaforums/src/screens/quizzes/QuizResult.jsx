import { useMemo } from 'react';
import styles from './QuizzesScreen.module.css';

function ResultArc({ pct }) {
  const size = 72, stroke = 6;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2, cy = size / 2;
  const full = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const fillLen = (pct / 100) * arcLen;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.2)" strokeWidth={stroke}
        strokeDasharray={`${arcLen} ${full}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#rg)" strokeWidth={stroke}
        strokeDasharray={`${fillLen} ${full}`} strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`} />
      <text x={cx} y={cy + 5} textAnchor="middle"
        fontSize={size * 0.2} fontWeight="800" fill="#fff"
        fontFamily="Roboto Condensed, sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

/**
 * QuizResult — rendered inside QuizPlayer's sheet once the quiz ends.
 *
 * Props:
 *   localScore    — correct answers counted locally (trivia only)
 *   total         — total question count
 *   isPersonality — true when quiz has no single correct answer (personality type)
 *   results       — array of { resultId, title, description, lowerRange, upperRange }
 *                   from the quiz detail API (empty [] when not present)
 *   quizBg        — CSS gradient string for hero background
 *   onClose       — callback when user taps "Done"
 */
export default function QuizResult({ localScore, personalityScore = 0, total, isPersonality, results = [], quizBg, onClose }) {
  const pct   = isPersonality
    ? 100
    : (total > 0 ? Math.round((localScore / total) * 100) : 0);
  const wrong = isPersonality ? 0 : (total - localScore);

  // For personality/range-based quizzes use personalityScore (sum of option points,
  // or answer count when all points = 0). For trivia use localScore (correct count).
  const scoreForMatch = isPersonality ? personalityScore : localScore;

  // Find the result range that matches the user's score
  const matchedResult = useMemo(() => {
    if (!results.length) return null;
    return results.find(r => scoreForMatch >= r.lowerRange && scoreForMatch <= r.upperRange) || null;
  }, [results, scoreForMatch]);

  const label = matchedResult
    ? matchedResult.title
    : isPersonality
      ? 'Quiz Complete!'
      : (pct >= 70 ? 'Brilliant!' : pct >= 40 ? 'Good Try!' : 'Keep Practising!');

  const emoji = isPersonality
    ? '🎉'
    : (pct >= 70 ? '🏆' : pct >= 40 ? '👏' : '😅');

  return (
    <>
      <div className={styles.resultHero} style={{ background: quizBg }}>
        <div className={styles.sheetPill} />
        <div className={styles.sheetHeroScrim} />
        <div className={styles.resultEmoji}>{emoji}</div>
        <div className={styles.resultLabel}>{label}</div>
        {!isPersonality && (
          <div className={styles.resultScore}>{localScore} / {total}</div>
        )}
        {/* Show description for matched results (range-based quizzes) */}
        {matchedResult?.description && (
          <div className={styles.resultMatchCard}>
            <div className={styles.resultMatchDesc}>{matchedResult.description}</div>
          </div>
        )}
      </div>

      <div className={styles.sheetBody}>
        {isPersonality || matchedResult ? (
          // Personality / range-based quiz — show completion stats
          <div className={styles.sheetStats}>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
              <span className={styles.sheetStatVal}>✓ {total}</span>
              <span className={styles.sheetStatLbl}>Answered</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFFBEB,#FDE68A)' }}>
              <span className={styles.sheetStatVal}>🎯 Done</span>
              <span className={styles.sheetStatLbl}>Completed</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
              <span className={styles.sheetStatVal}>🏅 You!</span>
              <span className={styles.sheetStatLbl}>Your Result</span>
            </div>
          </div>
        ) : (
          // Trivia quiz — show score breakdown
          <div className={styles.sheetStats}>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
              <ResultArc pct={pct} />
              <span className={styles.sheetStatLbl}>Score</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
              <span className={styles.sheetStatVal}>{localScore}</span>
              <span className={styles.sheetStatLbl}>Correct</span>
            </div>
            <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF1F2,#FECDD3)' }}>
              <span className={styles.sheetStatVal}>{wrong}</span>
              <span className={styles.sheetStatLbl}>Wrong</span>
            </div>
          </div>
        )}

        <button className={styles.ctaBtn} style={{ background: quizBg }} onClick={onClose}>
          <span className={styles.ctaBtnScrim} />
          <span className={styles.ctaBtnText}>✓ Done · Back to Quizzes</span>
        </button>
        <div className={styles.sheetSpacer} />
      </div>
    </>
  );
}
