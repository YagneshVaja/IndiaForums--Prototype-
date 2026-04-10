import { useState, useEffect, useRef, useCallback } from 'react';
import useWebStoryDetails from '../../hooks/useWebStoryDetails';
import ErrorState from '../ui/ErrorState';
import styles from './WebStoryPlayer.module.css';

/* ── Icons ────────────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
    <path d="M3 2l9 5-9 5V2z" />
  </svg>
);
const PauseIcon = () => (
  <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor">
    <rect x="1"  y="1" width="3" height="12" rx="0.5" />
    <rect x="8"  y="1" width="3" height="12" rx="0.5" />
  </svg>
);

const DEFAULT_SLIDE_MS = 5000;

/**
 * Fullscreen immersive web-story player.
 *
 * Given a story summary (`{ id, title, coverImage, ... }` from the list
 * endpoint), lazily fetches the full /details payload (which includes the
 * real author block + parsed slide list) and plays through slides with
 * auto-advance, progress bars, tap zones, and prev/next buttons.
 *
 * Can navigate between stories in a collection via `allStories` + `storyIdx`
 * + `onNavigateStory(newIdx)`.
 */
export default function WebStoryPlayer({
  story,
  allStories = [],
  storyIdx = 0,
  onClose,
  onNavigateStory,
}) {
  // Lazy fetch — also returns the full `story` object (with author, etc.)
  // because the list endpoint doesn't include author/description.
  const { story: detail, slides, loading, error, refetch } = useWebStoryDetails(story?.id);

  // Prefer the detailed object once it lands; fall back to the list summary.
  const merged = detail ?? story;
  const author = detail?.author;

  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 of current slide
  const tickRef       = useRef(null);
  const startedAtRef  = useRef(0); // wall-clock ms when current slide started
  const elapsedRef    = useRef(0); // ms elapsed in current slide (kept across pauses)
  const lastSlideRef  = useRef(slideIdx); // for resetting elapsed when slide changes

  // Reset visible progress whenever the slide changes — canonical "previous
  // prop" reset pattern from the React docs (state-only, no refs touched in
  // render). Story changes are handled by the parent passing `key={story.id}`,
  // which forces a fresh mount and zeroes everything via initial useState.
  const [prevSlideIdx, setPrevSlideIdx] = useState(slideIdx);
  if (slideIdx !== prevSlideIdx) {
    setPrevSlideIdx(slideIdx);
    setProgress(0);
  }

  const currentSlide   = slides[slideIdx];
  const slideDuration  = currentSlide?.durationMs || DEFAULT_SLIDE_MS;
  const hasPrevStory   = storyIdx > 0;
  const hasNextStory   = storyIdx < allStories.length - 1;
  const isFirstSlide   = slideIdx === 0;
  const isLastSlide    = slides.length > 0 && slideIdx === slides.length - 1;

  const goNext = useCallback(() => {
    if (slides.length === 0) return;
    if (!isLastSlide) {
      setSlideIdx((i) => i + 1);
    } else if (hasNextStory && onNavigateStory) {
      onNavigateStory(storyIdx + 1);
    } else if (onClose) {
      onClose();
    }
  }, [slides.length, isLastSlide, hasNextStory, storyIdx, onNavigateStory, onClose]);

  const goPrev = useCallback(() => {
    if (slides.length === 0) return;
    if (!isFirstSlide) {
      setSlideIdx((i) => i - 1);
    } else if (hasPrevStory && onNavigateStory) {
      onNavigateStory(storyIdx - 1);
    }
  }, [slides.length, isFirstSlide, hasPrevStory, storyIdx, onNavigateStory]);

  // Auto-advance tick. Uses wall-clock time so pause/resume is accurate.
  // Ref mutations inside effect bodies are allowed by the linter — only
  // ref mutations during render are flagged.
  useEffect(() => {
    if (paused || loading || error || slides.length === 0) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    // Fresh slide? Zero elapsed before computing startedAt. (Resume from
    // pause keeps elapsed intact so we continue from where we left off.)
    if (lastSlideRef.current !== slideIdx) {
      lastSlideRef.current = slideIdx;
      elapsedRef.current = 0;
    }
    startedAtRef.current = Date.now() - elapsedRef.current;
    tickRef.current = setInterval(() => {
      const e = Date.now() - startedAtRef.current;
      elapsedRef.current = e;
      const p = Math.min(1, e / slideDuration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tickRef.current);
        tickRef.current = null;
        elapsedRef.current = 0;
        goNext();
      }
    }, 50);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [paused, loading, error, slides.length, slideIdx, slideDuration, goNext]);

  // Capture elapsed-time on pause so resume picks up where it left off.
  useEffect(() => {
    if (paused) {
      elapsedRef.current = Date.now() - startedAtRef.current;
    }
  }, [paused]);

  // Keyboard navigation.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  /* ── Media (background) ────────────────────────────────────────────────── */
  function renderMedia() {
    if (!currentSlide) {
      // No slide yet (loading) — show the cover thumbnail behind the spinner.
      if (merged?.coverImage) {
        return <img className={styles.media} src={merged.coverImage} alt="" draggable={false} loading="lazy" decoding="async" />;
      }
      return <div className={styles.media} style={{ background: merged?.coverBg || '#0b0b0b' }} />;
    }
    if (currentSlide.mediaType === 'video' && currentSlide.videoUrl) {
      return (
        <video
          key={currentSlide.id}
          className={styles.media}
          src={currentSlide.videoUrl}
          autoPlay
          muted
          playsInline
          loop={false}
        />
      );
    }
    if (currentSlide.imageUrl) {
      return (
        <img
          key={currentSlide.id}
          className={styles.media}
          src={currentSlide.imageUrl}
          alt={currentSlide.title || merged?.title || ''}
          draggable={false}
        />
      );
    }
    // No media → deterministic gradient fallback (set in transformSlide).
    return <div className={styles.media} style={{ background: currentSlide.bg }} />;
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className={styles.overlay}>
      <div className={styles.player}>
        {/* Media layer */}
        <div className={styles.mediaWrap}>
          {renderMedia()}
          <div className={styles.scrim} />
        </div>

        {/* Progress bars */}
        <div className={styles.progressRow}>
          {(slides.length > 0 ? slides : [null]).map((_, i) => {
            const fill =
              i < slideIdx ? 1 : i === slideIdx ? progress : 0;
            return (
              <div key={i} className={styles.progressSeg}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${fill * 100}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Header — author info comes from /details, falls back gracefully
            while loading */}
        <div className={styles.header}>
          <div className={styles.authorRow}>
            <div
              className={styles.avatar}
              style={{ background: author?.avatarBg || 'linear-gradient(135deg,#3558F0,#7c3aed)' }}
            >
              <span className={styles.initials}>{author?.initials || 'IF'}</span>
            </div>
            <div className={styles.authorMeta}>
              <div className={styles.authorName}>
                {author?.displayName || 'India Forums'}
                {author?.groupName && (
                  <span className={styles.authorBadge}>{author.groupName}</span>
                )}
              </div>
              <div className={styles.timeAgo}>{merged?.timeAgo}</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.iconBtn}
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Play' : 'Pause'}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
            </button>
            <button className={styles.iconBtn} onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Loading / error overlays */}
        {loading && (
          <div className={styles.centerOverlay}>
            <div className={styles.spinner} aria-label="Loading story" />
          </div>
        )}
        {error && (
          <div className={styles.centerOverlay}>
            <ErrorState message={error} onRetry={refetch} />
          </div>
        )}

        {/* Tap zones — left=prev, right=next */}
        {!loading && !error && (
          <>
            <div className={styles.tapLeft}  onClick={goPrev} aria-label="Previous" />
            <div className={styles.tapRight} onClick={goNext} aria-label="Next" />
          </>
        )}

        {/* Slide caption */}
        {!loading && !error && currentSlide && (
          <div className={styles.captionBox}>
            {currentSlide.isCover && merged?.featured && (
              <span className={styles.catBadge}>Featured</span>
            )}
            {currentSlide.title && (
              <div className={styles.slideTitle}>{currentSlide.title}</div>
            )}
            {currentSlide.caption && (
              <div className={styles.slideCaption}>{currentSlide.caption}</div>
            )}

            {/* Story-level description — only rendered on the cover slide,
                and only if it differs from the slide's own caption so it
                doesn't duplicate the body text. */}
            {currentSlide.isCover
              && merged?.description
              && merged.description.trim() !== (currentSlide.caption || '').trim() && (
              <div className={styles.storyDescription}>{merged.description}</div>
            )}

            {/* Per-slide author override (quote/citation slides) */}
            {currentSlide.slideAuthor && (
              <div className={styles.slideByline}>— {currentSlide.slideAuthor}</div>
            )}

            {/* Listicle items */}
            {currentSlide.extra?.kind === 'list' && currentSlide.extra.items.length > 0 && (
              <ul className={styles.slideList}>
                {currentSlide.extra.items.map((item, i) => (
                  <li key={i} className={styles.slideListItem}>
                    {typeof item === 'string' ? item : (item?.text || item?.title || '')}
                  </li>
                ))}
              </ul>
            )}

            {/* Poll / quiz options — tap-through is not wired yet because
                the submit endpoint isn't finalised; options render as a
                readable list so users can still see them. */}
            {(currentSlide.extra?.kind === 'poll' || currentSlide.extra?.kind === 'quiz')
              && currentSlide.extra.options?.length > 0 && (
              <ul className={styles.slideList}>
                {currentSlide.extra.options.map((opt, i) => (
                  <li key={i} className={styles.slideListItem}>
                    {typeof opt === 'string'
                      ? opt
                      : (opt?.text || opt?.title || opt?.label || '')}
                  </li>
                ))}
              </ul>
            )}

            {/* Slide CTA — "Read more" style link. Only rendered when the
                backend provides a real url; an action label without a url
                would be a dead button. */}
            {currentSlide.actionUrl && currentSlide.actionLabel && (
              <a
                className={styles.slideCta}
                href={currentSlide.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentSlide.actionLabel} →
              </a>
            )}

            {/* Per-slide media credit (e.g. "Osen", "Netflix Korea") */}
            {currentSlide.mediaCredit && (
              <div className={styles.mediaCredit}>Credit: {currentSlide.mediaCredit}</div>
            )}
          </div>
        )}

        {/* Edge arrows */}
        {!loading && !error && (!isFirstSlide || hasPrevStory) && (
          <button className={styles.arrowLeft} onClick={goPrev} aria-label="Previous">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9l8 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {!loading && !error && (!isLastSlide || hasNextStory) && (
          <button className={styles.arrowRight} onClick={goNext} aria-label="Next">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M1 1l8 8-8 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
