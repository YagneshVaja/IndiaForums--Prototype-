import { useQuizPlayers } from '../../hooks/useQuizzes';
import styles from './QuizzesScreen.module.css';

// Confirmed API fields: totalScore, totalRank, realName, userName, privacy
// privacy === 1 → display as "Anonymous"

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function QuizLeaderboard({ quizId, totalQuestions }) {
  const { players, loading, error } = useQuizPlayers(quizId);

  if (loading) {
    return (
      <div className={styles.sheetSection}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={styles.leaderRow}>
            <div className={styles.skeletonRank} />
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonInfo}>
              <div className={styles.skeletonLine} />
              <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || players.length === 0) {
    return (
      <div className={styles.sheetSection}>
        <p className={styles.emptyText}>
          {error ? 'Leaderboard temporarily unavailable.' : 'No players yet. Be the first!'}
        </p>
      </div>
    );
  }

  // Sort by rank ascending (API may not guarantee order)
  const sorted = [...players].sort((a, b) => a.rank - b.rank);

  return (
    <div className={styles.sheetSection}>
      <div className={styles.sheetSectionRow}>
        <span className={styles.sheetSectionLabel}>Top Players</span>
        <span className={styles.sheetStatLbl}>{players.length} {players.length === 1 ? 'player' : 'players'}</span>
      </div>
      {sorted.map((entry) => (
        <div key={entry.id} className={styles.leaderRow}>
          <span className={styles.leaderRank}>
            {MEDAL[entry.rank] || `#${entry.rank}`}
          </span>
          <div className={styles.leaderAvatar} style={{ background: entry.avatarBg }}>
            <span className={styles.leaderInitials}>{entry.initials}</span>
          </div>
          <div className={styles.leaderInfo}>
            <div className={styles.leaderName}>{entry.name}</div>
            <div className={styles.leaderScore}>
              Score: {entry.score}{totalQuestions ? ` / ${totalQuestions}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
