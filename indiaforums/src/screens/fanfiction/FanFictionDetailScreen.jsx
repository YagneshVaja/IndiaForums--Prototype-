import { useMemo } from 'react';
import styles from './FanFictionDetailScreen.module.css';
import { useFanFictionDetail } from '../../hooks/useFanFictions';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState   from '../../components/ui/ErrorState';
import EmptyState   from '../../components/ui/EmptyState';

// ── JSON-string helpers (tags / genres / entities) ─────────────────────────
// The detail payload stores these as JSON-string columns shaped
// `{"json":[{id,name,pu,uc,ct,tt}]}`. We parse defensively so a malformed
// blob never crashes the page.
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

// ── Formatters ─────────────────────────────────────────────────────────────
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

// statusCode: 0 = Ongoing, 1 = Completed
const statusLabel = (code) => (Number(code) === 1 ? 'Completed' : 'Ongoing');

// rating integer → letter grade (1=G, 2=PG, 3=T, 4=M, 5=MA)
const RATING_LABELS = { 1: 'G', 2: 'PG', 3: 'T', 4: 'M', 5: 'MA' };
const ratingLabel = (r) => {
  const n = Number(r);
  return RATING_LABELS[n] || (n ? `R${n}` : null);
};

// fanFictionType: 0 = Multi-chapter, 1 = One-shot, 2 = Short story (best-effort)
const TYPE_LABELS = { 0: 'Fan Fiction', 1: 'One-shot', 2: 'Short Story' };
const typeLabel = (t) => TYPE_LABELS[Number(t)] || null;

const authorDisplay = (raw) =>
  raw?.realName || raw?.userName || (raw?.authorId || raw?.userId ? `User #${raw.authorId || raw.userId}` : '');

