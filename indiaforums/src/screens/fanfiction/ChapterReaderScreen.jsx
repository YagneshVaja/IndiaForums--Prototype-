import { useMemo, useState, useEffect } from 'react';
import styles from './ChapterReaderScreen.module.css';
import { useFanFictionChapter } from '../../hooks/useFanFictions';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState   from '../../components/ui/ErrorState';

function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

function formatCount(n) {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 100000) return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (num >= 1000)   return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

// HTML detection — chapterContent is HTML; if a backend ever switches to plain
// text we still want to render it readably.
function looksLikeHtml(s) {
  return typeof s === 'string' && /<\w+[^>]*>/.test(s);
}

// `likeJsonData` arrives as a JSON-string shaped like
//   '{"1":0,"2":1,"3":1,"4":0,"5":0,"6":0,"7":0,"8":0}'
// We parse defensively and expose the 8 reaction slots with stable labels.
// NOTE: We don't have an authoritative key→name map from the API, so the
// labels here are best-effort common reaction names. They can be corrected
// once documented without changing the data flow.
const REACTION_LABELS = {
  1: { icon: '👍', label: 'Like'   },
  2: { icon: '❤️', label: 'Love'   },
  3: { icon: '😂', label: 'Haha'   },
  4: { icon: '😮', label: 'Wow'    },
  5: { icon: '😢', label: 'Sad'    },
  6: { icon: '😡', label: 'Angry'  },
  7: { icon: '🙏', label: 'Thanks' },
  8: { icon: '🔥', label: 'Fire'   },
};

function parseReactionMap(raw) {
  if (!raw) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;
  const entries = [];
  for (let i = 1; i <= 8; i += 1) {
    const count = Number(obj[i] ?? obj[String(i)] ?? 0);
    entries.push({ id: i, count, ...REACTION_LABELS[i] });
  }
  return entries;
}

// statusCode 1 = Published on fan-fiction chapters (others are drafts/unknown)
const chapterStatusLabel = (code) => {
  const n = Number(code);
  if (n === 1) return 'Published';
  if (n === 0) return 'Draft';
  return null;
};

const FONT_SIZES = [
  { id: 'sm', px: 14 },
  { id: 'md', px: 16 },
  { id: 'lg', px: 18 },
];

