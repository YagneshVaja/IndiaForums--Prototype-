import { useState } from 'react';
import { useSubmitQuiz } from '../../hooks/useQuizzes';
import QuizResult from './QuizResult';
import styles from './QuizzesScreen.module.css';

/**
 * QuizPlayer — full-screen overlay quiz experience.
 *
 * Props:
 *   quiz     — full quiz object from useQuizDetails (includes quiz_questions)
 *   onClose  — callback when user dismisses (after result or mid-quiz)
 */
export default function QuizPlayer({ quiz, onClose }) {
  const [current,      setCurrent]      = useState(0);
  const [selected,     setSelected]     = useState(null);  // index of currently selected option
  const [answers,      setAnswers]      = useState([]);    // boolean[] — correct/wrong per question
  const [selectedIdxs, setSelectedIdxs] = useState([]);   // number[] — selected indices for submit
  const [finished,     setFinished]     = useState(false);

  const { submit, result } = useSubmitQuiz();

  const questions = quiz?.quiz_questions || [];
  const total     = questions.length;
  const q         = questions[current];
  const score     = answers.filter(Boolean).length;

  function handleOption(idx) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function handleNext() {
    const correct  = selected === q.correct;
    const nextAnswers  = [...answers, correct];
    const nextIdxs     = [...selectedIdxs, selected ?? -1];
    setAnswers(nextAnswers);
    setSelectedIdxs(nextIdxs);

    if (current + 1 >= total) {
      setFinished(true);
      // Submit to API — non-blocking, result shown even if this fails
      const payload = questions.map((question, i) => ({
        questionId:          question.questionId,
        selectedOptionIndex: nextIdxs[i] ?? -1,
      }));
      submit(quiz.id, payload);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  }

  if (finished) {
    return (
      <div className={styles.sheetOverlay} onClick={onClose}>
        <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <QuizResult
            localScore={answers.filter(Boolean).length}
            total={total}
            serverResult={result}
            quizBg={quiz.bg}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className={styles.sheetOverlay}>
      <div className={styles.sheet}>
        {/* Progress bar */}
        <div className={styles.quizProgressBar}>
          <div
            className={styles.quizProgressFill}
            style={{ width: `${(current / total) * 100}%` }}
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
            <span className={styles.quizScorePill}>★ {score}</span>
          </div>
          <div className={styles.quizQuestion}>{q.question}</div>
        </div>

        {/* Options */}
        <div className={styles.quizBody}>
          {q.options.map((opt, idx) => {
            let cls = styles.optionBtn;
            if (selected !== null) {
              if (idx === q.correct)   cls = `${styles.optionBtn} ${styles.optionCorrect}`;
              else if (idx === selected) cls = `${styles.optionBtn} ${styles.optionWrong}`;
            }
            return (
              <button key={idx} className={cls} onClick={() => handleOption(idx)}>
                <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                <span className={styles.optionText}>{opt}</span>
                {selected !== null && idx === q.correct   && <span className={styles.optionTick}>✓</span>}
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
