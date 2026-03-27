import { useState } from 'react';
import styles from './QuizSection.module.css';

const OPT_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizSection({ quiz }) {
  const [selected, setSelected] = useState(null);

  function pick(i) {
    if (selected !== null) return;
    setSelected(i);
  }

  const answered = selected !== null;

  function optClass(i) {
    if (!answered) return styles.opt;
    if (i === quiz.answer) return `${styles.opt} ${styles.correct}`;
    if (i === selected)    return `${styles.opt} ${styles.wrong}`;
    return `${styles.opt} ${styles.dim}`;
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.quizIcon}>🎯</span>
          <span className={styles.title}>Quiz Time</span>
          <span className={styles.badge}>{quiz.badge}</span>
        </div>
        <span className={styles.participants}>{quiz.participants} played</span>
      </div>

      <div className={styles.card}>
        <div className={styles.question}>{quiz.question}</div>

        <div className={styles.grid}>
          {quiz.options.map((opt, i) => (
            <button key={i} className={optClass(i)} onClick={() => pick(i)}>
              <span className={styles.optLabel}>{OPT_LABELS[i]}</span>
              <span className={styles.optText}>{opt}</span>
              {answered && i === quiz.answer && (
                <span className={styles.tick}>✓</span>
              )}
              {answered && i === selected && i !== quiz.answer && (
                <span className={styles.cross}>✗</span>
              )}
            </button>
          ))}
        </div>

        {answered && (
          <div className={`${styles.result} ${selected === quiz.answer ? styles.resultCorrect : styles.resultWrong}`}>
            {selected === quiz.answer
              ? '🎉 Correct! You got it right!'
              : `❌ Oops! The correct answer was: ${quiz.options[quiz.answer]}`}
          </div>
        )}
      </div>
    </div>
  );
}
