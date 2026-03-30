import { useState, useCallback } from 'react';
import styles from './WebStoriesScreen.module.css';
import { WEB_STORIES, WEB_STORY_CATEGORIES } from '../data/webStories';

/* ── Icons ───────────────────────────────────────────────────────────────────── */
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="13" cy="3"  r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="3"  cy="8"  r="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4.8 7.1l6.5-3.2M4.8 8.9l6.5 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
    <path d="M2 2a1 1 0 011-1h8a1 1 0 011 1v12l-5-3-5 3V2z"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

/* ── Story card (grid tile) ──────────────────────────────────────────────────── */
function StoryCard({ story, onPress }) {
  return (
    <div className={styles.card} onClick={() => onPress(story)}>
      {/* Cover thumbnail */}
      <div className={styles.cardCover} style={{ background: story.coverBg }}>
        <span className={styles.coverEmoji} aria-hidden="true">{story.coverEmoji}</span>
        <div className={styles.coverScrim} />

        {/* Category chip */}
        <span className={styles.coverCat}>{story.categoryLabel}</span>

        {/* Slide count badge */}
        <span className={styles.slideCount}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginRight: 3 }}>
            <rect x="0.5" y="0.5" width="5" height="6" rx="0.8" stroke="white" strokeWidth="1"/>
            <rect x="2"   y="2"   width="5" height="6" rx="0.8" fill="rgba(255,255,255,0.5)" stroke="white" strokeWidth="1"/>
          </svg>
          {story.slideCount}
        </span>

        {/* Title on cover */}
        <div className={styles.coverBottom}>
          <div className={styles.coverTitle}>{story.title}</div>
        </div>
      </div>

      {/* Below card meta */}
      <div className={styles.cardMeta}>
        <div className={styles.cardAuthorAvatar} style={{ background: story.authorBg }}>
          <span className={styles.cardAuthorInitials}>{story.authorInitials}</span>
        </div>
        <div className={styles.cardAuthorInfo}>
          <span className={styles.cardAuthorName}>{story.author}</span>
          <span className={styles.cardTimeAgo}>{story.timeAgo} · {story.views} views</span>
        </div>
      </div>
    </div>
  );
}

/* ── Immersive Story Player ──────────────────────────────────────────────────── */
function StoryPlayer({ story, allStories, storyIdx, onClose, onNavigateStory }) {
  const [slideIdx, setSlideIdx] = useState(0);

  const slide     = story.slides[slideIdx];
  const isFirst   = slideIdx === 0;
  const isLast    = slideIdx === story.slides.length - 1;
  const hasPrev   = storyIdx > 0;
  const hasNext   = storyIdx < allStories.length - 1;

  const goNext = useCallback(() => {
    if (!isLast) {
      setSlideIdx((i) => i + 1);
    } else if (hasNext) {
      onNavigateStory(storyIdx + 1);
    } else {
      onClose();
    }
  }, [isLast, hasNext, storyIdx, onNavigateStory, onClose]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setSlideIdx((i) => i - 1);
    } else if (hasPrev) {
      onNavigateStory(storyIdx - 1);
    }
  }, [isFirst, hasPrev, storyIdx, onNavigateStory]);

  return (
    <div className={styles.playerOverlay}>
      <div className={styles.player} style={{ background: slide.bg }}>

        {/* Decorative emoji bg */}
        <span className={styles.playerEmoji} aria-hidden="true">{slide.emoji}</span>
        <div className={styles.playerScrim} />

        {/* Progress bars */}
        <div className={styles.progressRow}>
          {story.slides.map((_, i) => (
            <div key={i} className={styles.progressSeg}>
              <div
                className={`${styles.progressFill} ${
                  i < slideIdx
                    ? styles.progressDone
                    : i === slideIdx
                    ? styles.progressActive
                    : ''
                }`}
                /* reset animation key when slide changes */
                key={`${i}-${slideIdx}`}
              />
            </div>
          ))}
        </div>

        {/* Header row */}
        <div className={styles.playerHeader}>
          <div className={styles.playerAuthorRow}>
            <div className={styles.playerAvatar} style={{ background: story.authorBg }}>
              <span className={styles.playerInitials}>{story.authorInitials}</span>
            </div>
            <div>
              <div className={styles.playerAuthorName}>{story.author}</div>
              <div className={styles.playerTime}>{story.timeAgo}</div>
            </div>
          </div>
          <div className={styles.playerHeaderRight}>
            <button className={styles.playerIconBtn} aria-label="Share">
              <ShareIcon />
            </button>
            <button className={styles.playerIconBtn} aria-label="Save">
              <BookmarkIcon />
            </button>
            <button className={styles.playerCloseBtn} onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Tap zones — left half goes back, right half goes forward */}
        <div className={styles.tapLeft}  onClick={goPrev} aria-label="Previous slide" />
        <div className={styles.tapRight} onClick={goNext} aria-label="Next slide" />

        {/* Slide content — bottom */}
        <div className={styles.slideContent}>
          <span className={styles.slideCatBadge}>{story.categoryLabel}</span>
          <div className={styles.slideTitle}>{slide.title}</div>
          {slide.caption && (
            <div className={styles.slideCaption}>{slide.caption}</div>
          )}

          {/* Slide counter dots */}
          <div className={styles.dotRow}>
            {story.slides.map((_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${i === slideIdx ? styles.dotActive : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Edge nav arrows (subtle) */}
        {(!isFirst || hasPrev) && (
          <div className={styles.arrowLeft} onClick={goPrev}>
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M9 1L1 9l8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        {(!isLast || hasNext) && (
          <div className={styles.arrowRight} onClick={goNext}>
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
              <path d="M1 1l8 8-8 8" stroke="rgba(255,255,255,0.6)" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────────────────── */
export default function WebStoriesScreen({ onBack }) {
  const [activeCat,    setActiveCat]    = useState('all');
  const [activeStory,  setActiveStory]  = useState(null); // story object
  const [activeIdx,    setActiveIdx]    = useState(null); // index in filtered list

  const filtered = activeCat === 'all'
    ? WEB_STORIES
    : WEB_STORIES.filter((s) => s.category === activeCat);

  function openStory(story) {
    const idx = filtered.findIndex((s) => s.id === story.id);
    setActiveStory(story);
    setActiveIdx(idx);
  }

  function closeStory() {
    setActiveStory(null);
    setActiveIdx(null);
  }

  function navigateStory(newIdx) {
    if (newIdx >= 0 && newIdx < filtered.length) {
      setActiveStory(filtered[newIdx]);
      setActiveIdx(newIdx);
    }
  }

  return (
    <div className={styles.screen}>

      {/* Category tabs */}
      <div className={styles.catBar}>
        <div className={styles.catScroll}>
          {WEB_STORY_CATEGORIES.map((cat) => (
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

      {/* Feed header */}
      <div className={styles.feedHeader}>
        <span className={styles.feedDot} />
        <span className={styles.feedLabel}>Latest Web Stories</span>
        <span className={styles.feedCount}>{filtered.length} stories</span>
      </div>

      {/* 2-column portrait grid */}
      <div className={styles.grid}>
        {filtered.map((story) => (
          <StoryCard key={story.id} story={story} onPress={openStory} />
        ))}
      </div>

      <div className={styles.spacer} />

      {/* Immersive story player */}
      {activeStory && (
        <StoryPlayer
          story={activeStory}
          allStories={filtered}
          storyIdx={activeIdx}
          onClose={closeStory}
          onNavigateStory={navigateStory}
        />
      )}
    </div>
  );
}
