import { useState, useMemo } from 'react';
import styles from './FanFictionScreen.module.css';
import { FF_GENRES, FF_SHOWS, FF_SORT_TABS, FF_FEATURED, FF_STORIES } from '../data/fanFictionData';

// ─── Fandom → Show ID map (wires the show filter to actual data) ──────────────
const FANDOM_TO_SHOW = {
  'YRKKH':          'yrkkh',
  'Anupamaa':       'anupamaa',
  'Ghum Hai':       'ghum-hai',
  'Kundali Bhagya': 'kundali',
  'Imlie':          'imlie',
  'Bollywood':      'bollywood',
};

// ─── Shorten "2 hours ago" → "2h" for compact stats row ──────────────────────
function shortTime(str) {
  return str
    .replace(/(\d+) hours? ago/,   '$1h')
    .replace(/(\d+) days? ago/,    '$1d')
    .replace(/(\d+) months? ago/,  '$1mo')
    .replace(/(\d+) minutes? ago/, '$1m');
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M12.5 5L7.5 10L12.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
    <path d="M13 13l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const BookmarkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 2h8a.5.5 0 01.5.5v10l-4-2-4 2V2.5A.5.5 0 013 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const HeartIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 10.5S1 7.3 1 4.3a2.9 2.9 0 015-2 2.9 2.9 0 015 2c0 3-5 6.2-5 6.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 6S3 2 6 2s5 4 5 4-2 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const ChapterIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="2" y="1" width="8" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 4h4M4 6h4M4 8h2.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5.5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

// ─── Featured Card ─────────────────────────────────────────────────────────────
function FeaturedCard({ item }) {
  return (
    <div className={styles.featuredCard}>
      <div className={styles.featuredBg} style={{ background: item.bg }}>
        {/* Bottom-heavy gradient so text is always legible */}
        <div className={styles.featuredOverlay} />

        {/* Decorative emoji — large, rotated, mid-card right side */}
        <span className={styles.featuredDecor}>{item.cover}</span>

        {/* "✦ Featured" badge — top-left glass pill */}
        <div className={styles.featuredBadge}>✦ Featured</div>

        {/* Status badge — top-right */}
        <div className={`${styles.featuredStatusBadge} ${item.status === 'Complete' ? styles.statusComplete : styles.statusOngoing}`}>
          {item.status}
        </div>

        {/* Bottom content block */}
        <div className={styles.featuredContent}>
          {/* Fandom label */}
          <div className={styles.featuredFandom}>{item.fandom}</div>

          {/* Title */}
          <div className={styles.featuredTitle}>{item.title}</div>

          {/* Genre tags */}
          <div className={styles.featuredTags}>
            {item.tags.map(t => <span key={t} className={styles.featuredTag}>{t}</span>)}
          </div>

          {/* Footer: author + stats + CTA */}
          <div className={styles.featuredFooter}>
            <div className={styles.featuredLeft}>
              <div className={styles.featuredAuthorRow}>
                <span className={styles.featuredAuthorDot}>{item.cover}</span>
                <span className={styles.featuredAuthor}>{item.author}</span>
              </div>
              <div className={styles.featuredStats}>
                <span><EyeIcon /> {item.views}</span>
                <span><HeartIcon /> {item.likes}</span>
                <span><ChapterIcon /> {item.chapters} ch</span>
              </div>
            </div>
            <button className={styles.featuredReadBtn}>Read →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Story Card ────────────────────────────────────────────────────────────────
// Reduced from 7 information layers → 4:
//   1. Fandom + status badge + bookmark
//   2. Title
//   3. Genre tags (max 2)
//   4. Author · ch · views · likes · time (single meta row)
function StoryCard({ story, delay = 0 }) {
  return (
    <div className={styles.storyCard} style={{ animationDelay: `${delay}s` }}>
      {/* Book-cover thumbnail */}
      <div className={styles.storyCover} style={{ background: story.bg }}>
        <span className={styles.storyCoverEmoji}>{story.cover}</span>
      </div>

      <div className={styles.storyBody}>
        {/* Row 1 */}
        <div className={styles.storyTopRow}>
          <span className={styles.storyFandom}>{story.fandom}</span>
          <span className={`${styles.storyStatus} ${story.status === 'Complete' ? styles.statusComplete : styles.statusOngoing}`}>
            {story.status}
          </span>
          <button className={styles.bookmarkBtn} aria-label="Save story">
            <BookmarkIcon />
          </button>
        </div>

        {/* Row 2 */}
        <div className={styles.storyTitle}>{story.title}</div>

        {/* Row 3 */}
        <div className={styles.storyTags}>
          {story.tags.slice(0, 2).map(t => (
            <span key={t} className={styles.storyTag}>{t}</span>
          ))}
        </div>

        {/* Row 4 — single compact meta row */}
        <div className={styles.storyMeta}>
          <span className={styles.metaAuthor}>{story.author}</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaStat}><ChapterIcon />{story.chapters}</span>
          <span className={styles.metaStat}><EyeIcon />{story.views}</span>
          <span className={styles.metaStat}><HeartIcon />{story.likes}</span>
          <span className={styles.metaTime}><ClockIcon />{shortTime(story.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function FanFictionScreen() {
  const [activeGenre,   setActiveGenre]   = useState('all');
  const [activeShow,    setActiveShow]    = useState('all');
  const [activeSortTab, setActiveSortTab] = useState('trending');
  const [featuredIdx,   setFeaturedIdx]   = useState(0);

  // Both show + genre filters are now actually applied
  const stories = useMemo(() => {
    let list = FF_STORIES[activeSortTab] || FF_STORIES.trending;
    if (activeShow !== 'all') {
      list = list.filter(s => FANDOM_TO_SHOW[s.fandom] === activeShow);
    }
    if (activeGenre !== 'all') {
      list = list.filter(s => s.genre === activeGenre);
    }
    return list;
  }, [activeSortTab, activeGenre, activeShow]);

  function handleFeaturedScroll(e) {
    const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
    setFeaturedIdx(idx);
  }

  function clearFilters() {
    setActiveGenre('all');
    setActiveShow('all');
  }

  return (
    <div className={styles.screen}>

      {/* ── 1. Show / Fandom Filter — scrollable row with right fade ── */}
      <div className={styles.showWrap}>
        <div className={styles.showScroll}>
          {FF_SHOWS.map(s => (
            <button
              key={s.id}
              className={`${styles.showChip} ${activeShow === s.id ? styles.showChipActive : ''}`}
              onClick={() => setActiveShow(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.rowFade} />
      </div>

      {/* ── 3. Featured Carousel — 210px, peek of next card, dots overlaid ── */}
      <div className={styles.featuredSection}>
        <div className={styles.featuredScroll} onScroll={handleFeaturedScroll}>
          {FF_FEATURED.map(item => (
            <FeaturedCard key={item.id} item={item} />
          ))}
        </div>
        {/* Dots overlaid on the bottom-right of the carousel area */}
        <div className={styles.dotsOverlay}>
          {FF_FEATURED.map((_, i) => (
            <div key={i} className={`${styles.dot} ${i === featuredIdx ? styles.dotActive : ''}`} />
          ))}
        </div>
      </div>

      {/* ── 4. Genre Chips — scrollable, right fade ── */}
      <div className={styles.genreWrap}>
        <div className={styles.genreScroll}>
          {FF_GENRES.map(g => (
            <button
              key={g.id}
              className={`${styles.genreChip} ${activeGenre === g.id ? styles.genreChipActive : ''}`}
              onClick={() => setActiveGenre(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className={styles.rowFade} />
      </div>

      {/* ── 5. Sort Tabs — sticky below header ── */}
      <div className={styles.sortTabs}>
        {FF_SORT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.sortTab} ${activeSortTab === tab.id ? styles.sortTabActive : ''}`}
            onClick={() => setActiveSortTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 6. Story List ── */}
      <div className={styles.storyList}>
        {stories.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📭</span>
            <p className={styles.emptyText}>No stories match this filter.</p>
            <button className={styles.clearBtn} onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          stories.map((s, i) => (
            <StoryCard key={s.id} story={s} delay={i * 0.05} />
          ))
        )}
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
