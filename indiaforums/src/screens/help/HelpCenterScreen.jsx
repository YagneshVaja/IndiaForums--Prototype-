import { useState, useEffect, useMemo, useCallback } from 'react';
import * as helpCenterApi from '../../services/helpCenterApi';
import { timeAgo, extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './HelpCenterScreen.module.css';

/**
 * Help Center — browses categories + questions from /helpcenter/home.
 *
 * Note: /helpcenter/questions is backend-broken (Class D-3). We rely
 * entirely on /helpcenter/home, which already returns all questions grouped
 * by category. /helpcenter/question/{id} works for detail view.
 */
export default function HelpCenterScreen({ onBack }) {
  const [home, setHome]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await helpCenterApi.getHelpCenterHome({ pageSize: 20 });
      setHome(res.data || {});
    } catch (err) {
      setError(extractApiError(err, 'Failed to load help center'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => home?.categories || [], [home]);
  const allQuestions = useMemo(() => home?.questionsByCategory || [], [home]);

  // Set the first category as active once data loads
  useEffect(() => {
    if (!activeCategoryId && categories.length) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  const questionsForActive = useMemo(
    () => allQuestions.filter((q) => q.categoryId === activeCategoryId),
    [allQuestions, activeCategoryId],
  );

  if (selectedQuestionId) {
    return (
      <QuestionDetailView
        questionId={selectedQuestionId}
        onBack={() => setSelectedQuestionId(null)}
      />
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <div className={styles.title}>Help Center</div>
      </div>

      {loading ? (
        <div className={styles.body}><LoadingState variant="card" count={4} /></div>
      ) : error ? (
        <div className={styles.body}><ErrorState message={error} onRetry={load} /></div>
      ) : (
        <>
          {/* Category tabs */}
          <div className={styles.categoryRow}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.categoryChip} ${activeCategoryId === cat.id ? styles.categoryChipActive : ''}`}
                onClick={() => setActiveCategoryId(cat.id)}
                title={cat.description || cat.name}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Questions list */}
          <div className={styles.body}>
            {questionsForActive.length === 0 ? (
              <EmptyState message="No questions in this category" />
            ) : (
              <div className={styles.questionsList}>
                {questionsForActive.map((q) => (
                  <div
                    key={q.questionId}
                    className={styles.questionRow}
                    onClick={() => setSelectedQuestionId(q.questionId)}
                  >
                    <span className={styles.questionBullet}>❓</span>
                    <span className={styles.questionText}>{q.question}</span>
                    <span className={styles.questionArrow}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Question detail view ─────────────────────────────────────────────── */
function QuestionDetailView({ questionId, onBack }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await helpCenterApi.getHelpCenterQuestionDetail(questionId);
      setData(res.data || {});
    } catch (err) {
      setError(extractApiError(err, 'Failed to load question'));
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => { load(); }, [load]);

  const details = data?.questionDetails || {};
  const answers = data?.answers || data?.questionAnswers || [];
  const related = data?.relatedQuestions || [];

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <div className={styles.title}>Question</div>
      </div>

      {loading ? (
        <div className={styles.body}><LoadingState variant="card" count={2} /></div>
      ) : error ? (
        <div className={styles.body}><ErrorState message={error} onRetry={load} /></div>
      ) : (
        <div className={styles.body}>
          <div className={styles.questionCard}>
            {details.name && <div className={styles.categoryBadge}>{details.name}</div>}
            <div className={styles.questionTitle}>{details.question}</div>
            <div className={styles.questionMeta}>
              {details.questionCreator && <span>Asked by {details.questionCreator}</span>}
              {details.createdWhen && <span> · {timeAgo(details.createdWhen)}</span>}
            </div>
          </div>

          {answers.length === 0 ? (
            <EmptyState message="No answers yet" />
          ) : (
            <div className={styles.answersList}>
              <div className={styles.sectionLabel}>
                {answers.length} Answer{answers.length === 1 ? '' : 's'}
              </div>
              {answers.map((a, i) => (
                <div key={a.answerId || i} className={styles.answerCard}>
                  <div
                    className={styles.answerBody}
                    dangerouslySetInnerHTML={{ __html: a.answer || a.text || a.body || '' }}
                  />
                  <div className={styles.answerMeta}>
                    {a.answerCreator && <span>{a.answerCreator}</span>}
                    {a.createdWhen && <span> · {timeAgo(a.createdWhen)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <div className={styles.relatedWrap}>
              <div className={styles.sectionLabel}>Related questions</div>
              {related.map((r, i) => (
                <div key={r.questionId || i} className={styles.relatedRow}>
                  {r.question}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
