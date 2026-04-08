import styles from './QuizzesScreen.module.css';

// ScoreArc is defined in QuizzesScreen — pass the rendered element as a prop
// to avoid a circular dependency. Alternatively, inline a simpler arc here.

function ResultArc({ pct }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const full = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const fillLen = (pct / 100) * arcLen;
  const rotate = 135;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="rgba(255,255,255,0.2)" strokeWidth={stroke}
        strokeDasharray={`${arcLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#rg)" strokeWidth={stroke}
        strokeDasharray={`${fillLen} ${full}`} strokeLinecap="round"
        transform={`rotate(${rotate} ${cx} ${cy})`} />
      <defs>
        <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <text x={cx} y={cy + 5} textAnchor="middle"
        fontSize={size * 0.2} fontWeight="800" fill="#fff"
        fontFamily="Roboto Condensed, sans-serif">
        {pct}%
      </text>
    </svg>
  );
}

/**
 * QuizResult — rendered inside QuizPlayer's sheet overlay once the quiz ends.
 *
 * Props:
 *   localScore   — number of correct answers counted locally
 *   total        — total number of questions
 *   serverResult — response from POST /response: { score, totalQuestions, rank } (may be null)
 *   quizBg       — CSS gradient string for the result hero background
 *   onClose      — callback when user taps "Done"
 */
export default function QuizResult({ localScore, total, serverResult, quizBg, onClose }) {
  const finalScore = serverResult?.score ?? localScore;
  const finalTotal = serverResult?.totalQuestions ?? total;
  const rank       = serverResult?.rank ?? null;
  const pct        = finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0;
  const wrong      = finalTotal - finalScore;

  const label = pct >= 70 ? 'Brilliant!' : pct >= 40 ? 'Good Try!' : 'Keep Practising!';
  const emoji = pct >= 70 ? '🏆'          : pct >= 40 ? '👏'         : '😅';

  return (
    <>
      <div className={styles.resultHero} style={{ background: quizBg }}>
        <div className={styles.sheetPill} />
        <div className={styles.sheetHeroScrim} />
        <div className={styles.resultEmoji}>{emoji}</div>
        <div className={styles.resultLabel}>{label}</div>
        <div className={styles.resultScore}>{finalScore} / {finalTotal}</div>
        {rank && <div className={styles.resultRank}>Rank #{rank}</div>}
      </div>

      <div className={styles.sheetBody}>
        <div className={styles.sheetStats}>
          <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
            <ResultArc pct={pct} />
            <span className={styles.sheetStatLbl}>Score</span>
          </div>
          <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' }}>
            <span className={styles.sheetStatVal}>{finalScore}</span>
            <span className={styles.sheetStatLbl}>Correct</span>
          </div>
          <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF1F2,#FECDD3)' }}>
            <span className={styles.sheetStatVal}>{wrong}</span>
            <span className={styles.sheetStatLbl}>Wrong</span>
          </div>
        </div>

        <button className={styles.ctaBtn} style={{ background: quizBg }} onClick={onClose}>
          <span className={styles.ctaBtnScrim} />
          <span className={styles.ctaBtnText}>✓ Done · Back to Quizzes</span>
        </button>
        <div className={styles.sheetSpacer} />
      </div>
    </>
  );
}
