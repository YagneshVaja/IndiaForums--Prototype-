import { useMemo, useState, useEffect } from 'react';
import styles from './FanFictionDetailScreen.module.css';
import { useFanFictionDetail } from '../../hooks/useFanFictions';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState   from '../../components/ui/ErrorState';
import EmptyState   from '../../components/ui/EmptyState';

// ── JSON-string helpers ──────────────────────────────────────────────────────
function parseJsonListString(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.json)) return parsed.json;
    return [];
  } catch {
    return [];
  }
}
const entityNames = list =>
  parseJsonListString(list)
    .map(t => t?.name || t?.title || t?.tag || (typeof t === 'string' ? t : null))
    .filter(Boolean);

// ── Formatters ───────────────────────────────────────────────────────────────
function formatCount(n) {
  const num = Number(n);
  if (!num || Number.isNaN(num)) return '0';
  if (num >= 10000000) return (num / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (num >= 100000)   return (num / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (num >= 1000)     return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

function formatDate(d) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

const statusLabel = code => (Number(code) === 1 ? 'Completed' : 'Ongoing');

const RATING_LABELS = { 1: 'G', 2: 'PG', 3: 'T', 4: 'M', 5: 'MA' };
const ratingLabel = r => { const n = Number(r); return RATING_LABELS[n] || (n ? `R${n}` : null); };

const TYPE_LABELS = { 0: 'Fan Fiction', 1: 'One-shot', 2: 'Short Story' };
const typeLabel = t => TYPE_LABELS[Number(t)] || null;

// Returns real name / username, or null — never a raw numeric user ID.
const authorDisplay = raw => raw?.realName || raw?.userName || null;

// ── Fallback gradient backgrounds ────────────────────────────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 50%,#6d28d9 100%)',
  'linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)',
  'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)',
  'linear-gradient(135deg,#1c1917 0%,#78350f 50%,#a16207 100%)',
  'linear-gradient(135deg,#064e3b 0%,#047857 50%,#10b981 100%)',
];
function fallbackBg(seed = '') {
  const idx = String(seed).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

// ── SVG Icons ────────────────────────────────────────────────────────────────
const ChevronIcon = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M7 6.5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="4.5" r="0.7" fill="currentColor" />
  </svg>
);

// Right-pointing arrow for chapter rows — consistent across platforms.
const RowArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── StatBlock ─────────────────────────────────────────────────────────────────
function StatBlock({ icon, value, label }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// ── ChapterRow ────────────────────────────────────────────────────────────────
function ChapterRow({ chapter, onPress }) {
  const number      = chapter?.orderNumber ?? '—';
  const title       = chapter?.chapterTitle || `Chapter ${number}`;
  const published   = chapter?.createdWhen;
  const views       = chapter?.viewCount  || 0;
  const likes       = chapter?.likeCount  || 0;
  const comments    = chapter?.commentCount || 0;
  const membersOnly = !!chapter?.chapterMembersOnly;
  const mature      = !!chapter?.chapterHasMaturedContent;

  return (
    <button className={styles.chapterRow} onClick={() => onPress?.(chapter?.chapterId, chapter)}>
      <div className={styles.chapterNum}>{number}</div>
      <div className={styles.chapterMeta}>
        <div className={styles.chapterTitle}>{title}</div>
        <div className={styles.chapterSub}>
          {published && <span>{formatDate(published)}</span>}
          {published && <span className={styles.chapterDot}>·</span>}
          <span>👁 {formatCount(views)}</span>
          <span className={styles.chapterDot}>·</span>
          <span>♥ {formatCount(likes)}</span>
          <span className={styles.chapterDot}>·</span>
          <span>💬 {formatCount(comments)}</span>
        </div>
        {(membersOnly || mature) && (
          <div className={styles.chapterFlags}>
            {membersOnly && <span className={styles.flagMembers}>🔒 Members only</span>}
            {mature      && <span className={styles.flagMature}>18+ Mature</span>}
          </div>
        )}
      </div>
      {/* SVG arrow — consistent rendering across all platforms */}
      <div className={styles.chapterArrow}><RowArrowIcon /></div>
    </button>
  );
}

// ── DetailsToggleButton ───────────────────────────────────────────────────────
function DetailsToggleButton({ isOpen, onToggle, badgeCount }) {
  return (
    <button
      className={`${styles.toggleBtn} ${isOpen ? styles.toggleBtnOpen : ''}`}
      onClick={onToggle}
      aria-expanded={isOpen}
    >
      <span className={styles.toggleLeft}>
        <InfoIcon />
        <span className={styles.toggleLabel}>
          {isOpen ? 'Hide details' : 'Story details'}
        </span>
        {!isOpen && badgeCount > 0 && (
          <span className={styles.toggleBadge}>{badgeCount}</span>
        )}
      </span>
      <ChevronIcon className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
    </button>
  );
}

// ── DetailsPanel ──────────────────────────────────────────────────────────────
// Collapsible — CSS grid 0fr→1fr animates to natural content height.
// Section order: Summary → Warning → Author's Note → Genres/Tags →
//                Related → Beta Readers → Details grid → Discuss CTA
function DetailsPanel({ isOpen, view, onDiscussPress }) {
  return (
    <div
      className={`${styles.detailsPanel} ${isOpen ? styles.detailsPanelOpen : ''}`}
      aria-hidden={!isOpen}
    >
      <div className={styles.detailsPanelInner}>
        <div className={styles.detailsPanelContent}>

          {/* 1. Summary — most important descriptive content */}
          {view.summary && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>Summary</div>
              <p className={styles.synopsis}>{view.summary}</p>
            </div>
          )}

          {/* 2. Warning — reader must see this before deciding to read */}
          {view.warning && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>⚠ Warning</div>
              <p className={styles.warningText}>{view.warning}</p>
            </div>
          )}

          {/* 3. Author's note */}
          {view.authorNote && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>Author's Note</div>
              <p className={styles.authorNote}>{view.authorNote}</p>
            </div>
          )}

          {/* 4. Genres + Tags */}
          {(view.genres.length > 0 || view.tags.length > 0) && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>
                {view.genres.length > 0 ? 'Genres & Tags' : 'Tags'}
              </div>
              <div className={styles.tagList}>
                {view.genres.map((g, i) => (
                  <span key={`g-${g}-${i}`} className={styles.tag}>{g}</span>
                ))}
                {view.tags.map((t, i) => (
                  <span key={`t-${t}-${i}`} className={styles.tagAlt}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* 5. Related shows / entities */}
          {view.entities.length > 0 && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>Related</div>
              <div className={styles.tagList}>
                {view.entities.map((e, i) => (
                  <span key={`e-${e}-${i}`} className={styles.entityTag}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Beta readers */}
          {view.beta.length > 0 && (
            <div className={styles.panelSection}>
              <div className={styles.panelLabel}>Beta Readers</div>
              <div className={styles.tagList}>
                {view.beta.map((b, i) => (
                  <span key={`b-${b}-${i}`} className={styles.tagAlt}>{b}</span>
                ))}
              </div>
            </div>
          )}

          {/* 7. Details grid — dates, counts, metadata */}
          <div className={styles.panelSection}>
            <div className={styles.panelLabel}>Details</div>
            <div className={styles.detailGrid}>
              {view.publishedAt && (
                <div className={styles.detailRow}>
                  <span>Published</span><strong>{formatDate(view.publishedAt)}</strong>
                </div>
              )}
              {view.createdAt && (
                <div className={styles.detailRow}>
                  <span>Created</span><strong>{formatDate(view.createdAt)}</strong>
                </div>
              )}
              {view.updatedAt && (
                <div className={styles.detailRow}>
                  <span>Last updated</span><strong>{formatDate(view.updatedAt)}</strong>
                </div>
              )}
              <div className={styles.detailRow}>
                <span>Followers</span><strong>{formatCount(view.followers)}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Active follows</span><strong>{formatCount(view.followCount)}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>Comments</span><strong>{formatCount(view.comments)}</strong>
              </div>
              {view.rating && (
                <div className={styles.detailRow}>
                  <span>Rating</span><strong>{view.rating}</strong>
                </div>
              )}
              {view.type && (
                <div className={styles.detailRow}>
                  <span>Type</span><strong>{view.type}</strong>
                </div>
              )}
              {view.graphicsBy && (
                <div className={styles.detailRow}>
                  <span>Graphics by</span><strong>{view.graphicsBy}</strong>
                </div>
              )}
              {view.id && (
                <div className={styles.detailRow}>
                  <span>Story ID</span><strong>#{view.id}</strong>
                </div>
              )}
            </div>
          </div>

          {/* 8. Discuss CTA — action goes last in the panel */}
          {view.topicId && (
            <div className={styles.panelSection}>
              <button
                className={styles.discussBtn}
                onClick={() => onDiscussPress?.(view.topicId)}
              >
                <span>💬 Discuss this story in the forum</span>
                <span className={styles.discussArrow}>→</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FanFictionDetailScreen({ storyId, onChapterPress, onAuthorPress, onDiscussPress }) {
  const { story, chapters, loading, error, refetch } = useFanFictionDetail(storyId);

  const [detailsOpen, setDetailsOpen] = useState(() => {
    try { return localStorage.getItem('ff_details_open') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    // eslint-disable-next-line no-empty
    try { localStorage.setItem('ff_details_open', String(detailsOpen)); } catch {}
  }, [detailsOpen]);

  const view = useMemo(() => {
    if (!story) return null;

    const tags     = entityNames(story.tagsJsonData);
    const genres   = entityNames(story.genreJsonData);
    const entities = entityNames(story.entityJsonData);
    const beta     = entityNames(story.betaReaderJson);

    return {
      id:         story.fanFictionId,
      title:      story.title || 'Untitled',
      summary:    story.summary || '',
      authorNote: story.authorNote || '',
      warning:    story.warning && story.warning !== 'TBU' ? story.warning : '',
      graphicsBy: story.graphicsBy ? `User #${story.graphicsBy}` : '',

      // authorDisplay returns null when no real name/username is available
      // — avoids showing raw numeric user IDs as public-facing text.
      author:   authorDisplay(story),
      authorId: story.authorId || story.userId,

      thumbnail: story.ffThumbnail || null,
      banner:    story.ffBannerThumbnail || null,

      status:    statusLabel(story.statusCode),
      statusRaw: story.statusCode,
      rating:    ratingLabel(story.rating),
      type:      typeLabel(story.fanFictionType),
      mature:    !!story.hasMaturedContent,
      featured:  !!story.featured,

      views:        story.totalViewCount   || 0,
      likes:        story.totalLikeCount   || 0,
      comments:     story.totalCommentCount || 0,
      followers:    story.totalFollowers   ?? 0,
      followCount:  story.followCount      ?? 0,
      chapterCount: story.chapterCount     ?? 0,

      createdAt:   story.createdWhen,
      publishedAt: story.publishedWhen,
      updatedAt:   story.lastUpdatedWhen,

      topicId: story.topicId || null,
      pageUrl:  story.pageUrl || null,

      tags,
      genres,
      entities,
      beta,
    };
  }, [story]);

  if (loading) return <div className={styles.screen}><LoadingState count={3} /></div>;
  if (error)   return <div className={styles.screen}><ErrorState message={error} onRetry={refetch} /></div>;
  if (!view)   return <div className={styles.screen}><EmptyState icon="📭" title="Story not found" /></div>;

  const heroImage = view.banner || view.thumbnail;
  const heroBg = heroImage
    ? `url(${heroImage}) center/cover no-repeat`
    : fallbackBg(view.title);

  // Badge count = number of non-empty secondary sections in the panel.
  const detailBadge = [
    !!view.summary,
    !!view.warning,
    !!view.authorNote,
    view.genres.length + view.tags.length > 0,
    view.entities.length > 0,
    view.beta.length > 0,
    !!view.topicId,
  ].filter(Boolean).length;

  // Wrap onChapterPress to also pass the full ordered chapters list so the
  // reader can offer prev/next navigation without a separate API call.
  function handleChapterPress(chapterId, chapterObj) {
    onChapterPress?.(chapterId, chapterObj, chapters);
  }

  // First chapter by orderNumber for the "Start Reading" CTA.
  const firstChapter = chapters.length > 0
    ? [...chapters].sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0))[0]
    : null;

  return (
    <div className={styles.screen}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroBg} style={{ background: heroBg }} />
        <div className={styles.heroScrim} />

        <div className={styles.heroBody}>
          {view.entities.length > 0 && (
            <div className={styles.fandom}>{view.entities.slice(0, 2).join(' · ')}</div>
          )}
          <h1 className={styles.title}>{view.title}</h1>

          <button
            className={styles.authorRow}
            onClick={() => view.authorId && onAuthorPress?.(view.authorId, view.author)}
            disabled={!view.authorId}
          >
            <div className={styles.authorAvatar}>
              {view.author ? view.author.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className={styles.authorMeta}>
              <span className={styles.authorLabel}>by</span>
              {/* Show real name when available; "Anonymous Author" otherwise */}
              <span className={styles.authorName}>{view.author || 'Anonymous Author'}</span>
            </div>
          </button>

          <div className={styles.badgeRow}>
            <span className={`${styles.statusBadge} ${view.statusRaw === 1 ? styles.statusComplete : styles.statusOngoing}`}>
              {view.status}
            </span>
            {view.rating   && <span className={styles.ratingBadge}>{view.rating}</span>}
            {view.type     && <span className={styles.typeBadge}>{view.type}</span>}
            {view.mature   && <span className={styles.ratingBadge}>18+</span>}
            {view.featured && <span className={styles.typeBadge}>★ Featured</span>}
          </div>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className={styles.statsStrip}>
        <StatBlock icon="📖" value={chapters.length || view.chapterCount} label="Chapters" />
        <StatBlock icon="👁"  value={formatCount(view.views)}             label="Views" />
        <StatBlock icon="♥"  value={formatCount(view.likes)}              label="Likes" />
        <StatBlock icon="👥" value={formatCount(view.followers)}          label="Follows" />
      </div>

      {/* ── Start Reading CTA — primary conversion action ────────────────── */}
      {firstChapter && (
        <div className={styles.startSection}>
          <button
            className={styles.startBtn}
            onClick={() => handleChapterPress(firstChapter.chapterId, firstChapter)}
          >
            <span className={styles.startPlay}>▶</span>
            <span className={styles.startText}>Start Reading</span>
            <span className={styles.startMeta}>
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </span>
            <span className={styles.startArrow}>→</span>
          </button>
        </div>
      )}

      {/* ── PRIMARY: Chapter list ─────────────────────────────────────────── */}
      <section className={styles.chaptersSection}>
        {/* Header shows only chapter count — status is already in the hero */}
        <div className={styles.chapterHeader}>
          <div className={styles.chapterHeading}>
            <span className={styles.chapterHeadingText}>Chapters</span>
            {chapters.length > 0 && (
              <span className={styles.chapterCount}>{chapters.length}</span>
            )}
          </div>
        </div>

        {chapters.length === 0 ? (
          <EmptyState
            icon="📖"
            title="No chapters yet"
            subtitle="The author hasn't published any chapters."
          />
        ) : (
          <div className={styles.chapterList}>
            {chapters.map((ch, i) => (
              <ChapterRow
                key={ch?.chapterId || i}
                chapter={ch}
                onPress={handleChapterPress}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── SECONDARY: Progressive-disclosure toggle ──────────────────────── */}
      <DetailsToggleButton
        isOpen={detailsOpen}
        onToggle={() => setDetailsOpen(o => !o)}
        badgeCount={detailBadge}
      />

      {/* ── SECONDARY: Collapsible details panel ──────────────────────────── */}
      <DetailsPanel
        isOpen={detailsOpen}
        view={view}
        onDiscussPress={onDiscussPress}
      />

      <div className={styles.spacer} />
    </div>
  );
}
