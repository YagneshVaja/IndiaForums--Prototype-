import { useState, useRef } from 'react';
import styles from './OnboardingScreen.module.css';

const SLIDES = [
  {
    id: '1',
    emoji: '🎬',
    accentColor: '#3558F0',
    accentLight: '#EBF0FF',
    title: "India's Biggest\nFan Community",
    description: 'Join millions of fans discussing your favourite celebrities, shows, and movies.',
  },
  {
    id: '2',
    emoji: '💬',
    accentColor: '#E03A5C',
    accentLight: '#FFF1F3',
    title: 'Forums &\nFan Fiction',
    description: 'Dive into passionate discussions and read fan-written stories from across India.',
  },
  {
    id: '3',
    emoji: '📰',
    accentColor: '#1A7A48',
    accentLight: '#E8F5EE',
    title: 'Breaking News,\nEvery Hour',
    description: 'Stay up to date with the latest entertainment news, gossip, and trending stories.',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);
  const isLast = activeIndex === SLIDES.length - 1;

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setActiveIndex(i => i + 1);
    }
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (dx < -40 && activeIndex < SLIDES.length - 1) setActiveIndex(i => i + 1);
    else if (dx > 40 && activeIndex > 0) setActiveIndex(i => i - 1);
  }

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isLast && (
        <button className={styles.skipBtn} onClick={onComplete}>Skip</button>
      )}

      <div className={styles.track}>
        <div
          className={styles.slides}
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {SLIDES.map((slide) => (
            <div key={slide.id} className={styles.slide}>
              <div
                className={styles.emojiBox}
                style={{
                  background: slide.accentLight,
                  boxShadow: `0 8px 32px ${slide.accentColor}28`,
                }}
              >
                <span className={styles.emoji}>{slide.emoji}</span>
              </div>
              <p
                className={styles.slideTitle}
                style={{ color: slide.accentColor }}
              >
                {slide.title}
              </p>
              <p className={styles.slideDesc}>{slide.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              className={styles.dot}
              data-active={i === activeIndex ? '' : undefined}
              onClick={() => setActiveIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        <button className={styles.nextBtn} onClick={handleNext}>
          {isLast ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
