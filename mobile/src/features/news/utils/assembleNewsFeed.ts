import type { Article, Gallery, Movie, Video } from '../../../services/api';
import type { QuizItem, VisualStoryItem } from '../data/newsStaticData';

// Round-robin pool items by category. The IndiaForums API typically returns
// content category-clumped (e.g. 8 movies videos in a row, then 2 TV, then
// 2 digital). On the ALL tab, the first videos / photos / stories rail
// would otherwise look mono-category even though the user clicked "ALL".
// Interleaving pulls one from each category bucket per round so every rail
// mixes categories.
//
// Stable within a category (we keep original index order inside each
// bucket), so React reconciliation stays efficient. The category key is
// supplied by the caller because Video/Gallery use `cat` and
// VisualStoryItem uses `category`.
export function interleaveByCat<T>(items: T[], getCat: (item: T) => string | null | undefined): T[] {
  if (items.length === 0) return items;
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = getCat(item) ?? '__other';
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(item);
  }
  if (buckets.size <= 1) return items; // nothing to interleave
  const lanes = Array.from(buckets.values());
  const out: T[] = [];
  let drained = 0;
  while (drained < lanes.length) {
    drained = 0;
    for (const lane of lanes) {
      const next = lane.shift();
      if (next) out.push(next);
      else drained += 1;
    }
  }
  return out;
}

// One mixed-media block is injected after every BLOCK_SIZE articles. With 4
// articles per group (1 hero + 3 compact), the user reads ~1.5 screens of
// news between each rail/quiz — close to the rhythm TOI / News18 / Inshorts
// use for their interleaved feeds.
export const BLOCK_SIZE = 4;

// Per-injection slice size for rail-style blocks (videos, photos, movies).
// Matches the visible card count in the existing horizontal rails.
export const RAIL_SLICE = 4;

// Visual-stories rails show more cards because each is narrower (110px vs
// 130-140px for videos / galleries / movies), so a single 5-card slice still
// fits the same horizontal real estate.
export const STORIES_SLICE = 5;

const ROTATION = [
  'rail-videos',
  'rail-stories',
  'card-quiz',
  'rail-photos',
  'rail-movies',
] as const;
type BlockKind = (typeof ROTATION)[number];

export type FeedItem =
  | { kind: 'hero-article';    key: string; article: Article }
  | { kind: 'compact-article'; key: string; article: Article }
  | { kind: 'rail-videos';     key: string; videos: Video[] }
  | { kind: 'rail-stories';    key: string; stories: VisualStoryItem[] }
  | { kind: 'card-quiz';       key: string; quiz: QuizItem }
  | { kind: 'rail-photos';     key: string; galleries: Gallery[] }
  | { kind: 'rail-movies';     key: string; movies: Movie[] };

export interface FeedPools {
  videos: Video[];
  // Visual stories are now stored flat (with a per-story `category` tag)
  // instead of as pre-chunked groups, so the assembler can slice a fresh
  // STORIES_SLICE-sized window each rail. This mirrors how videos / photos
  // / movies are consumed and keeps category filtering simple.
  stories: VisualStoryItem[];
  quizzes: QuizItem[];
  galleries: Gallery[];
  movies: Movie[];
}

interface Cursor {
  videos: number;
  stories: number;
  quizzes: number;
  galleries: number;
  movies: number;
}

// Build the next media block of the given kind. Returns null when the pool
// has no more *fresh* items locally — the rotation walker handles that by
// trying the next kind. Pagination happens at the hook layer: as more pages
// land, `pools` grows and previously-null kinds start producing again.
function buildBlock(
  kind: BlockKind,
  slot: number,
  pools: FeedPools,
  cursor: Cursor,
): FeedItem | null {
  switch (kind) {
    case 'rail-videos': {
      const slice = pools.videos.slice(cursor.videos, cursor.videos + RAIL_SLICE);
      if (slice.length === 0) return null;
      cursor.videos += slice.length;
      return { kind, key: `videos-${slot}`, videos: slice };
    }
    case 'rail-stories': {
      const slice = pools.stories.slice(cursor.stories, cursor.stories + STORIES_SLICE);
      if (slice.length === 0) return null;
      cursor.stories += slice.length;
      return { kind, key: `stories-${slot}`, stories: slice };
    }
    case 'card-quiz': {
      const quiz = pools.quizzes[cursor.quizzes];
      if (!quiz) return null;
      cursor.quizzes += 1;
      return { kind, key: `quiz-${slot}-${quiz.id}`, quiz };
    }
    case 'rail-photos': {
      const slice = pools.galleries.slice(cursor.galleries, cursor.galleries + RAIL_SLICE);
      if (slice.length === 0) return null;
      cursor.galleries += slice.length;
      return { kind, key: `photos-${slot}`, galleries: slice };
    }
    case 'rail-movies': {
      const slice = pools.movies.slice(cursor.movies, cursor.movies + RAIL_SLICE);
      if (slice.length === 0) return null;
      cursor.movies += slice.length;
      return { kind, key: `movies-${slot}`, movies: slice };
    }
  }
}

// Lace articles + media blocks into a single heterogeneous feed.
//
// Article rhythm: every BLOCK_SIZE-th article is a `hero-article`, the rest
// are `compact-article`. After each group of BLOCK_SIZE articles, one media
// block is injected. The block kind rotates through ROTATION; if the current
// kind has nothing fresh, we step to the next kind so a single dry pool can't
// leave a "hole". Pools are NEVER cycled — once exhausted locally, that kind
// stops appearing until the hook layer fetches the next API page and pools
// grow back.
export function assembleNewsFeed({
  articles,
  pools,
}: {
  articles: Article[];
  pools: FeedPools;
}): FeedItem[] {
  const out: FeedItem[] = [];
  const cursor: Cursor = { videos: 0, stories: 0, quizzes: 0, galleries: 0, movies: 0 };
  let rotationIdx = 0;
  let slot = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const inGroup = i % BLOCK_SIZE;

    out.push(
      inGroup === 0
        ? { kind: 'hero-article',    key: `h-${a.id}`, article: a }
        : { kind: 'compact-article', key: `c-${a.id}`, article: a },
    );

    if (inGroup === BLOCK_SIZE - 1) {
      // Walk the rotation up to one full lap looking for a kind whose pool
      // still has fresh content. First match wins; rotation cursor advances
      // past it so the *next* slot starts after this one.
      for (let attempt = 0; attempt < ROTATION.length; attempt++) {
        const kind = ROTATION[(rotationIdx + attempt) % ROTATION.length];
        const block = buildBlock(kind, slot, pools, cursor);
        if (block) {
          out.push(block);
          rotationIdx = (rotationIdx + attempt + 1) % ROTATION.length;
          slot += 1;
          break;
        }
      }
    }
  }

  return out;
}
