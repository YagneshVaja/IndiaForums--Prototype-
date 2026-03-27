import { useRef, useState, useCallback } from 'react';
import styles from './FeaturedCarousel.module.css';
import FeaturedCard from '../cards/FeaturedCard';
import CarouselDots from '../ui/CarouselDots';
import { FEATURED } from '../../data/featured';

const CARD_WIDTH = 292; // 280px card + 12px gap

export default function FeaturedCarousel() {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = true;
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        const i = Math.max(0, Math.min(FEATURED.length - 1, Math.round(el.scrollLeft / CARD_WIDTH)));
        setActiveIndex(i);
      }
      rafRef.current = false;
    });
  }, []);

  const handleDotClick = useCallback((i) => {
    scrollRef.current?.scrollTo({ left: i * CARD_WIDTH, behavior: 'smooth' });
    setActiveIndex(i);
  }, []);

  return (
    <div className={styles.section}>
      <div className={styles.scroll} ref={scrollRef} onScroll={handleScroll}>
        <div className={styles.track}>
          {FEATURED.map((item) => (
            <FeaturedCard key={item.id} {...item} />
          ))}
        </div>
      </div>
      <CarouselDots count={FEATURED.length} activeIndex={activeIndex} onDotClick={handleDotClick} />
    </div>
  );
}
