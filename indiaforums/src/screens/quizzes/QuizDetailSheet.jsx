import { useQuizDetails } from '../../hooks/useQuizzes';
import QuizLeaderboard from './QuizLeaderboard';
import ErrorState from '../../components/ui/ErrorState';
import styles from './QuizzesScreen.module.css';

/**
 * QuizDetailSheet — content-page layout matching IndiaForums live site.
 *
 * Layout (matches live site structure):
 *   Cover image (full-width, back button overlaid)
 *   → Title + byline (below image, not overlaid)
 *   → Stats row (questions · plays · estimated time · views)
 *   → Description
 *   → Top Players leaderboard (always visible)
 *   → Possible results (range-based quizzes)
 *   → Tags
 *   ↓ Sticky footer: Start Quiz button
 */
export default function QuizDetailSheet({ quizId, onClose, onStart }) {
  const { quiz, loading, error, refetch } = useQuizDetails(quizId);
  const canPlay = quiz?.quiz_questions?.length > 0;

  return (
    <div className={styles.detailScreen}>

      {/* ── Cover image ── */}
      <div
        className={styles.detailCover}
        style={{ background: quiz?.bg || 'linear-gradient(135deg,#374151,#6b7280)' }}
      >
        {quiz?.thumbnail && (
          <img src={quiz.thumbnail} className={styles.detailCoverImg} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        )}
        {quiz && !quiz.thumbnail && (
          <span className={styles.detailCoverEmoji}>{quiz.emoji}</span>
        )}

        {/* Gradient scrim for legibility */}
        <div className={styles.detailCoverScrim} />

        {/* Type badges overlaid on cover */}
        <div className={styles.detailCoverBar}>
          <div className={styles.detailCoverBadges}>
            {quiz?.quizTypeName && (
              <span className={styles.sheetRankBadge}>{quiz.quizTypeName}</span>
            )}
            {quiz?.categoryLabel && (
              <span className={styles.sheetRankBadge}>{quiz.categoryLabel}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className={styles.detailBody}>

        {error && !quiz ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : loading && !quiz ? (
          <div className={styles.detailLoadingBody}>
            <div className={styles.skeletonTitle} style={{ marginBottom: 8 }} />
            <div className={styles.skeletonLine} style={{ width: '60%', marginBottom: 16 }} />
            <div className={styles.skeletonBlock} />
            <div className={styles.skeletonBlock} />
          </div>
        ) : quiz ? (
          <>
            {/* Title + byline */}
            <div className={styles.detailTitleSection}>
              <h1 className={styles.detailTitle}>{quiz.title}</h1>
              <div className={styles.detailByline}>
                <span className={styles.detailAuthor}>
                  {quiz.author && quiz.author !== 'IndiaForums' ? quiz.author : 'Team IndiaForums'}
                </span>
                {quiz.publishedFormatted && (
                  <span className={styles.detailDate}> · {quiz.publishedFormatted}</span>
                )}
              </div>
            </div>

            {/* Stats row — inline dividers between each stat */}
            <div className={styles.detailStatsRow}>
              <div className={styles.detailStatItem}>
                <span className={styles.detailStatVal}>❓ {quiz.questions}</span>
                <span className={styles.detailStatLbl}>Questions</span>
              </div>
              <div className={styles.detailStatDivider} />
              <div className={styles.detailStatItem}>
                <span className={styles.detailStatVal}>👥 {quiz.plays}</span>
                <span className={styles.detailStatLbl}>Plays</span>
              </div>
              {quiz.estimatedTimeLabel && (
                <>
                  <div className={styles.detailStatDivider} />
                  <div className={styles.detailStatItem}>
                    <span className={styles.detailStatVal}>⏱ {quiz.estimatedTimeLabel}</span>
                    <span className={styles.detailStatLbl}>Est. Time</span>
                  </div>
                </>
              )}
              {quiz.views > 0 && (
                <>
                  <div className={styles.detailStatDivider} />
                  <div className={styles.detailStatItem}>
                    <span className={styles.detailStatVal}>👁 {quiz.views.toLocaleString()}</span>
                    <span className={styles.detailStatLbl}>Views</span>
                  </div>
                </>
              )}
              {quiz.directCommentCount > 0 && (
                <>
                  <div className={styles.detailStatDivider} />
                  <div className={styles.detailStatItem}>
                    <span className={styles.detailStatVal}>💬 {quiz.directCommentCount}</span>
                    <span className={styles.detailStatLbl}>Comments</span>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            {quiz.description && (
              <p className={styles.detailDescription}>{quiz.description}</p>
            )}

            {/* Top Players — always visible, matches live site */}
            <div className={styles.detailSection}>
              <QuizLeaderboard quizId={quizId} totalQuestions={quiz.questions} />
            </div>

            {/* Possible results (range-based / personality quizzes) */}
            {quiz.results?.length > 0 && (
              <div className={styles.detailSection}>
                <div className={styles.detailSectionTitle}>Possible Results</div>
                {quiz.results.map((r) => (
                  <div key={r.resultId} className={styles.resultPreviewRow}>
                    <div className={styles.resultPreviewRange}>{r.lowerRange}–{r.upperRange}</div>
                    <div className={styles.resultPreviewInfo}>
                      <div className={styles.resultPreviewTitle}>{r.title}</div>
                      {r.description && (
                        <div className={styles.resultPreviewDesc}>{r.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            {quiz.tags.length > 0 && (
              <div className={styles.detailTagsRow}>
                {quiz.tags.map(tag => (
                  <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
              </div>
            )}

            <div className={styles.sheetSpacer} />
          </>
        ) : null}
      </div>

      {/* ── Sticky footer: Start Quiz CTA ── */}
      {canPlay && (
        <div className={styles.detailFooter}>
          <button
            className={styles.detailStartBtn}
            style={{ background: quiz.bg }}
            onClick={() => onStart(quiz)}
          >
            <span className={styles.detailStartScrim} />
            <span className={styles.detailStartText}>▶ Start Quiz</span>
            <span className={styles.detailStartCount}>{quiz.quiz_questions.length} Questions</span>
          </button>
        </div>
      )}
    </div>
  );
}
