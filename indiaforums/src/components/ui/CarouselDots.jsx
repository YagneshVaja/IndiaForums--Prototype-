import styles from './CarouselDots.module.css';

export default function CarouselDots({ count, activeIndex, onDotClick }) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`${styles.dot} ${i === activeIndex ? styles.active : styles.inactive}`}
          onClick={() => onDotClick(i)}
        />
      ))}
    </div>
  );
}
