import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ShortsScreen.module.css';
import useShorts from '../hooks/useShorts';
import { SHORTS_CATEGORIES } from '../data/shorts';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';

/* ── Icons ────────────────────────────────────────────────────────────────────── */
const PauseIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="rgba(0,0,0,0.45)" />
    <rect x="11" y="11" width="5" height="14" rx="2" fill="#fff" />
    <rect x="20" y="11" width="5" height="14" rx="2" fill="#fff" />
  </svg>
);

const PlayIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="18" fill="rgba(0,0,0,0.45)" />
    <path d="M14 11.5l13 6.5-13 6.5V11.5z" fill="#fff" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M5 13l5-5 5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ── Skeleton card ────────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonOverlay}>
        <div className={styles.skeletonBar} />
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonBottom}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonTitleShort} />
          <div className={styles.skeletonDesc} />
          <div className={styles.skeletonBtn} />
        </div>
      </div>
    </div>
  );
}

/* ── Short card ───────────────────────────────────────────────────────────────── */
function ShortCard({ short, isActive, onAdvance, cardRef, index, total, showHint }) {
  const [progress,   setProgress]   = useState(0);
  const [flashIcon,  setFlashIcon]  = useState(null); // 'pause' | 'play' | null
  const intervalRef  = useRef(null);
  const isPausedRef  = useRef(false);
  const elapsedRef   = useRef(0);

  // Auto-advance progress timer — paused when isPausedRef.current is true
  useEffect(() => {
    clearInterval(intervalRef.current);
    isPausedRef.current = false;
    elapsedRef.current  = 0;

    if (!isActive) { setProgress(0); return; }

    setProgress(0);
    const DURATION = 6000;
    const TICK     = 100;

    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      elapsedRef.current += TICK;
      const pct = Math.min((elapsedRef.current / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current);
        onAdvance();
      }
    }, TICK);

    return () => clearInterval(intervalRef.current);
  }, [isActive, onAdvance]);

  // Tap card body → pause / resume
  function handleCardTap(e) {
    if (e.target.closest('button')) return; // let buttons handle their own clicks
    if (!isActive) return;
    isPausedRef.current = !isPausedRef.current;
    setFlashIcon(isPausedRef.current ? 'pause' : 'play');
    setTimeout(() => setFlashIcon(null), 700);
  }

  function handleRead() {
    if (short.pageUrl) window.open(short.pageUrl, '_blank', 'noopener,noreferrer');
  }

  const isYouTube = short.pageUrl?.includes('youtube.com') || short.pageUrl?.includes('youtu.be');

  return (
    <div className={styles.card} ref={cardRef} onClick={handleCardTap}>

      {/* ── Media — blurred bg + sharp foreground (no cropping) ── */}
      {short.thumbnail ? (
        <div className={styles.mediaWrap}>
          <img className={styles.thumbBg} src={short.thumbnail} alt="" aria-hidden="true" loading="lazy" />
          <img className={styles.thumb}   src={short.thumbnail} alt={short.title}        loading="lazy" />
        </div>
      ) : (
        <div className={styles.thumbFallback} style={{ background: short.bg }} />
      )}

      {/* Gradient scrim */}
      <div className={styles.scrim} />

      {/* Progress bar — below the floating catBar */}
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${isActive ? progress : 0}%` }} />
      </div>

      {/* Source credit pill — frosted glass */}
      {short.credits ? (
        <span className={styles.sourcePill}>{short.credits}</span>
      ) : null}

      {/* Tap flash — brief pause/play icon in centre */}
      {flashIcon && (
        <div className={styles.flashWrap}>
          {flashIcon === 'pause' ? <PauseIcon /> : <PlayIcon />}
        </div>
      )}

      {/* ── Bottom overlay ── */}
      <div className={styles.overlay}>

        <div className={styles.title}>{short.title}</div>

        {short.description ? (
          <div className={styles.desc}>{short.description}</div>
        ) : null}

        {/* Meta row: date (left) + position counter (right) */}
        <div className={styles.metaRow}>
          {short.publishedAt ? (
            <span className={styles.date}>{short.publishedAt}</span>
          ) : <span />}
          {total > 0 && (
            <span className={styles.counter}>{index + 1} / {total}</span>
          )}
        </div>

        {/* Full-width CTA */}
        <button className={styles.readBtn} onClick={handleRead}>
          {isYouTube ? '▶  Watch on YouTube' : 'Read Full Story  →'}
        </button>

      </div>

      {/* Swipe-up hint — only on first card before user scrolls */}
      {showHint && (
        <div className={styles.swipeHint}>
          <div className={styles.swipeChevrons}>
            <ChevronUpIcon />
            <ChevronUpIcon />
          </div>
          <span className={styles.swipeLabel}>Swipe up for next</span>
        </div>
      )}

    </div>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────────────── */
export default function ShortsScreen() {
  const [activeCat, setActiveCat] = useState('all');
  const activeCategoryApiId = SHORTS_CATEGORIES.find(c => c.id === activeCat)?.apiId ?? null;

  const { shorts, categories, pagination, loading, error, loadMore, refresh } = useShorts({
    categoryId: activeCategoryApiId,
  });

  const [activeIndex, setActiveIndex] = useState(0);

  const feedRef     = useRef(null);
  const cardRefs    = useRef([]);
  const sentinelRef = useRef(null);
  const hasScrolled = useRef(false);   // swipe hint: hide once user moves past card 0

  // Reset scroll + active index when category changes
  useEffect(() => {
    setActiveIndex(0);
    hasScrolled.current = false;
    cardRefs.current = [];
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [activeCat]);

  // Mark scrolled once activeIndex moves off card 0
  useEffect(() => {
    if (activeIndex > 0) hasScrolled.current = true;
  }, [activeIndex]);

  // IntersectionObserver: active card detection + sentinel pagination
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || shorts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = cardRefs.current.indexOf(entry.target);
          if (idx !== -1) { setActiveIndex(idx); return; }
          if (entry.target === sentinelRef.current) loadMore();
        });
      },
      { root: feed, threshold: 0.6 },
    );

    cardRefs.current.forEach((el) => { if (el) observer.observe(el); });
    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [shorts.length, loadMore]);

  // Auto-advance: scroll to next card
  const handleAdvance = useCallback(() => {
    const next = cardRefs.current[activeIndex + 1];
    if (next) next.scrollIntoView({ behavior: 'smooth' });
  }, [activeIndex]);

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.screen}>

      {/* ── Error (full-screen, no cards yet) ── */}
      {error && shorts.length === 0 && (
        <div className={styles.center}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      )}

      {/* ── Reel feed — category bar floats over top ── */}
      {(!error || shorts.length > 0) && (
        <div className={styles.feedWrap}>

          {/* Floating category tab bar */}
          <div className={styles.catBar}>
            <div className={styles.catScroll}>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.catBtn} ${activeCat === cat.id ? styles.catActive : ''}`}
                  onClick={() => setActiveCat(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Snap-scroll feed */}
          <div className={styles.feed} ref={feedRef}>

            {/* Initial load skeletons */}
            {loading && shorts.length === 0 && (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}

            {/* Empty state */}
            {!loading && shorts.length === 0 && (
              <div className={styles.center}>
                <EmptyState icon="⚡" title="No shorts available" subtitle="Check back soon" />
              </div>
            )}

            {/* Cards */}
            {shorts.map((short, i) => (
              <ShortCard
                key={short.id}
                short={short}
                isActive={i === activeIndex}
                onAdvance={handleAdvance}
                cardRef={(el) => { cardRefs.current[i] = el; }}
                index={i}
                total={shorts.length}
                showHint={i === 0 && !hasScrolled.current && shorts.length > 1}
              />
            ))}

            {/* Load-more sentinel */}
            {pagination?.hasNextPage && (
              <div className={styles.sentinel} ref={sentinelRef}>
                <div className={styles.spinner} />
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