// ── Fallback background for when no thumbnail exists ─────────────────────
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#1e1b4b 0%,#4c1d95 50%,#6d28d9 100%)',
  'linear-gradient(135deg,#7f1d1d 0%,#991b1b 50%,#b91c1c 100%)',
  'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#1e40af 100%)',
  'linear-gradient(135deg,#1c1917 0%,#78350f 50%,#a16207 100%)',
  'linear-gradient(135deg,#064e3b 0%,#047857 50%,#10b981 100%)',
];
function fallbackBg(seed = '') {
  const idx = String(seed).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatBlock({ icon, value, label }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statIcon}>{icon}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function ChapterRow({ chapter, onPress }) {
  const number = chapter?.orderNumber ?? '—';
  const title  = chapter?.chapterTitle || `Chapter ${number}`;
  const published = chapter?.createdWhen;
  const views    = chapter?.viewCount || 0;
  const likes    = chapter?.likeCount || 0;
  const comments = chapter?.commentCount || 0;
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
      <div className={styles.chapterArrow} aria-hidden="true">›</div>
    </button>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function FanFictionDetailScreen({ storyId, onChapterPress, onAuthorPress, onDiscussPress }) {
  const { story, chapters, loading, error, refetch } = useFanFictionDetail(storyId);

  const view = useMemo(() => {
    if (!story) return null;

    const tags     = entityNames(story.tagsJsonData);
    const genres   = entityNames(story.genreJsonData);
    const entities = entityNames(story.entityJsonData);
    const beta     = entityNames(story.betaReaderJson);

    return {
      // Identity
      id:         story.fanFictionId,
      title:      story.title || 'Untitled',
      summary:    story.summary || '',
      authorNote: story.authorNote || '',
      warning:    story.warning && story.warning !== 'TBU' ? story.warning : '',
      // graphicsBy is a userId integer in the API — render as "User #N".
      graphicsBy: story.graphicsBy ? `User #${story.graphicsBy}` : '',

      // Author
      author:   authorDisplay(story),
      authorId: story.authorId || story.userId,

      // Images
      thumbnail:  story.ffThumbnail || null,
      banner:     story.ffBannerThumbnail || null,
      hasBanner:  !!story.hasBannerThumbnail,

      // Status + classification
      status:    statusLabel(story.statusCode),
      statusRaw: story.statusCode,
      rating:    ratingLabel(story.rating),
      type:      typeLabel(story.fanFictionType),
      mature:    !!story.hasMaturedContent,
      featured:  !!story.featured,

      // Counts — surface BOTH followCount and totalFollowers since the API
      // returns them separately (one is the live count, the other is the
      // cached total — we don't know which without docs, so show both).
      views:        story.totalViewCount || 0,
      likes:        story.totalLikeCount || 0,
      comments:     story.totalCommentCount || 0,
      followers:    story.totalFollowers ?? 0,
      followCount:  story.followCount ?? 0,
      chapterCount: story.chapterCount ?? 0,

      // Dates
      createdAt:   story.createdWhen,
      publishedAt: story.publishedWhen,
      updatedAt:   story.lastUpdatedWhen,

      // Linked content
      topicId: story.topicId || null,
      pageUrl: story.pageUrl || null,

      // Related
      tags,
      genres,
      entities,
      beta,
    };
  }, [story]);

  if (loading) return <div className={styles.screen}><LoadingState count={3} /></div>;
  if (error)   return <div className={styles.screen}><ErrorState message={error} onRetry={refetch} /></div>;
  if (!view)   return <div className={styles.screen}><EmptyState icon="📭" title="Story not found" /></div>;

  // Prefer the wide banner image for the hero if the API provides one.
  const heroImage = view.banner || view.thumbnail;
  const heroBg = heroImage
    ? `url(${heroImage}) center/cover no-repeat`
    : fallbackBg(view.title);

  return (
    <div className={styles.screen}>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
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
              {view.author ? view.author.charAt(0).toUpperCase() : '?'}
            </div>
            <div className={styles.authorMeta}>
              <span className={styles.authorLabel}>by</span>
              <span className={styles.authorName}>{view.author || 'Unknown author'}</span>
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

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <div className={styles.statsStrip}>
        <StatBlock icon="📖" value={chapters.length || view.chapterCount} label="Chapters" />
        <StatBlock icon="👁" value={formatCount(view.views)}               label="Views" />
        <StatBlock icon="♥"  value={formatCount(view.likes)}               label="Likes" />
        <StatBlock icon="👥" value={formatCount(view.followers)}           label="Follows" />
      </div>

      {/* ── Discuss CTA — surfaces topicId from the API as a forum link ──── */}
      {view.topicId && (
        <button
          className={styles.discussBtn}
          onClick={() => onDiscussPress?.(view.topicId)}
        >
          💬 Discuss this story in the forum
          <span className={styles.discussArrow}>→</span>
        </button>
      )}

      {/* ── Summary ────────────────────────────────────────────────────────── */}
      {view.summary && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Summary</h2>
          <p className={styles.synopsis}>{view.summary}</p>
        </section>
      )}

      {/* ── Warning ────────────────────────────────────────────────────────── */}
      {view.warning && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚠ Warning</h2>
          <p className={styles.warning}>{view.warning}</p>
        </section>
      )}

      {/* ── Author's note ──────────────────────────────────────────────────── */}
      {view.authorNote && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Author's Note</h2>
          <p className={styles.authorNote}>{view.authorNote}</p>
        </section>
      )}

      {/* ── Genres + Tags ─────────────────────────────────────────────────── */}
      {(view.genres.length > 0 || view.tags.length > 0) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {view.genres.length > 0 ? 'Genres' : 'Tags'}
          </h2>
          <div className={styles.tagList}>
            {view.genres.map((g, i) => (
              <span key={`g-${g}-${i}`} className={styles.tag}>{g}</span>
            ))}
            {view.tags.map((t, i) => (
              <span key={`t-${t}-${i}`} className={styles.tagAlt}>{t}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Related shows / entities ──────────────────────────────────────── */}
      {view.entities.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Related</h2>
          <div className={styles.tagList}>
            {view.entities.map((e, i) => (
              <span key={`e-${e}-${i}`} className={styles.entityTag}>{e}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Beta readers — parsed from betaReaderJson when present ───────── */}
      {view.beta.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Beta Readers</h2>
          <div className={styles.tagList}>
            {view.beta.map((b, i) => (
              <span key={`b-${b}-${i}`} className={styles.tagAlt}>{b}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Details grid — every remaining field with a value ─────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        <div className={styles.detailGrid}>
          {view.publishedAt && <div className={styles.detailRow}><span>Published</span><strong>{formatDate(view.publishedAt)}</strong></div>}
          {view.createdAt   && <div className={styles.detailRow}><span>Created</span><strong>{formatDate(view.createdAt)}</strong></div>}
          {view.updatedAt   && <div className={styles.detailRow}><span>Last updated</span><strong>{formatDate(view.updatedAt)}</strong></div>}
          <div className={styles.detailRow}><span>Total followers</span><strong>{formatCount(view.followers)}</strong></div>
          <div className={styles.detailRow}><span>Active follows</span><strong>{formatCount(view.followCount)}</strong></div>
          <div className={styles.detailRow}><span>Comments</span><strong>{formatCount(view.comments)}</strong></div>
          <div className={styles.detailRow}><span>Chapters</span><strong>{view.chapterCount}</strong></div>
          {view.rating     && <div className={styles.detailRow}><span>Rating</span><strong>{view.rating}</strong></div>}
          {view.type       && <div className={styles.detailRow}><span>Type</span><strong>{view.type}</strong></div>}
          {view.graphicsBy && <div className={styles.detailRow}><span>Graphics by</span><strong>{view.graphicsBy}</strong></div>}
          {view.pageUrl    && <div className={styles.detailRow}><span>Page slug</span><strong>{view.pageUrl}</strong></div>}
          {view.id         && <div className={styles.detailRow}><span>Story ID</span><strong>#{view.id}</strong></div>}
        </div>
      </section>

      {/* ── Chapter list ──────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Chapters
          {chapters.length > 0 && <span className={styles.sectionCount}> · {chapters.length}</span>}
        </h2>
        {chapters.length === 0 ? (
          <EmptyState icon="📖" title="No chapters yet" subtitle="The author hasn't published any chapters." />
        ) : (
          <div className={styles.chapterList}>
            {chapters.map((ch, i) => (
              <ChapterRow
                key={ch?.chapterId || i}
                chapter={ch}
                onPress={onChapterPress}
              />
            ))}
          </div>
        )}
      </section>

      <div className={styles.spacer} />
    </div>
  );
}
