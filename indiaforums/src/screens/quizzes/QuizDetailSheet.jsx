import { useState } from 'react';
import { useQuizDetails } from '../../hooks/useQuizzes';
import QuizLeaderboard from './QuizLeaderboard';
import ErrorState from '../../components/ui/ErrorState';
import styles from './QuizzesScreen.module.css';

function ScoreArc({ value, total, uid, size = 56, stroke = 5, textColor = '#7C2D12', trackColor = '#FDDCB5' }) {
  const r      = (size - stroke * 2) / 2;
  const cx     = size / 2;
  const cy     = size / 2;
  const full   = 2 * Math.PI * r;
  const arcLen = full * 0.75;
  const pct    = total > 0 ? value / total : 0;
  const fillLen = pct * arcLen;
  const rotate  = 135;
  const gradId  = `sa-${uid}`;
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

function DiffBadge({ level }) {
  const map = { easy: styles.diffEasy, medium: styles.diffMedium, hard: styles.diffHard };
  const label = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  return <span className={`${styles.diff} ${map[level] || map.medium}`}>{label[level] || 'Medium'}</span>;
}

const TABS = ['about', 'leaderboard', 'comments'];

/**
 * QuizDetailSheet — bottom-sheet detail for a quiz.
 *
 * Props:
 *   quizId   — ID to fetch from /quizzes/{quizId}/details
 *   onClose  — dismiss the sheet
 *   onStart  — called with the full quiz object when user taps "Start Quiz"
 */
export default function QuizDetailSheet({ quizId, onClose, onStart }) {
  const [activeTab, setActiveTab] = useState('about');
  const { quiz, loading, error, refetch } = useQuizDetails(quizId);

  return (
    <div className={styles.sheetOverlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>

        {/* Hero — shows skeleton gradient while loading */}
        <div
          className={styles.sheetHero}
          style={{ background: quiz?.bg || 'linear-gradient(135deg,#374151,#6b7280)' }}
        >
          <div className={styles.sheetPill} />
          <div className={styles.sheetHeroScrim} />

          <div className={styles.sheetHeroTop}>
            <button className={styles.sheetCloseBtn} onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {quiz && (
              <>
                <span className={styles.sheetRankBadge}>{quiz.categoryLabel}</span>
                <DiffBadge level={quiz.difficulty} />
              </>
            )}
          </div>

          {quiz && (
            <div className={styles.sheetHeroEmoji} aria-hidden="true">{quiz.emoji}</div>
          )}

          <div className={styles.sheetHeroBottom}>
            {loading && !quiz ? (
              <>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonSubtitle} />
              </>
            ) : (
              <>
                <div className={styles.sheetHeroTitle}>{quiz?.title}</div>
                <div className={styles.sheetHeroSub}>by {quiz?.author}</div>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className={styles.sheetBody}>
          {error && !quiz ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading && !quiz ? (
            <div className={styles.sheetLoadingBody}>
              {[1, 2, 3].map(i => <div key={i} className={styles.skeletonBlock} />)}
            </div>
          ) : quiz ? (
            <>
              {/* 3 stat tiles */}
              <div className={styles.sheetStats}>
                <div className={styles.sheetStatTile} style={{ background: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' }}>
                  <ScoreArc value={quiz.avg_score} total={quiz.questions} uid={`ds-${quizId}`} />
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
                {TABS.map((t) => {
                  if (t === 'comments' && quiz.comments.length === 0) return null;
                  return (
                    <button
                      key={t}
                      className={`${styles.tabBtn} ${activeTab === t ? styles.tabActive : ''}`}
                      onClick={() => setActiveTab(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  );
                })}
              </div>

              {/* Tab: About */}
              {activeTab === 'about' && (
                <>
                  {quiz.description ? (
                    <div className={styles.sheetSection}>
                      <div className={styles.sheetSectionRow}>
                        <span className={styles.sheetSectionLabel}>About this Quiz</span>
                      </div>
                      <p className={styles.bio}>{quiz.description}</p>
                    </div>
                  ) : null}

                  <div className={styles.infoPills}>
                    {quiz.time_limit > 0 && (
                      <div className={styles.infoPill}>
                        <span className={styles.infoPillIcon}>⏱</span>
                        <span className={styles.infoPillText}>{quiz.time_limit} mins</span>
                      </div>
                    )}
                    {quiz.questions > 0 && (
                      <div className={styles.infoPill}>
                        <span className={styles.infoPillIcon}>❓</span>
                        <span className={styles.infoPillText}>{quiz.questions} Questions</span>
                      </div>
                    )}
                    {quiz.points > 0 && (
                      <div className={styles.infoPill}>
                        <span className={styles.infoPillIcon}>🏆</span>
                        <span className={styles.infoPillText}>{quiz.points} Points</span>
                      </div>
                    )}
                    {quiz.categoryLabel && (
                      <div className={styles.infoPill}>
                        <span className={styles.infoPillIcon}>📡</span>
                        <span className={styles.infoPillText}>{quiz.categoryLabel}</span>
                      </div>
                    )}
                  </div>

                  {quiz.tags.length > 0 && (
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
                  )}
                </>
              )}

              {/* Tab: Leaderboard */}
              {activeTab === 'leaderboard' && (
                <QuizLeaderboard quizId={quizId} totalQuestions={quiz.questions} />
              )}

              {/* Tab: Comments */}
              {activeTab === 'comments' && quiz.comments.length > 0 && (
                <div className={styles.sheetSection}>
                  <div className={styles.sheetSectionRow}>
                    <span className={styles.sheetSectionLabel}>Fan Comments</span>
                  </div>
                  {quiz.comments.map((c, i) => (
                    <div key={c.id || i} className={styles.commentCard}>
                      <div className={styles.commentTop}>
                        <div className={styles.commentAvatar}
                          style={{ background: c.avatarBg || 'linear-gradient(135deg,#7c3aed,#c084fc)' }}>
                          <span className={styles.commentInitials}>{c.initials || c.name?.[0] || 'U'}</span>
                        </div>
                        <div className={styles.commentMeta}>
                          <span className={styles.commentName}>{c.name || c.displayName}</span>
                          <span className={styles.commentTime}>{c.time || c.createdAt || ''}</span>
                        </div>
                        {c.likes != null && (
                          <span className={styles.commentLike}>♥ {c.likes}</span>
                        )}
                      </div>
                      <p className={styles.commentText}>{c.text || c.content || c.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA */}
              {quiz.quiz_questions?.length > 0 && (
                <button
                  className={styles.ctaBtn}
                  style={{ background: quiz.bg }}
                  onClick={() => onStart(quiz)}
                >
                  <span className={styles.ctaBtnScrim} />
                  <span className={styles.ctaBtnText}>
                    ▶ Start Quiz · {quiz.quiz_questions.length} Questions
                  </span>
                </button>
              )}
              <div className={styles.sheetSpacer} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
