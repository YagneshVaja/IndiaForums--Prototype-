import { useState, useMemo } from 'react';
import { useQuizzes, useQuizCreators } from '../../hooks/useQuizzes';
import QuizDetailSheet from './QuizDetailSheet';
import QuizPlayer from './QuizPlayer';
import ErrorState from '../../components/ui/ErrorState';
import styles from './QuizzesScreen.module.css';

// ── Horizontal quiz card — matches live site layout ───────────────────────────
// Left: square thumbnail  |  Right: category badge, title, creator, stats
function QuizListCard({ quiz, onPress }) {
  return (
    <div className={styles.quizListCard} onClick={onPress}>
      <div className={styles.quizListThumb} style={{ background: quiz.bg }}>
        {quiz.thumbnail
          ? <img src={quiz.thumbnail} className={styles.quizListThumbImg} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          : <span className={styles.quizListThumbEmoji}>{quiz.emoji}</span>
        }
      </div>
      <div className={styles.quizListInfo}>
        <div className={styles.quizListTopRow}>
          {quiz.categoryLabel && (
            <span className={styles.quizListCatBadge}>{quiz.categoryLabel}</span>
          )}
          <span className={styles.quizListTypeBadge}>{quiz.quizTypeName}</span>
        </div>
        <div className={styles.quizListTitle}>{quiz.title}</div>
        <div className={styles.quizListByline}>
          {quiz.author && quiz.author !== 'IndiaForums' ? `by ${quiz.author}` : 'Team IndiaForums'}
        </div>
        <div className={styles.quizListStats}>
          <span>❓ {quiz.questions} questions</span>
          <span className={styles.quizListStatDot}>·</span>
          <span>👥 {quiz.plays} plays</span>
        </div>
      </div>
    </div>
  );
}

// Skeleton card for loading state
function QuizListCardSkeleton() {
  return (
    <div className={styles.quizListCard} style={{ pointerEvents: 'none' }}>
      <div className={styles.quizListThumbSkeleton} />
      <div className={styles.quizListInfo}>
        <div className={styles.skeletonLine} style={{ width: 72, height: 14, marginBottom: 6 }} />
        <div className={styles.skeletonLine} style={{ width: '100%', height: 14, marginBottom: 4 }} />
        <div className={styles.skeletonLine} style={{ width: '80%', height: 14, marginBottom: 8 }} />
        <div className={styles.skeletonLine} style={{ width: '55%', height: 12 }} />
      </div>
    </div>
  );
}

// ── Top creators strip — equivalent to live site's "Top Players" sidebar ──────
function CreatorsStrip({ creators }) {
  if (!creators.length) return null;
  return (
    <div className={styles.creatorsSection}>
      <div className={styles.creatorsHeader}>
        <span className={styles.creatorsLabel}>🏆 Top Creators</span>
      </div>
      <div className={styles.creatorsRow}>
        {creators.map((c) => (
          <div key={c.id} className={styles.creatorItem}>
            <div className={styles.creatorAvatar} style={{ background: c.avatarBg }}>
              {c.thumbnail
                ? <img src={c.thumbnail} alt={c.name} className={styles.creatorAvatarImg} loading="lazy" decoding="async" />
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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function QuizzesScreen() {
  const [activeCatId,    setActiveCatId]    = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [activeQuiz,     setActiveQuiz]     = useState(null);

  const { allQuizzes, categories, loading, error, refresh, loadMore, pagination } = useQuizzes();
  const { creators } = useQuizCreators();

  // Category chips: "All" prepended, only categories with quizzes
  const catTabs = useMemo(() => [
    { categoryId: null, categoryName: 'All' },
    ...categories.filter(c => c.quizCount > 0),
  ], [categories]);

  // Client-side filter by active category
  const visibleQuizzes = activeCatId
    ? allQuizzes.filter(q => q.categoryId === activeCatId)
    : allQuizzes;

  // Count for the active filter chip
  const activeCount = visibleQuizzes.length;

  function handleStart(quiz) {
    setSelectedQuizId(null);
    setActiveQuiz(quiz);
  }

  return (
    <div className={styles.screenHost}>
      <div className={styles.screen}>

        {/* ── Category filter chips ── */}
        {catTabs.length > 1 && (
          <div className={styles.catWrap}>
            <div className={styles.catRow}>
              <div className={styles.catChips}>
                {catTabs.map(cat => (
                  <button
                    key={cat.categoryId ?? 'all'}
                    className={`${styles.catChip} ${activeCatId === cat.categoryId ? styles.catChipActive : ''}`}
                    onClick={() => setActiveCatId(cat.categoryId)}
                  >
                    {cat.categoryName}
                    {cat.quizCount > 0 && (
                      <span className={styles.catChipCount}> {cat.quizCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Top creators strip (only on "All" tab) ── */}
        {!activeCatId && creators.length > 0 && (
          <CreatorsStrip creators={creators} />
        )}

        {/* ── Result count header ── */}
        {!loading && visibleQuizzes.length > 0 && (
          <div className={styles.quizListHeader}>
            <span className={styles.quizListHeaderText}>
              {activeCatId
                ? `${activeCount} quiz${activeCount !== 1 ? 'zes' : ''} in this category`
                : `${activeCount} quizzes`}
            </span>
          </div>
        )}

        {/* ── Loading skeletons ── */}
        {loading && allQuizzes.length === 0 && (
          [1, 2, 3, 4, 5].map(i => <QuizListCardSkeleton key={i} />)
        )}

        {/* ── Error ── */}
        {error && allQuizzes.length === 0 && (
          <div style={{ padding: '14px' }}>
            <ErrorState message={error} onRetry={refresh} />
          </div>
        )}

        {/* ── Quiz list ── */}
        {visibleQuizzes.map(q => (
          <QuizListCard
            key={q.id}
            quiz={q}
            onPress={() => setSelectedQuizId(q.id)}
          />
        ))}

        {/* ── Load more (server pagination, only on "All" tab) ── */}
        {!activeCatId && pagination?.hasNextPage && !loading && (
          <button className={styles.loadMoreBtn} onClick={loadMore}>
            Load More Quizzes
          </button>
        )}

        {/* Loading spinner for load-more */}
        {loading && allQuizzes.length > 0 && (
          <div className={styles.loadingMore}>
            <span className={styles.loadingMoreDot} />
            <span className={styles.loadingMoreDot} />
            <span className={styles.loadingMoreDot} />
          </div>
        )}

        <div className={styles.spacer} />
      </div>

      {/* Overlays — rendered outside .screen so they cover the full viewport */}
      {selectedQuizId && !activeQuiz && (
        <QuizDetailSheet
          quizId={selectedQuizId}
          onClose={() => setSelectedQuizId(null)}
          onStart={handleStart}
        />
      )}

      {activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
        />
      )}
    </div>
  );
}
