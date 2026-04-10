import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useSubmitQuiz } from '../../hooks/useQuizzes';
import QuizResult from './QuizResult';
import styles from './QuizzesScreen.module.css';

/**
 * QuizPlayer — full-screen overlay quiz experience.
 *
 * Quiz types (from API):
 *   - Trivia  (q.isTrivia = true):  one correct answer; show correct/wrong feedback + optional reveal.
 *   - Personality (q.isTrivia = false): no correct answer; auto-advance after brief highlight.
 *
 * Navigation: Next button shown in sticky footer after answering. No back navigation.
 *
 * Submit payload: { answers: [{ questionId, optionId }] }
 * ⚠️ Submit endpoint has a backend SQL bug (FinalResultForUser column missing).
 *    QuizResult falls back to local score on failure.
 */
export default function QuizPlayer({ quiz, onClose }) {
  const [current,      setCurrent]      = useState(0);
  // answeredMap: { [questionIndex]: { idx, correct, optionId, questionId, points } }
  const [answeredMap,  setAnsweredMap]  = useState({});
  const [finished,     setFinished]     = useState(false);
  const [showReveal,   setShowReveal]   = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(quiz?.countdownTimer || 0);

  // Ref always holds the latest answeredMap — avoids stale closure in setTimeout callbacks
  const answeredMapRef = useRef({});
  // Ref tracks latest current — guards against stale auto-advance after goPrev
  const currentRef = useRef(0);
  currentRef.current = current;
  // Ref for goNext — always points to latest version, safe to call from timer interval
  const goNextRef = useRef(null);

  const { submit } = useSubmitQuiz();

  const questions = quiz?.quiz_questions || [];
  const total     = questions.length;
  const q         = questions[current];

  // Derived from map — no separate selected state needed
  const selected   = answeredMap[current]?.idx ?? null;
  const isAnswered = selected !== null;

  const answeredList     = useMemo(() => Object.values(answeredMap), [answeredMap]);
  const triviaScore      = answeredList.filter(a => a.correct).length;
  const pointsTotal      = answeredList.reduce((sum, a) => sum + (a.points || 0), 0);
  const personalityScore = pointsTotal > 0 ? pointsTotal : answeredList.length;

  function handleOption(idx) {
    if (isAnswered) return;   // already answered — block re-tap

    const isCorrect = q.isTrivia ? idx === q.correct : false;
    const optionId  = q.optionIds?.[idx] ?? null;
    const points    = q.points?.[idx]   ?? 0;
    const answer    = { idx, correct: isCorrect, optionId, questionId: q.questionId, points };

    // Update both ref (latest) and state (re-render)
    const newMap = { ...answeredMapRef.current, [current]: answer };
    answeredMapRef.current = newMap;
    setAnsweredMap(newMap);

    if (!q.isTrivia) {
      // Personality: briefly highlight selection then auto-advance.
      // Guard: only advance if user hasn't navigated away during the delay.
      const answeredAt = current;
      setTimeout(() => { if (currentRef.current === answeredAt) goNext(); }, 700);
      return;
    }

    // Trivia: show reveal panel if reveal content exists
    if (q.revealTitle || q.revealDescription || q.revealImageUrl) {
      setTimeout(() => setShowReveal(true), 450);
    }
  }

  function goNext() {
    setShowReveal(false);
    if (current + 1 >= total) {
      setFinished(true);
      submit(
        quiz.id,
        Object.values(answeredMapRef.current).map(a => ({ questionId: a.questionId, optionId: a.optionId }))
      );
    } else {
      setCurrent(c => c + 1);
    }
  }
  // Keep ref current so the timer interval always calls the latest goNext
  goNextRef.current = goNext;

  const timerDuration = quiz?.countdownTimer || 0;

  // Countdown timer — resets on each new question, stops when answered
  useEffect(() => {
    if (!timerDuration || isAnswered) return;
    setTimeLeft(timerDuration);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          goNextRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [current, timerDuration, isAnswered]);

  if (finished) {
    return (
      <div className={styles.detailScreen}>
        <QuizResult
          localScore={triviaScore}
          personalityScore={personalityScore}
          total={total}
          isPersonality={!questions[0]?.isTrivia}
          results={quiz.results || []}
          quizBg={quiz.bg}
          onClose={onClose}
        />
      </div>
    );
  }

  if (!q) return null;

  const showNext = isAnswered;

  return (
    <div className={styles.detailScreen}>

      {/* Smooth progress bar */}
      <div className={styles.quizProgressBar}>
        <div
          className={styles.quizProgressFill}
          style={{ width: `${((current + (isAnswered ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      {/* Coloured header with question */}
      <div className={styles.quizHeader} style={{ background: quiz.bg }}>
        <div className={styles.sheetHeroScrim} />
        <div className={styles.quizHeaderTop}>
          <button className={styles.sheetCloseBtn} onClick={onClose} aria-label="Exit quiz">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <span className={styles.quizCounter}>{current + 1} / {total}</span>
          {timerDuration > 0 && !isAnswered ? (
            <div className={styles.quizTimer}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke={timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#fbbf24'}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - timeLeft / timerDuration)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                  style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
                />
              </svg>
              <span className={styles.quizTimerText}
                style={{ color: timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#fff' }}>
                {timeLeft}s
              </span>
            </div>
          ) : q.isTrivia ? (
            <span className={styles.quizScorePill}>★ {triviaScore}</span>
          ) : null}
        </div>
        <div className={styles.quizQuestion}>{q.question}</div>
        {/* Animated feedback badge — trivia only */}
        {isAnswered && q.isTrivia && (
          <div className={`${styles.quizFeedbackBadge} ${
            selected === q.correct ? styles.quizFeedbackCorrect : styles.quizFeedbackWrong
          }`}>
            {selected === q.correct ? '✓ Correct!' : '✗ Wrong'}
          </div>
        )}
      </div>

      {/* Options — keyed by current so they animate in on each new question */}
      <div key={current} className={styles.quizBody}>

        {/* Question image (GIF / photo) — shown when the API provides one */}
        {q.questionImageUrl && (
          <div className={styles.questionImgWrap}>
            <img
              src={q.questionImageUrl}
              className={styles.questionImg}
              alt=""
              aria-hidden="true"
            />
            {q.questionImageCredit && (
              <span className={styles.questionImgCredit}>{q.questionImageCredit}</span>
            )}
          </div>
        )}

        {q.options.map((opt, idx) => {
          let cls        = styles.optionBtn;
          let letterCls  = styles.optionLetter;
          let filledCard = false;

          if (isAnswered && q.isTrivia) {
            if (idx === q.correct) {
              cls       = `${styles.optionBtn} ${styles.optionCorrect}`;
              letterCls = `${styles.optionLetter} ${styles.optionLetterCorrect}`;
              filledCard = true;
            } else if (idx === selected) {
              cls       = `${styles.optionBtn} ${styles.optionWrong}`;
              letterCls = `${styles.optionLetter} ${styles.optionLetterWrong}`;
              filledCard = true;
            } else {
              cls = `${styles.optionBtn} ${styles.optionDimmed}`;
            }
          } else if (isAnswered && !q.isTrivia) {
            if (idx === selected) {
              cls = `${styles.optionBtn} ${styles.optionSelected}`;
              filledCard = true;
            } else {
              cls = `${styles.optionBtn} ${styles.optionDimmed}`;
            }
          }

          return (
            <button
              key={idx}
              className={cls}
              onClick={() => handleOption(idx)}
              disabled={isAnswered}
            >
              <span className={letterCls}>{String.fromCharCode(65 + idx)}</span>
              <span
                className={styles.optionText}
                style={filledCard ? { color: '#fff' } : undefined}
              >{opt}</span>
              {q.isTrivia && isAnswered && idx === q.correct && (
                <span className={styles.optionTick}>✓</span>
              )}
              {q.isTrivia && isAnswered && idx === selected && idx !== q.correct && (
                <span className={styles.optionCross}>✗</span>
              )}
            </button>
          );
        })}

        {/* Reveal panel — shown after answering trivia when reveal content exists */}
        {showReveal && (q.revealTitle || q.revealDescription || q.revealImageUrl) && (
          <div className={styles.revealPanel}>
            {q.revealImageUrl && (
              <img src={q.revealImageUrl} className={styles.revealImg} alt="" aria-hidden="true" loading="lazy" decoding="async" />
            )}
            {q.revealTitle && (
              <div className={styles.revealTitle}>{q.revealTitle}</div>
            )}
            {q.revealDescription && (
              <p className={styles.revealDesc}>{q.revealDescription}</p>
            )}
          </div>
        )}
      </div>

      {/* Sticky footer — Next button shown after answering */}
      {showNext && (
        <div className={styles.detailFooter}>
          <button className={styles.nextBtn} onClick={goNext}>
            {current + 1 < total ? 'Next Question →' : 'See Results →'}
          </button>
        </div>
      )}

    </div>
  );
}
