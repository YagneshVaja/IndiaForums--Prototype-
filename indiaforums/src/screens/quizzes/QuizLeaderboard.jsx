import { useQuizPlayers } from '../../hooks/useQuizzes';
import styles from './QuizzesScreen.module.css';

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

  return (
    <div className={styles.sheetSection}>
      <div className={styles.sheetSectionRow}>
        <span className={styles.sheetSectionLabel}>Top Players</span>
        <span className={styles.sheetStatLbl}>{players.length} players</span>
      </div>
      {players.map((entry, i) => (
        <div key={entry.id} className={styles.leaderRow}>
          <span className={styles.leaderRank}>
            {i < 3 ? MEDAL[i + 1] : `#${i + 1}`}
          </span>
          <div className={styles.leaderAvatar} style={{ background: entry.avatarBg }}>
            <span className={styles.leaderInitials}>{entry.initials}</span>
          </div>
          <div className={styles.leaderInfo}>
            <div className={styles.leaderName}>{entry.name}</div>
            <div className={styles.leaderScore}>
              {entry.score}{totalQuestions ? `/${totalQuestions}` : ''} correct
            </div>
          </div>
          {entry.time ? <span className={styles.leaderTime}>{entry.time}</span> : null}
        </div>
      ))}
    </div>
  );
}
