/* ─────────────────────────────────────────────────────────────────────────────
   Normalisation helpers for /webstories API responses.

   Real shapes verified live on 2026-04-08 against api2.indiaforums.com.
   Every field captured from the API is mapped below. Fields marked [skip]
   are intentionally dropped — they're backend-only (cache, moderation, audit
   timestamps) and have no user-facing meaning.

   ── GET /webstories?page&pageSize ──────────────────────────────────────────
     { data: WebStory[], totalCount: number }

     Each list item:
       storyId                 → story.id
       title                   → story.title
       pageUrl                 → story.slug (+ .pageUrl alias)
       publishedWhen           → story.publishedWhen + relative timeAgo
       hasThumbnail            → used in cover-image fallback
       thumbnailUrl            → story.coverImage
       webStoryUpdateChecksum  [skip] cache invalidation metadata

     totalCount → synthesised pagination { hasNextPage, totalPages, ... }

   ── GET /webstories/{storyId}/details ───────────────────────────────────────
     FLAT object (no envelope). Author fields sit at the top level alongside
     the story block. `slidesJson` is a JSON STRING that must be parsed.

     Author block (top-level):
       userId                  → author.userId
       userName                → author.userName (fallback for displayName)
       realName                → author.realName (primary displayName)
       avatarAccent            → author.avatarColor + author.avatarBg
       groupName               → author.groupName (rendered as badge)
       groupId                 [skip] id not user-facing
       avatarType              [skip] no avatar image URL exposed
       updateChecksum          [skip] cache metadata

     Story block (top-level):
       storyId                 → story.id
       title                   → story.title
       pageUrl                 → story.slug
       description             → story.description (rendered on cover slide)
       hasThumbnail            → cover-image conditional
       thumbnailUrl            → story.coverImage
       publishedWhen           → story.publishedWhen + timeAgo
       theme                   → story.theme (passed through; purpose TBD)
       featured                → story.featured (renders "Featured" badge)
       authorByLine            → story.authorByLine (captured verbatim)
       slidesJson              → JSON.parse → Slide[] (see below)
       slidesHtmlContent       [skip] legacy HTML, always null
       createdWhen             [skip] audit timestamp
       lastEditedWhen          [skip] audit timestamp
       statusCode              [skip] publish state
       approvedBy              [skip] moderator user id
       webStoryUpdateChecksum  [skip] cache metadata

   ── Parsed slidesJson → Slide[] ─────────────────────────────────────────────
     Each slide (after JSON.parse):
       slideNumber             → slide.order (used for sort)
       slideType               → slide.slideType + slide.isCover
       title                   → slide.title
       description             → slide.caption
       image                   → slide.imageUrl
       video                   → slide.videoUrl
       mediaSource / imageCredits / videoCredits / imageSource
                               → slide.mediaCredit (first non-empty)
       url                     → slide.actionUrl
       urlAction               → slide.actionLabel ("readMore" → "Read more")
       timer (seconds)         → slide.durationMs (default 5000)
       author                  → slide.slideAuthor (per-slide byline override)
       authorByLine            → slide.authorByLine (boolean flag)
       attribute               → slide.attribute (free-form, unclear purpose)
       pollId / quizId         → slide.pollId / slide.quizId
       question                → slide.title (poll/quiz branch)
       options                 → slide.extra.options (poll/quiz branch)
       fact                    → slide.caption (fact branch)
       quote / cite            → slide.title / slide.caption (quote branch)
       listicle                → slide.caption (listicle branch)
       listItems               → slide.extra.items (listicle branch)
       animation               [skip] style hint, no mapping yet

   slideType values observed in live data: "cover-slide", "default-slide".
   Field hints suggest variants "quote", "fact", "listicle", "poll", "quiz";
   branches exist for all of them. Unknown types fall back to title/desc.
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Fallback gradient palette — deterministically picked from id when a story
 * has no thumbnail (`hasThumbnail: false`) so the UI never breaks.
 */