export default function ChapterReaderScreen({ chapterId, onBack }) {
  const { chapter, loading, error, refetch } = useFanFictionChapter(chapterId);
  const [fontIdx, setFontIdx] = useState(1); // medium

  // Reset scroll on chapter change.
  useEffect(() => {
    const el = document.getElementById('chapter-scroll');
    if (el) el.scrollTop = 0;
  }, [chapterId]);

  const view = useMemo(() => {
    if (!chapter) return null;
    return {
      title:       chapter.chapterTitle || 'Chapter',
      number:      chapter.orderNumber,
      storyId:     chapter.fanFictionId,
      // Parent story cover — the chapter payload embeds the story thumbnail
      // so we can render a breadcrumb that's visually anchored to the story.
      storyThumb:  chapter.ffThumbnail || chapter.ffBannerThumbnail || null,
      // Prefer the cleaned `filteredChapterContent` (HTML stripped of unsafe
      // attributes) when present, fall back to raw `chapterContent`.
      body:        chapter.filteredChapterContent || chapter.chapterContent || '',
      authorId:    chapter.userId,
      published:   chapter.chapterPublishedWhen || chapter.createdWhen,
      edited:      chapter.lastEditedWhen,
      views:       chapter.viewCount    || 0,
      likes:       chapter.likeCount    || 0,
      comments:    chapter.commentCount || 0,
      membersOnly: !!chapter.chapterMembersOnly,
      mature:      !!chapter.chapterHasMaturedContent,
      status:      chapterStatusLabel(chapter.statusCode),
      // 8-slot reaction breakdown (may be null if the backend omits it).
      reactions:   parseReactionMap(chapter.likeJsonData),
    };
  }, [chapter]);

  if (loading) return <div className={styles.screen}><LoadingState count={4} /></div>;
  if (error)   return <div className={styles.screen}><ErrorState message={error} onRetry={refetch} /></div>;
  if (!view)   return <div className={styles.screen}><ErrorState message="Chapter not found" /></div>;

  const fontPx = FONT_SIZES[fontIdx].px;
  const isHtml = looksLikeHtml(view.body);

  return (
    <div className={styles.screen} id="chapter-scroll">
      {/* ── Reader header ─────────────────────────────────────────────────── */}
      <div className={styles.readerHeader}>
        <div className={styles.readerCrumb}>
          {view.storyThumb && (
            <img
              src={view.storyThumb}
              alt=""
              className={styles.crumbThumb}
              loading="lazy"
            />
          )}
          {view.number != null && (
            <span className={styles.crumbChapter}>Chapter {view.number}</span>
          )}
          {view.authorId && (
            <>
              <span className={styles.crumbDot}>·</span>
              <span className={styles.crumbStory}>by User #{view.authorId}</span>
            </>
          )}
        </div>

        {/* Font size toggle */}
        <div className={styles.fontToggle} role="group" aria-label="Reading size">
          {FONT_SIZES.map((f, i) => (
            <button
              key={f.id}
              className={`${styles.fontBtn} ${i === fontIdx ? styles.fontBtnActive : ''}`}
              onClick={() => setFontIdx(i)}
              style={{ fontSize: 10 + i * 2 }}
              aria-label={`Font size ${f.id}`}
            >
              A
            </button>
          ))}
        </div>
      </div>

      {/* ── Title + meta ──────────────────────────────────────────────────── */}
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{view.title}</h1>

        {(view.membersOnly || view.mature || view.status) && (
          <div className={styles.flagRow}>
            {view.status      && <span className={styles.flagStatus}>{view.status}</span>}
            {view.membersOnly && <span className={styles.flagMembers}>🔒 Members only</span>}
            {view.mature      && <span className={styles.flagMature}>18+ Mature content</span>}
          </div>
        )}

        <div className={styles.meta}>
          {view.published && <span>{formatDate(view.published)}</span>}
          {view.edited && view.edited !== view.published && (
            <>
              <span className={styles.metaDot}>·</span>
              <span>edited {formatDate(view.edited)}</span>
            </>
          )}
        </div>

        <div className={styles.metaStats}>
          <span>👁 {formatCount(view.views)} views</span>
          <span className={styles.metaDot}>·</span>
          <span>♥ {formatCount(view.likes)} likes</span>
          <span className={styles.metaDot}>·</span>
          <span>💬 {formatCount(view.comments)} comments</span>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <article className={styles.body} style={{ fontSize: fontPx, lineHeight: 1.7 }}>
        {view.body
          ? (isHtml
              ? <div dangerouslySetInnerHTML={{ __html: view.body }} />
              : view.body.split(/\n\n+/).map((p, i) => <p key={i}>{p}</p>))
          : <p className={styles.empty}>This chapter has no content.</p>}
      </article>

      {/* ── Reactions strip — 8 reaction slots from likeJsonData ──────────── */}
      {view.reactions && view.reactions.some(r => r.count > 0) && (
        <div className={styles.reactionsBlock}>
          <div className={styles.reactionsLabel}>Reader reactions</div>
          <div className={styles.reactionsGrid}>
            {view.reactions.map((r) => (
              <div
                key={r.id}
                className={`${styles.reactionPill} ${r.count > 0 ? styles.reactionPillActive : ''}`}
                title={r.label}
              >
                <span className={styles.reactionIcon}>{r.icon}</span>
                <span className={styles.reactionCount}>{formatCount(r.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Back to story ─────────────────────────────────────────────────── */}
      <div className={styles.navRow}>
        <button className={styles.backBtn} onClick={onBack}>← Back to story</button>
      </div>

      <div className={styles.spacer} />
    </div>
  );
}