const FALLBACK_GRADIENTS = [
  'linear-gradient(160deg,#7c3aed,#ec4899)',
  'linear-gradient(160deg,#1e3a8a,#3b82f6)',
  'linear-gradient(160deg,#7f1d1d,#ef4444)',
  'linear-gradient(160deg,#064e3b,#10b981)',
  'linear-gradient(160deg,#78350f,#f59e0b)',
  'linear-gradient(160deg,#0f172a,#0ea5e9)',
  'linear-gradient(160deg,#831843,#db2777)',
  'linear-gradient(160deg,#134e4a,#14b8a6)',
];

function gradientFor(id) {
  const n = Number(id) || 0;
  const idx = Math.abs(n) % FALLBACK_GRADIENTS.length;
  return FALLBACK_GRADIENTS[idx];
}

function initialsOf(name) {
  if (!name) return 'IF';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * "2026-04-01T10:00:00Z" → "3 days ago" / "2 months ago" / "just now"
 */
export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Build an author object from the top-level user fields on a details
 * response. Returns sensible defaults so the player never renders blank.
 */
function buildAuthor(raw) {
  if (!raw) return null;
  const userName = raw.userName || '';
  const realName = raw.realName || '';
  const displayName = realName || userName || 'India Forums';
  const accent = raw.avatarAccent || '#3558F0';
  return {
    userId: raw.userId ?? null,
    userName,
    realName,
    displayName,
    groupName: raw.groupName || '',
    initials: initialsOf(displayName),
    // The API gives a single accent colour; the player uses it as a flat
    // background behind initials. No avatar image URL is provided.
    avatarColor: accent,
    avatarBg: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
  };
}

/**
 * Normalise a list-endpoint story (very sparse — title, slug, time, cover).
 *
 * The list endpoint does NOT return author, category, slide count, view
 * count, or description — those only come from /details. UI built on this
 * function should not assume those fields exist.
 */
export function transformWebStory(raw) {
  if (!raw) return null;
  const id = raw.storyId ?? raw.id ?? raw.webStoryId;
  const title = raw.title ?? raw.storyTitle ?? '';
  const slug = raw.pageUrl ?? raw.slug ?? '';
  const hasThumb =
    raw.hasThumbnail === false ? false : Boolean(raw.thumbnailUrl ?? raw.coverImage);
  const coverImage = hasThumb
    ? (raw.thumbnailUrl ?? raw.coverImage ?? raw.thumbnail ?? '')
    : '';
  const publishedWhen =
    raw.publishedWhen ?? raw.publishedAt ?? raw.createdWhen ?? raw.createdAt;

  return {
    id,
    title,
    slug,
    pageUrl: slug,
    coverImage,
    coverBg: coverImage ? null : gradientFor(id),
    publishedWhen,
    timeAgo: relativeTime(publishedWhen),
    // The list endpoint never has these — kept for shape stability so UI
    // checks like `story.author && ...` don't blow up.
    author: null,
    description: '',
    featured: Boolean(raw.featured),
  };
}

/**
 * Convert one slide from the parsed slidesJson into the player's shape.
 *
 * Branches per slideType so quote/fact/listicle/poll slides surface their
 * own primary text. Slides with no media fall back to the deterministic
 * gradient so the player never shows a blank black panel.
 */
export function transformSlide(raw, index, storyId) {
  if (!raw) return null;

  const slideType = (raw.slideType || 'default-slide').toLowerCase();
  const order = raw.slideNumber ?? raw.orderNumber ?? index;
  const image = raw.image ?? raw.imageUrl ?? '';
  const video = raw.video ?? raw.videoUrl ?? '';

  let mediaType = 'text';
  if (video) mediaType = 'video';
  else if (image) mediaType = 'image';

  // Pick the slide's primary title + body based on its type.
  let title = raw.title || '';
  let caption = raw.description || '';
  let extra = null;

  if (slideType.includes('quote')) {
    title = raw.quote || raw.title || '';
    caption = raw.cite ? `— ${raw.cite}` : raw.description || '';
  } else if (slideType.includes('fact')) {
    title = raw.title || 'Did you know?';
    caption = raw.fact || raw.description || '';
  } else if (slideType.includes('listicle')) {
    title = raw.title || '';
    caption = raw.listicle || raw.description || '';
    extra = { kind: 'list', items: Array.isArray(raw.listItems) ? raw.listItems : [] };
  } else if (slideType.includes('poll') || slideType.includes('quiz')) {
    title = raw.question || raw.title || '';
    caption = raw.description || '';
    extra = {
      kind: slideType.includes('quiz') ? 'quiz' : 'poll',
      options: Array.isArray(raw.options) ? raw.options : [],
    };
  }

  return {
    id: `${storyId}-${order}`,
    order,
    slideType,
    isCover: slideType === 'cover-slide',
    mediaType,
    imageUrl: image,
    videoUrl: video,
    title,
    caption,
    extra,
    // Per-slide credits (e.g. "Osen", "Instagram/Netflix Korea ").
    mediaCredit:
      raw.mediaSource ||
      raw.imageCredits ||
      raw.videoCredits ||
      raw.imageSource ||
      '',
    // Optional outbound link from the slide (e.g. "readMore" CTA). The
    // API sometimes sets `urlAction` without a `url` — in that case the
    // player hides the CTA rather than rendering a dead button.
    actionUrl: raw.url || '',
    actionLabel:
      raw.urlAction === 'readMore' ? 'Read more' : raw.urlAction || '',
    // Per-slide author override — used on quote/citation slides where the
    // speaker differs from the story author. All null in the current
    // sample; captured here so nothing is silently dropped.
    slideAuthor: raw.author || '',
    // Boolean flag the backend uses to toggle whether the slide shows an
    // explicit byline. Meaning not fully documented; captured verbatim.
    authorByLine: Boolean(raw.authorByLine),
    // Free-form attribute string from the CMS. Purpose unclear (null in
    // all sampled slides). Captured for shape coverage.
    attribute: raw.attribute || '',
    // Poll/quiz IDs needed to submit an answer via a future endpoint.
    pollId: raw.pollId ?? null,
    quizId: raw.quizId ?? null,
    // Player auto-play uses 5s/slide unless API specifies otherwise.
    durationMs: Number(raw.timer) > 0 ? Number(raw.timer) * 1000 : 5000,
    // Gradient fallback for slides with no image/video.
    bg: gradientFor(`${storyId}-${order}`),
  };
}

/**
 * Normalise a full /details response into { story, slides }.
 *
 * The details endpoint is FLAT (no envelope) and `slidesJson` is a JSON
 * string that we must parse. This function is the single source of truth
 * for that parsing — UI components consume only the normalised output.
 */
export function transformStoryDetails(raw, fallbackId) {
  if (!raw) return { story: null, slides: [] };

  // Some shapes nest under `data` — be defensive.
  const root = raw.webStory ?? raw.story ?? raw.data?.webStory ?? raw.data ?? raw;

  const id = root.storyId ?? fallbackId;
  const title = root.title || '';
  const slug = root.pageUrl || '';
  const description = root.description || '';
  const hasThumb =
    root.hasThumbnail === false ? false : Boolean(root.thumbnailUrl);
  const coverImage = hasThumb ? (root.thumbnailUrl || '') : '';
  const publishedWhen = root.publishedWhen || root.createdWhen || null;

  const author = buildAuthor(root);

  // slidesJson may be a STRING (canonical), an already-parsed array, or
  // missing entirely. Handle all three.
  let rawSlides = [];
  if (typeof root.slidesJson === 'string' && root.slidesJson.trim()) {
    try {
      rawSlides = JSON.parse(root.slidesJson);
    } catch (e) {
      // Malformed JSON — surface as no slides rather than crashing.
      console.error('[webstories] Failed to parse slidesJson', e);
      rawSlides = [];
    }
  } else if (Array.isArray(root.slidesJson)) {
    rawSlides = root.slidesJson;
  } else if (Array.isArray(root.slides)) {
    rawSlides = root.slides;
  }

  const slides = rawSlides
    .map((s, i) => transformSlide(s, i, id))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  const story = {
    id,
    title,
    slug,
    pageUrl: slug,
    description,
    coverImage,
    coverBg: coverImage ? null : gradientFor(id),
    publishedWhen,
    timeAgo: relativeTime(publishedWhen),
    author,
    featured: Boolean(root.featured),
    theme: root.theme ?? null,
    // Story-level byline flag from the CMS. Always "0"/"false" in the
    // current sample; captured here so nothing is silently dropped.
    authorByLine: root.authorByLine ?? null,
  };

  return { story, slides };
}
