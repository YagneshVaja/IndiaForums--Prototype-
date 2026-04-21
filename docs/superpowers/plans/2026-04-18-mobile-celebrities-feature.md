# Mobile Celebrities Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the prototype's Celebrities list + detail screens to the React Native mobile app with real API integration (with mock fallback) and prototype-faithful UI.

**Architecture:** New `mobile/src/features/celebrities/` feature folder (screens / components / hooks / utils). Shared API client in `mobile/src/services/api.ts` gets expanded types and three new fetchers. Two new routes in `HomeStack`. Entry from Home stories strip ⭐ Celebrities.

**Tech Stack:** React Native 0.83 + Expo SDK 55, TypeScript, React Query 5, React Navigation 7, `expo-image`, `react-native-gesture-handler`, `Ionicons`.

**Testing reality:** This repo has no unit-test runner wired up (`jest` is listed but no tests exist and no jest config). Verification per task is: `npm run tsc` (typecheck), `npm run lint`, and at the end a manual Expo smoke check. No TDD — but we keep tasks small and commit frequently.

**Commit policy:** The user's memory says "always ask before committing." Every commit step in this plan is gated on user confirmation — do not run `git commit` without approval.

**Spec reference:** [2026-04-18-mobile-celebrities-feature-design.md](../specs/2026-04-18-mobile-celebrities-feature-design.md)

---

## File Structure

```
mobile/src/
├── features/celebrities/             (NEW)
│   ├── screens/
│   │   ├── CelebritiesScreen.tsx
│   │   └── CelebrityDetailScreen.tsx
│   ├── components/
│   │   ├── TrendBadge.tsx
│   │   ├── Initials.tsx
│   │   ├── HeroCard.tsx
│   │   ├── RunnerCard.tsx
│   │   ├── RankRow.tsx
│   │   ├── CelebSkeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── ErrorBlock.tsx
│   │   ├── StatsBar.tsx
│   │   ├── AboutCard.tsx
│   │   ├── BioSection.tsx
│   │   ├── FactsCard.tsx
│   │   ├── SocialMediaCard.tsx
│   │   ├── BioSkeleton.tsx
│   │   ├── FanCard.tsx
│   │   ├── ImageLightbox.tsx
│   │   ├── BiographyTab.tsx
│   │   └── FansTab.tsx
│   ├── hooks/
│   │   ├── useCelebritiesRanking.ts
│   │   ├── useCelebrityBiography.ts
│   │   └── useCelebrityFans.ts
│   └── utils/
│       ├── constants.ts
│       ├── formatCount.ts
│       ├── formatDate.ts
│       └── parseBioHtml.ts
├── services/api.ts                   (MODIFY — expand types + 3 fetchers)
├── navigation/
│   ├── types.ts                      (MODIFY — Celebrities + CelebrityProfile param)
│   └── HomeStack.tsx                 (MODIFY — register 2 screens)
└── features/home/components/
    └── StoriesStrip.tsx              (MODIFY — wire ⭐ → navigation)

docs/tracking/mobile-development-progress.md   (MODIFY — mark 10. Celebrities 2/2)
```

---

## Task 1: Expand `Celebrity` types + add Biography/Fan types in `api.ts`

**Files:**
- Modify: `mobile/src/services/api.ts` — replace `Celebrity` interface (line ~134-140), add new interfaces after it

**Rationale:** The current `Celebrity` type is minimal (5 fields). The UI needs rank, trend, shortDesc, etc. All the new types live here because `api.ts` already owns all public shapes for mobile.

- [ ] **Step 1: Open `mobile/src/services/api.ts` and replace the `Celebrity` interface**

Replace:
```ts
export interface Celebrity {
  id: string;
  name: string;
  profileImageUrl: string;
  category: string;
  followersCount: number;
}
```

With:
```ts
export type CelebCategoryId = 'bollywood' | 'television' | 'creators' | 'all';

export interface Celebrity {
  id: string;
  name: string;
  shortDesc: string;
  thumbnail: string | null;
  pageUrl: string;
  shareUrl: string;
  category: CelebCategoryId;
  rank: number;
  prevRank: number;
  trend: 'up' | 'down' | 'stable';
  rankDiff: number;
}

export interface CelebritiesPayload {
  categories: {
    bollywood: Celebrity[];
    television: Celebrity[];
    creators: Celebrity[];
  };
  celebrities: Celebrity[];
  rankStartDate: string;
  rankEndDate: string;
  pagination: CelebPagination;
}

export interface CelebPagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CelebrityBiography {
  id: string;
  name: string;
  fullName: string;
  shortDesc: string;
  thumbnail: string | null;
  pageUrl: string;
  bioHtml: string;
  rank: number;
  prevRank: number;
  isFan: boolean;
  rankStartDate: string;
  rankEndDate: string;
  // Stats
  articleCount: number;
  fanCount: number;
  videoCount: number;
  viewCount: number;
  photoCount: number;
  topicsCount: number;
  // Structured personInfos
  nicknames: string[];
  profession: string[];
  birthDate: string;
  birthPlace: string;
  zodiacSign: string;
  nationality: string;
  height: string;
  weight: string;
  debut: string[];
  hometown: string;
  education: string;
  maritalStatus: string;
  spouse: string[];
  children: string[];
  parents: string[];
  siblings: string[];
  religion: string;
  netWorth: string;
  favFilms: string[];
  favActors: string[];
  favFood: string[];
  hobbies: string[];
  awards: string[];
  // Social
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface CelebrityFan {
  id: string;
  name: string;
  avatarAccent: string;
  level: string;
  groupId: number;
}

export interface CelebrityFansPayload {
  fans: CelebrityFan[];
  pagination: CelebPagination;
}
```

- [ ] **Step 2: Verify types compile**

Run from `mobile/`:
```bash
npm run tsc
```

Expected: TS errors will appear in any file referencing the old `profileImageUrl`/`followersCount` fields. Note them — we'll fix those call sites in Task 3.

If the only errors are the existing call sites using the removed fields (search: `profileImageUrl`, `followersCount`), that's expected — proceed.

- [ ] **Step 3: Ask the user before committing**

```bash
# DO NOT RUN WITHOUT ASKING
git add mobile/src/services/api.ts
git commit -m "feat(mobile/celebrities): expand Celebrity type and add Biography/Fan shapes"
```

---

## Task 2: Port transform helpers to `api.ts`

**Files:**
- Modify: `mobile/src/services/api.ts` — replace existing `fetchCelebrities` and add helpers

- [ ] **Step 1: Add transform helpers above the fetchers (e.g., in the "Transform helpers" section around line ~145)**

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformCelebrity(raw: any, category: CelebCategoryId): Celebrity {
  const diff = (raw.rankLastWeek || 0) - (raw.rankCurrentWeek || 0);
  let trend: Celebrity['trend'] = 'stable';
  if (diff > 0) trend = 'up';
  else if (diff < 0) trend = 'down';
  return {
    id: String(raw.personId ?? ''),
    name: raw.displayName ?? '',
    shortDesc: raw.shortDesc ?? '',
    thumbnail: raw.imageUrl ?? null,
    pageUrl: raw.pageUrl ?? '',
    shareUrl: raw.shareUrl ?? '',
    category,
    rank: raw.rankCurrentWeek ?? 0,
    prevRank: raw.rankLastWeek ?? 0,
    trend,
    rankDiff: Math.abs(diff),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBiography(data: any): CelebrityBiography | null {
  const person = data?.person;
  if (!person) return null;
  const infos = data?.personInfos ?? [];
  const infoMap: Record<string, string[]> = {};
  for (const info of infos) {
    const key = info.personInfoTypeName;
    if (!infoMap[key]) infoMap[key] = [];
    infoMap[key].push(info.contents);
  }
  const imageUrl =
    person.imageUrl ||
    (person.hasThumbnail
      ? `https://img.indiaforums.com/person/320x240/${Math.floor(person.personId / 10000)}/${String(person.personId).padStart(4, '0')}-${person.pageUrl}.webp?c=${person.updateChecksum}`
      : null);
  const first = (k: string) => (infoMap[k] ?? [])[0] ?? '';
  const list  = (k: string) => infoMap[k] ?? [];
  return {
    id: String(person.personId ?? ''),
    name: person.displayName ?? person.fullName ?? '',
    fullName: person.fullName ?? '',
    shortDesc: person.shortDesc ?? '',
    thumbnail: imageUrl,
    pageUrl: person.pageUrl ?? '',
    bioHtml: person.biographyCachedContent ?? '',
    rank: person.rankCurrentWeek ?? 0,
    prevRank: person.rankLastWeek ?? 0,
    isFan: data?.isFan ?? false,
    rankStartDate: data?.rankStartDate ?? '',
    rankEndDate: data?.rankEndDate ?? '',
    articleCount: person.articleCount ?? 0,
    fanCount: person.fanCount ?? 0,
    videoCount: person.videoCount ?? 0,
    viewCount: person.viewCount ?? 0,
    photoCount: person.photoCount ?? 0,
    topicsCount: person.topicsCount ?? 0,
    nicknames: list('NickName(s)'),
    profession: list('Profession(s)'),
    birthDate: first('Date Of Birth'),
    birthPlace: first('Birthplace'),
    zodiacSign: first('Zodiac Sign'),
    nationality: first('Nationality'),
    height: first('Height (approx.)'),
    weight: first('Weight (approx.)'),
    debut: list('Debut'),
    hometown: first('Hometown'),
    education: first('Educational Qualification'),
    maritalStatus: first('Marital Status'),
    spouse: list('Spouse(s)'),
    children: list('Children'),
    parents: list('Parents'),
    siblings: list('Siblings'),
    religion: first('Religion'),
    netWorth: first('Net Worth'),
    favFilms: list('Film(s)'),
    favActors: list('Actor(s)'),
    favFood: list('Food'),
    hobbies: list('Hobbies'),
    awards: list('Awards/Honours'),
    facebook: person.facebook ?? '',
    twitter: person.twitter ?? '',
    instagram: person.instagram ?? '',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFan(raw: any): CelebrityFan {
  return {
    id: String(raw.userId ?? ''),
    name: raw.userName ?? 'Fan',
    avatarAccent: raw.avatarAccent ?? '#3558F0',
    level: raw.groupName ?? '',
    groupId: raw.groupId ?? 0,
  };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run tsc`
Expected: still the pre-existing errors from Task 1 (usages of the removed `profileImageUrl`/`followersCount`), plus no new errors.

- [ ] **Step 3: Ask the user before committing**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile/celebrities): port transformCelebrity, transformBiography, transformFan"
```

---

## Task 3: Replace `fetchCelebrities` + add biography & fans fetchers (with mock fallbacks)

**Files:**
- Modify: `mobile/src/services/api.ts` — replace `fetchCelebrities` (around line 366-381); replace `getMockCelebrities` with a new mock that matches the new payload shape; add two new fetchers and two new mock helpers
- Also fix any remaining call-site that referenced the old `Celebrity.profileImageUrl` / `followersCount` (if any found during tsc).

- [ ] **Step 1: Replace `fetchCelebrities` with the new implementation**

```ts
export async function fetchCelebrities(
  page: number = 1,
  pageSize: number = 20,
): Promise<CelebritiesPayload> {
  try {
    const { data } = await apiClient.get('/celebrities', {
      params: { pageNumber: page, pageSize },
    });
    const categoryKeys: Array<{ id: 'bollywood' | 'television' | 'creators'; key: string }> = [
      { id: 'bollywood',  key: 'bollywoodCelebrities'  },
      { id: 'television', key: 'televisionCelebrities' },
      { id: 'creators',   key: 'creators'              },
    ];
    const categories = {
      bollywood: [] as Celebrity[],
      television: [] as Celebrity[],
      creators: [] as Celebrity[],
    };
    for (const { id, key } of categoryKeys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr: any[] = data?.[key] ?? [];
      categories[id] = arr.map(c => transformCelebrity(c, id));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat: any[] = data?.celebrities ?? [];
    const celebrities = flat.map(c => transformCelebrity(c, 'all'));
    const pagination: CelebPagination = {
      currentPage:     data?.pageNumber ?? page,
      pageSize:        data?.pageSize   ?? pageSize,
      totalPages:      data?.totalPages ?? 1,
      totalCount:      data?.totalCount ?? 0,
      hasNextPage:     data?.hasNextPage ?? false,
      hasPreviousPage: data?.hasPreviousPage ?? false,
    };
    return {
      categories,
      celebrities,
      rankStartDate: data?.rankStartDate ?? '',
      rankEndDate:   data?.rankEndDate   ?? '',
      pagination,
    };
  } catch (err) {
    const e = err as { response?: { status: number; data: unknown }; message?: string };
    console.warn('[API] fetchCelebrities failed:', e?.response?.status, e?.response?.data ?? e?.message);
    return getMockCelebritiesPayload();
  }
}

export async function fetchCelebrityBiography(personId: string): Promise<CelebrityBiography | null> {
  try {
    const { data } = await apiClient.get(`/celebrities/${personId}/biography`);
    return transformBiography(data);
  } catch (err) {
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] fetchCelebrityBiography failed:', e?.response?.status, e?.message);
    return getMockBiography(personId);
  }
}

export async function fetchCelebrityFans(
  personId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<CelebrityFansPayload> {
  try {
    const { data } = await apiClient.get(`/celebrities/${personId}/fans`, {
      params: { pageNumber: page, pageSize },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawFans: any[] = data?.fans ?? [];
    return {
      fans: rawFans.map(transformFan),
      pagination: {
        currentPage:     data?.pageNumber ?? page,
        pageSize:        data?.pageSize   ?? pageSize,
        totalPages:      data?.totalPages ?? 1,
        totalCount:      data?.totalCount ?? 0,
        hasNextPage:     data?.hasNextPage ?? false,
        hasPreviousPage: data?.hasPreviousPage ?? false,
      },
    };
  } catch (err) {
    const e = err as { response?: { status: number }; message?: string };
    console.warn('[API] fetchCelebrityFans failed:', e?.response?.status, e?.message);
    return getMockFans(personId, page, pageSize);
  }
}
```

- [ ] **Step 2: Replace `getMockCelebrities` with `getMockCelebritiesPayload` and add mock biography + fans**

Delete the old `getMockCelebrities` function (around line 533). Add:

```ts
function mockCeleb(
  personId: number, displayName: string, rankCurrentWeek: number,
  rankLastWeek: number, imageSeed: string, shortDesc: string,
): // eslint-disable-next-line @typescript-eslint/no-explicit-any
any {
  return {
    personId,
    displayName,
    rankCurrentWeek,
    rankLastWeek,
    imageUrl: `https://picsum.photos/seed/${imageSeed}/400/500`,
    pageUrl: imageSeed,
    shareUrl: '',
    shortDesc,
  };
}

function getMockCelebritiesPayload(): CelebritiesPayload {
  const bolly = [
    mockCeleb(1, 'Shah Rukh Khan', 1, 2, 'srk',   'Bollywood superstar, 500+ films'),
    mockCeleb(2, 'Deepika Padukone', 2, 1, 'dp',  'Actress, producer'),
    mockCeleb(3, 'Ranbir Kapoor',  3, 4, 'rk',    'Actor, Animal, Sanju'),
    mockCeleb(4, 'Alia Bhatt',     4, 3, 'ab',    'Actress, producer'),
    mockCeleb(5, 'Ranveer Singh',  5, 6, 'rs',    'Actor'),
    mockCeleb(6, 'Kareena Kapoor', 6, 5, 'kk',    'Actress'),
    mockCeleb(7, 'Hrithik Roshan', 7, 7, 'hr',    'Actor, dancer'),
    mockCeleb(8, 'Katrina Kaif',   8, 8, 'kat',   'Actress'),
  ].map(c => transformCelebrity(c, 'bollywood'));
  const tv = [
    mockCeleb(10, 'Ankita Lokhande', 1, 1, 'al', 'Pavitra Rishta, Bigg Boss 17'),
    mockCeleb(11, 'Divyanka Tripathi', 2, 3, 'dt', 'Yeh Hai Mohabbatein lead'),
    mockCeleb(12, 'Karan Kundrra', 3, 2, 'kku', 'Bigg Boss 15 runner-up'),
    mockCeleb(13, 'Shivangi Joshi', 4, 5, 'sj',  'Yeh Rishta Kya Kehlata Hai'),
    mockCeleb(14, 'Rubina Dilaik',  5, 4, 'rd',  'Shakti, Bigg Boss 14 winner'),
  ].map(c => transformCelebrity(c, 'television'));
  const creators = [
    mockCeleb(20, 'CarryMinati',   1, 2, 'cm', 'YouTuber, roaster, 40M+ subs'),
    mockCeleb(21, 'Bhuvan Bam',    2, 1, 'bb', 'BB Ki Vines'),
    mockCeleb(22, 'Ashish Chanchlani', 3, 3, 'ac', 'Vines creator'),
    mockCeleb(23, 'Prajakta Koli', 4, 4, 'pk', 'MostlySane'),
  ].map(c => transformCelebrity(c, 'creators'));
  return {
    categories: { bollywood: bolly, television: tv, creators },
    celebrities: [...bolly, ...tv, ...creators].map(c => ({ ...c, category: 'all' as const })),
    rankStartDate: '2026-04-10T00:00:00Z',
    rankEndDate:   '2026-04-17T00:00:00Z',
    pagination: {
      currentPage: 1, pageSize: 20, totalPages: 1, totalCount: 17,
      hasNextPage: false, hasPreviousPage: false,
    },
  };
}

function getMockBiography(personId: string): CelebrityBiography {
  return {
    id: personId,
    name: 'Shah Rukh Khan',
    fullName: 'Shah Rukh Khan',
    shortDesc: "Bollywood's King Khan — actor, producer, philanthropist.",
    thumbnail: 'https://picsum.photos/seed/srk/600/500',
    pageUrl: 'shah-rukh-khan',
    bioHtml: '',
    rank: 1, prevRank: 2, isFan: false,
    rankStartDate: '2026-04-10T00:00:00Z',
    rankEndDate:   '2026-04-17T00:00:00Z',
    articleCount: 1240, fanCount: 890_000, videoCount: 320,
    viewCount: 12_500_000, photoCount: 4500, topicsCount: 870,
    nicknames: ['SRK', 'King Khan'],
    profession: ['Actor', 'Producer'],
    birthDate: '1965-11-02',
    birthPlace: 'New Delhi, India',
    zodiacSign: 'Scorpio',
    nationality: 'Indian',
    height: '5\'8"',
    weight: '75',
    debut: ['Deewana (1992)'],
    hometown: 'Mumbai',
    education: 'MA Mass Communications',
    maritalStatus: 'Married',
    spouse: ['Gauri Khan'],
    children: ['Aryan', 'Suhana', 'AbRam'],
    parents: ['Taj Mohammed Khan', 'Lateef Fatima'],
    siblings: ['Shehnaz Lalarukh'],
    religion: 'Islam',
    netWorth: '$770 million',
    favFilms: ['Dilwale Dulhania Le Jayenge'],
    favActors: ['Dilip Kumar'],
    favFood: ['Tandoori chicken'],
    hobbies: ['Reading', 'Football'],
    awards: ['Padma Shri', 'National Film Award (4x)'],
    facebook: 'iamsrk',
    twitter: 'iamsrk',
    instagram: 'iamsrk',
  };
}

function getMockFans(personId: string, page: number, pageSize: number): CelebrityFansPayload {
  const accents = ['#3558F0', '#E11D48', '#059669', '#F59E0B', '#7C3AED', '#EC4899'];
  const levels = ['Super Fan', 'Active Fan', 'Dedicated', 'New Fan'];
  const fans: CelebrityFan[] = Array.from({ length: pageSize }, (_, i) => {
    const idx = (page - 1) * pageSize + i;
    return {
      id: `${personId}-fan-${idx}`,
      name: `Fan${idx + 1}`,
      avatarAccent: accents[idx % accents.length],
      level: levels[idx % levels.length],
      groupId: idx % levels.length,
    };
  });
  return {
    fans,
    pagination: {
      currentPage: page, pageSize,
      totalPages: 5, totalCount: 100,
      hasNextPage: page < 5, hasPreviousPage: page > 1,
    },
  };
}
```

- [ ] **Step 3: Fix any call site that uses old `Celebrity.profileImageUrl` or `followersCount`**

Run:
```bash
# use Grep tool, not bash
```
Grep (via Grep tool) for `profileImageUrl` and `followersCount` in `mobile/src/`. At the time of writing, the only references are in `api.ts` mocks (being replaced in this task). If the typecheck reports additional call sites, update them to use `thumbnail` and drop the followers field (no UI consumes it).

- [ ] **Step 4: Verify types compile cleanly**

Run: `npm run tsc`
Expected: **0 errors.**

- [ ] **Step 5: Verify lint passes**

Run: `npm run lint`
Expected: 0 errors (warnings acceptable).

- [ ] **Step 6: Ask the user before committing**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile/celebrities): replace fetchers + add biography/fans with mock fallbacks"
```

---

## Task 4: Update navigation types and placeholder route

**Files:**
- Modify: `mobile/src/navigation/types.ts` (line ~44-61)
- Modify: `mobile/src/navigation/HomeStack.tsx` (line ~16-39)

- [ ] **Step 1: Edit `mobile/src/navigation/types.ts` — add `Celebrities` and change `CelebrityProfile` param**

Replace the `HomeStackParamList`:
```ts
export type HomeStackParamList = {
  HomeMain: undefined;
  ArticleDetail: { id: string };
  CategoryFeed: { category: string };
  Celebrities: undefined;
  CelebrityProfile: { celebrity: Celebrity };
  FanFiction: undefined;
  FanFictionDetail: { id: string };
  ChapterReader: { fanFictionId: string; chapterId: string };
  FanFictionAuthors: undefined;
  AuthorFollowers: { authorId: string };
  Shorts: undefined;
  WebStories: undefined;
  WebStoryPlayer: { id: string };
  Quizzes: undefined;
  QuizPlayer: { id: string };
  QuizResult: { id: string; score: number };
  QuizLeaderboard: { id: string };
};
```

Add import at the top:
```ts
import type { Celebrity } from '../services/api';
```

- [ ] **Step 2: Edit `mobile/src/navigation/HomeStack.tsx` — register `Celebrities` route**

Add inside `<Stack.Navigator>` after `CategoryFeed`:
```tsx
<Stack.Screen name="Celebrities" component={PlaceholderScreen} />
```

(We wire the real screen in later tasks once built. Keeping placeholder here avoids a broken navigator.)

- [ ] **Step 3: Verify typecheck**

Run: `npm run tsc`
Expected: **0 errors.** (The `Celebrity` type now has the fields the nav param needs.)

- [ ] **Step 4: Ask the user before committing**

```bash
git add mobile/src/navigation/types.ts mobile/src/navigation/HomeStack.tsx
git commit -m "feat(mobile/nav): add Celebrities route + typed CelebrityProfile param"
```

---

## Task 5: Utilities — constants, formatters, bio HTML parser

**Files:**
- Create: `mobile/src/features/celebrities/utils/constants.ts`
- Create: `mobile/src/features/celebrities/utils/formatCount.ts`
- Create: `mobile/src/features/celebrities/utils/formatDate.ts`
- Create: `mobile/src/features/celebrities/utils/parseBioHtml.ts`

- [ ] **Step 1: Create `constants.ts`**

```ts
// mobile/src/features/celebrities/utils/constants.ts
export const CELEB_CATEGORIES = [
  { id: 'bollywood',  label: 'Bollywood'  },
  { id: 'television', label: 'Television' },
  { id: 'creators',   label: 'Creators'   },
] as const;

export type CelebCategoryTab = typeof CELEB_CATEGORIES[number]['id'];

export const SECTION_ICONS: Record<string, string> = {
  'Bio':                          '👤',
  'Physical Stats':               '📏',
  'Career':                       '🎬',
  'Personal Life':                '📋',
  'Relationships':                '💑',
  'Family':                       '👨‍👩‍👧‍👦',
  'Favourites':                   '❤️',
  'Personal Belongings / Assets': '🏎️',
  'Money Factor':                 '💰',
  'Awards/Honours':               '🏆',
};
```

- [ ] **Step 2: Create `formatCount.ts`**

```ts
// mobile/src/features/celebrities/utils/formatCount.ts
export function formatCount(n: number | null | undefined): string {
  if (!n || n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
```

- [ ] **Step 3: Create `formatDate.ts`**

```ts
// mobile/src/features/celebrities/utils/formatDate.ts
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parse(d: string): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function formatWeekRange(startStr: string, endStr: string): string {
  const start = parse(startStr);
  const end = parse(endStr);
  if (!start || !end) return '';
  const s = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const e = `${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  return `${s} – ${e}`;
}

export function formatLongDate(dateStr: string): string {
  const dt = parse(dateStr);
  if (!dt) return dateStr;
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}
```

- [ ] **Step 4: Create `parseBioHtml.ts` (ported from prototype)**

```ts
// mobile/src/features/celebrities/utils/parseBioHtml.ts
export interface BioSectionImage { src: string; alt: string }
export interface BioSectionItem  { label: string; value: string }
export interface BioSection {
  title: string;
  items: BioSectionItem[];
  images: BioSectionImage[];
}

const IMG_REGEX = /<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValue(raw: string): string {
  return raw
    .replace(/<a[^>]*class="celeb-about__info-edit"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<img[^>]*icons\.svg[^>]*>/gi, '')
    .replace(/<\/?p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h4[^>]*>/gi, '')
    .replace(/<\/h4>/gi, ': ')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function parseBioHtml(html: string | undefined | null): BioSection[] {
  if (!html) return [];
  const sections: BioSection[] = [];
  const headingRegex = /<h3[^>]*class="celeb-about__info-itemtitle"[^>]*>([\s\S]*?)<\/h3>/g;
  const headings: Array<{ title: string; pos: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRegex.exec(html)) !== null) {
    headings.push({ title: stripHtml(m[1]), pos: m.index });
  }

  function extractImages(chunk: string): BioSectionImage[] {
    const imgs: BioSectionImage[] = [];
    IMG_REGEX.lastIndex = 0;
    let im: RegExpExecArray | null;
    while ((im = IMG_REGEX.exec(chunk)) !== null) {
      if (!im[1].includes('icons.svg') && !im[1].includes('sign')) {
        imgs.push({ src: im[1], alt: im[2] || '' });
      }
    }
    return imgs;
  }

  function extractItems(chunk: string): BioSectionItem[] {
    const items: BioSectionItem[] = [];
    const subRegex = /<div class="celeb-about__info-subitemtitle">\s*([\s\S]*?)\s*<\/div>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
    let sub: RegExpExecArray | null;
    while ((sub = subRegex.exec(chunk)) !== null) {
      const label = stripHtml(sub[1]);
      const rawValue = cleanValue(sub[2]);
      const value = stripHtml(rawValue).replace(/^-\s*/, '');
      if (label && value) items.push({ label, value });
    }
    const h4Regex = /<h4[^>]*>\s*([\s\S]*?)\s*<\/h4>\s*<div class="celeb-about__info-subitemcontent">\s*([\s\S]*?)\s*<\/div>/g;
    let h4: RegExpExecArray | null;
    while ((h4 = h4Regex.exec(chunk)) !== null) {
      const label = stripHtml(h4[1]).replace(/:$/, '');
      const value = stripHtml(cleanValue(h4[2])).replace(/^-\s*/, '');
      if (label && value && !items.some(i => i.label === label)) {
        items.push({ label, value });
      }
    }
    return items;
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].pos;
    const end = i + 1 < headings.length ? headings[i + 1].pos : html.length;
    const chunk = html.substring(start, end);
    const items = extractItems(chunk);
    const images = extractImages(chunk);
    if (items.length > 0 || images.length > 0) {
      sections.push({ title: headings[i].title, items, images });
    }
  }
  return sections;
}
```

- [ ] **Step 5: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/utils
git commit -m "feat(mobile/celebrities): add utils (constants, formatters, bio parser)"
```

---

## Task 6: React Query hooks

**Files:**
- Create: `mobile/src/features/celebrities/hooks/useCelebritiesRanking.ts`
- Create: `mobile/src/features/celebrities/hooks/useCelebrityBiography.ts`
- Create: `mobile/src/features/celebrities/hooks/useCelebrityFans.ts`

- [ ] **Step 1: Create `useCelebritiesRanking.ts`**

```ts
// mobile/src/features/celebrities/hooks/useCelebritiesRanking.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCelebrities } from '../../../services/api';

export function useCelebritiesRanking() {
  return useQuery({
    queryKey: ['celebrities', 'ranking'],
    queryFn: () => fetchCelebrities(1, 20),
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Create `useCelebrityBiography.ts`**

```ts
// mobile/src/features/celebrities/hooks/useCelebrityBiography.ts
import { useQuery } from '@tanstack/react-query';
import { fetchCelebrityBiography } from '../../../services/api';

export function useCelebrityBiography(personId: string) {
  return useQuery({
    queryKey: ['celebrity', 'biography', personId],
    queryFn: () => fetchCelebrityBiography(personId),
    staleTime: 30 * 60 * 1000,
    enabled: !!personId,
  });
}
```

- [ ] **Step 3: Create `useCelebrityFans.ts`**

```ts
// mobile/src/features/celebrities/hooks/useCelebrityFans.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchCelebrityFans } from '../../../services/api';

export function useCelebrityFans(personId: string) {
  return useInfiniteQuery({
    queryKey: ['celebrity', 'fans', personId],
    queryFn: ({ pageParam = 1 }) => fetchCelebrityFans(personId, pageParam, 20),
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000,
    enabled: !!personId,
  });
}
```

- [ ] **Step 4: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/hooks
git commit -m "feat(mobile/celebrities): add React Query hooks (ranking, biography, fans)"
```

---

## Task 7: Shared UI primitives — `TrendBadge`, `Initials`, `Spinner`, `ErrorBlock`

**Files:**
- Create: `mobile/src/features/celebrities/components/TrendBadge.tsx`
- Create: `mobile/src/features/celebrities/components/Initials.tsx`
- Create: `mobile/src/features/celebrities/components/Spinner.tsx`
- Create: `mobile/src/features/celebrities/components/ErrorBlock.tsx`

- [ ] **Step 1: Create `TrendBadge.tsx`**

```tsx
// mobile/src/features/celebrities/components/TrendBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  trend: 'up' | 'down' | 'stable';
  rankDiff: number;
  variant?: 'default' | 'small';
}

export default function TrendBadge({ trend, rankDiff, variant = 'default' }: Props) {
  const small = variant === 'small';
  const baseStyle = small ? styles.small : styles.default;

  if (trend === 'up') {
    return (
      <View style={[baseStyle, styles.up]}>
        <Text style={[styles.text, small && styles.textSmall, styles.upText]}>▲ {rankDiff}</Text>
      </View>
    );
  }
  if (trend === 'down') {
    return (
      <View style={[baseStyle, styles.down]}>
        <Text style={[styles.text, small && styles.textSmall, styles.downText]}>▼ {rankDiff}</Text>
      </View>
    );
  }
  return (
    <View style={[baseStyle, styles.stable]}>
      <Text style={[styles.text, small && styles.textSmall, styles.stableText]}>—</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  default: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  small:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  up:      { backgroundColor: 'rgba(16,185,129,0.15)' },
  down:    { backgroundColor: 'rgba(225,29,72,0.15)' },
  stable:  { backgroundColor: 'rgba(120,120,120,0.15)' },
  text:      { fontSize: 11, fontWeight: '700' },
  textSmall: { fontSize: 10 },
  upText:     { color: '#047857' },
  downText:   { color: '#BE123C' },
  stableText: { color: '#666' },
});
```

- [ ] **Step 2: Create `Initials.tsx`**

```tsx
// mobile/src/features/celebrities/components/Initials.tsx
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface Props {
  name: string;
  style?: TextStyle;
}

export default function Initials({ name, style }: Props) {
  const letters = name
    .split(' ')
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return <Text style={[styles.text, style]}>{letters}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 3: Create `Spinner.tsx`**

```tsx
// mobile/src/features/celebrities/components/Spinner.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props { text?: string }

export default function Spinner({ text = 'Loading...' }: Props) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#3558F0" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', gap: 10 },
  text: { fontSize: 13, color: '#5F5F5F', fontWeight: '500' },
});
```

- [ ] **Step 4: Create `ErrorBlock.tsx`**

```tsx
// mobile/src/features/celebrities/components/ErrorBlock.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props { message: string; onRetry?: () => void }

export default function ErrorBlock({ message, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.btn}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', gap: 10 },
  icon: { fontSize: 32 },
  message: { fontSize: 14, color: '#5F5F5F', textAlign: 'center' },
  btn: {
    marginTop: 8, paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 10, backgroundColor: '#3558F0',
  },
  btnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
```

- [ ] **Step 5: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/components
git commit -m "feat(mobile/celebrities): add TrendBadge, Initials, Spinner, ErrorBlock primitives"
```

---

## Task 8: List cards — `HeroCard`, `RunnerCard`, `RankRow`

**Files:**
- Create: `mobile/src/features/celebrities/components/HeroCard.tsx`
- Create: `mobile/src/features/celebrities/components/RunnerCard.tsx`
- Create: `mobile/src/features/celebrities/components/RankRow.tsx`

- [ ] **Step 1: Create `HeroCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/HeroCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';

interface Props { celeb: Celebrity; onPress: (c: Celebrity) => void }

export default function HeroCard({ celeb, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(celeb)}>
      {celeb.thumbnail ? (
        <ImageBackground
          source={{ uri: celeb.thumbnail }}
          style={styles.img}
          imageStyle={styles.imgInner}
        >
          <Content celeb={celeb} />
        </ImageBackground>
      ) : (
        <View style={[styles.img, styles.fallback]}>
          <Initials name={celeb.name} style={{ fontSize: 56 }} />
          <Content celeb={celeb} />
        </View>
      )}
    </Pressable>
  );
}

function Content({ celeb }: { celeb: Celebrity }) {
  return (
    <>
      {/* bottom dark scrim via two overlapping translucent layers */}
      <View style={styles.scrim} />
      {/* top bar */}
      <View style={styles.topBar}>
        <View style={styles.crown}>
          <Text style={styles.crownIcon}>👑</Text>
          <Text style={styles.crownText}>#1 This Week</Text>
        </View>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} />
      </View>
      {/* bottom info */}
      <View style={styles.bottom}>
        <Text style={styles.name} numberOfLines={1}>{celeb.name}</Text>
        {celeb.shortDesc ? (
          <Text style={styles.desc} numberOfLines={2}>{celeb.shortDesc}</Text>
        ) : null}
        {celeb.prevRank > 0 ? (
          <Text style={styles.prev}>was #{celeb.prevRank}</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginTop: 12,
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  img: { aspectRatio: 4/5, justifyContent: 'flex-start' },
  imgInner: { borderRadius: 18 },
  fallback: { backgroundColor: '#3558F0', alignItems: 'center', justifyContent: 'center' },
  scrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '55%', backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12,
  },
  crown: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.95)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  crownIcon: { fontSize: 13 },
  crownText: { fontSize: 11, fontWeight: '800', color: '#1A1A1A' },
  bottom: {
    position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4,
  },
  name: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  desc: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '500' },
  prev: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
});
```

- [ ] **Step 2: Create `RunnerCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/RunnerCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';

interface Props { celeb: Celebrity; onPress: (c: Celebrity) => void }

export default function RunnerCard({ celeb, onPress }: Props) {
  const medal = celeb.rank === 2 ? '🥈' : '🥉';
  const borderColor = celeb.rank === 2 ? '#C0C0C0' : '#CD7F32';
  return (
    <Pressable style={[styles.card, { borderColor }]} onPress={() => onPress(celeb)}>
      <View style={styles.imgWrap}>
        {celeb.thumbnail ? (
          <ImageBackground source={{ uri: celeb.thumbnail }} style={styles.img} imageStyle={styles.imgInner}>
            <View style={styles.scrim} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{medal} #{celeb.rank}</Text>
            </View>
          </ImageBackground>
        ) : (
          <View style={[styles.img, styles.fallback]}>
            <Initials name={celeb.name} style={{ fontSize: 32 }} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{medal} #{celeb.rank}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{celeb.name}</Text>
        {celeb.shortDesc ? <Text style={styles.desc} numberOfLines={2}>{celeb.shortDesc}</Text> : null}
        <View style={styles.meta}>
          <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} variant="small" />
          {celeb.prevRank > 0 ? <Text style={styles.prev}>was #{celeb.prevRank}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 14, borderWidth: 2,
    backgroundColor: '#FFFFFF', overflow: 'hidden',
  },
  imgWrap: { position: 'relative' },
  img: { width: '100%', aspectRatio: 1 },
  imgInner: {},
  fallback: { backgroundColor: '#3558F0', alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', backgroundColor: 'rgba(0,0,0,0.4)' },
  badge: {
    position: 'absolute', left: 8, bottom: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  body: { padding: 10, gap: 4 },
  name: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.2 },
  desc: { fontSize: 11, color: '#5F5F5F', fontWeight: '500' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  prev: { fontSize: 10, color: '#7A7A7A', fontWeight: '600' },
});
```

- [ ] **Step 3: Create `RankRow.tsx`**

```tsx
// mobile/src/features/celebrities/components/RankRow.tsx
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';

interface Props { celeb: Celebrity; onPress: (c: Celebrity) => void }

export default function RankRow({ celeb, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={() => onPress(celeb)}>
      <View style={styles.num}>
        <Text style={styles.numText}>{celeb.rank}</Text>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} variant="small" />
      </View>

      <View style={styles.avatar}>
        {celeb.thumbnail ? (
          <Image source={{ uri: celeb.thumbnail }} style={styles.avatarImg} />
        ) : (
          <Initials name={celeb.name} style={{ fontSize: 14, color: '#FFFFFF' }} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{celeb.name}</Text>
        {celeb.shortDesc ? (
          <Text style={styles.desc} numberOfLines={1}>{celeb.shortDesc}</Text>
        ) : celeb.prevRank > 0 ? (
          <Text style={styles.prev}>Last week: #{celeb.prevRank}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color="#B0B0B0" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  pressed: { backgroundColor: '#F5F6F7' },
  num: { width: 42, alignItems: 'center', gap: 3 },
  numText: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3558F0', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  desc: { fontSize: 12, color: '#5F5F5F' },
  prev: { fontSize: 11, color: '#7A7A7A' },
});
```

- [ ] **Step 4: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/components
git commit -m "feat(mobile/celebrities): add HeroCard, RunnerCard, RankRow list cards"
```

---

## Task 9: `CelebSkeleton`

**Files:**
- Create: `mobile/src/features/celebrities/components/CelebSkeleton.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
// mobile/src/features/celebrities/components/CelebSkeleton.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function CelebSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.catBar}>
        {[1, 2, 3].map(i => <View key={i} style={styles.pill} />)}
      </View>
      <View style={styles.hero} />
      <View style={styles.runnerRow}>
        <View style={styles.runner} />
        <View style={styles.runner} />
      </View>
      {[1, 2, 3, 4].map(i => <View key={i} style={styles.row} />)}
    </View>
  );
}

const base = '#E6E8EB';
const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingTop: 10, gap: 10 },
  catBar: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  pill: { width: 80, height: 32, borderRadius: 16, backgroundColor: base },
  hero: { width: '100%', aspectRatio: 4/5, borderRadius: 18, backgroundColor: base },
  runnerRow: { flexDirection: 'row', gap: 10 },
  runner: { flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: base },
  row: { width: '100%', height: 68, borderRadius: 10, backgroundColor: base },
});
```

- [ ] **Step 2: Typecheck & lint**

Run: `npm run tsc && npm run lint`

- [ ] **Step 3: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/components/CelebSkeleton.tsx
git commit -m "feat(mobile/celebrities): add CelebSkeleton loader"
```

---

## Task 10: `CelebritiesScreen` + wire into `HomeStack` + `StoriesStrip`

**Files:**
- Create: `mobile/src/features/celebrities/screens/CelebritiesScreen.tsx`
- Modify: `mobile/src/navigation/HomeStack.tsx` — replace placeholder for `Celebrities`
- Modify: `mobile/src/features/home/components/StoriesStrip.tsx` — wire tap

- [ ] **Step 1: Create `CelebritiesScreen.tsx`**

```tsx
// mobile/src/features/celebrities/screens/CelebritiesScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Celebrity } from '../../../services/api';
import { useCelebritiesRanking } from '../hooks/useCelebritiesRanking';
import { CELEB_CATEGORIES, CelebCategoryTab } from '../utils/constants';
import { formatWeekRange } from '../utils/formatDate';
import HeroCard from '../components/HeroCard';
import RunnerCard from '../components/RunnerCard';
import RankRow from '../components/RankRow';
import CelebSkeleton from '../components/CelebSkeleton';
import ErrorBlock from '../components/ErrorBlock';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Celebrities'>;

export default function CelebritiesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeCat, setActiveCat] = useState<CelebCategoryTab>('bollywood');
  const { data, isLoading, error, refetch, isRefetching } = useCelebritiesRanking();

  const celebs = useMemo<Celebrity[]>(() => {
    if (!data) return [];
    return data.categories[activeCat] ?? [];
  }, [data, activeCat]);

  const hero = celebs[0] ?? null;
  const runners = celebs.slice(1, 3);
  const rest = celebs.slice(3);

  const weekLabel = data ? formatWeekRange(data.rankStartDate, data.rankEndDate) : '';

  const handlePress = (celebrity: Celebrity) =>
    navigation.navigate('CelebrityProfile', { celebrity });

  return (
    <View style={styles.screen}>
      <TopNavBack title="Celebrities" onBack={() => navigation.goBack()} />

      {isLoading && !data ? (
        <CelebSkeleton />
      ) : error && !data ? (
        <ErrorBlock
          message={error instanceof Error ? error.message : 'Failed to load celebrities'}
          onRetry={() => refetch()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3558F0" />}
        >
          {/* Category bar */}
          <View style={styles.catBar}>
            <View style={styles.catSegment}>
              {CELEB_CATEGORIES.map(cat => {
                const isActive = activeCat === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setActiveCat(cat.id)}
                    style={[styles.catBtn, isActive && styles.catBtnActive]}
                  >
                    <Text style={[styles.catLabel, isActive && styles.catLabelActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {weekLabel ? (
              <View style={styles.weekRow}>
                <View style={styles.weekDot} />
                <Text style={styles.weekText}>{weekLabel}</Text>
              </View>
            ) : null}
          </View>

          {celebs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No celebrities found</Text>
            </View>
          ) : (
            <>
              {hero ? <HeroCard celeb={hero} onPress={handlePress} /> : null}

              {runners.length > 0 ? (
                <View style={styles.runnerRow}>
                  {runners.map(c => (
                    <RunnerCard key={c.id} celeb={c} onPress={handlePress} />
                  ))}
                </View>
              ) : null}

              {rest.length > 0 ? (
                <View style={styles.rankList}>
                  <Text style={styles.rankHeader}>Rankings</Text>
                  {rest.map(c => <RankRow key={c.id} celeb={c} onPress={handlePress} />)}
                </View>
              ) : null}
            </>
          )}
          <View style={styles.spacer} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  catBar: { backgroundColor: '#FFFFFF', paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  catSegment: {
    flexDirection: 'row', marginHorizontal: 14, padding: 4, gap: 4,
    backgroundColor: '#EEF0F2', borderRadius: 12,
  },
  catBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 9,
  },
  catBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  catLabel: { fontSize: 12, fontWeight: '700', color: '#666' },
  catLabelActive: { color: '#3558F0' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16 },
  weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3558F0' },
  weekText: { fontSize: 11, fontWeight: '600', color: '#5F5F5F' },
  runnerRow: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 12 },
  rankList: {
    marginTop: 16, marginHorizontal: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  rankHeader: {
    fontSize: 14, fontWeight: '800', color: '#1A1A1A', letterSpacing: -0.2,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
  },
  empty: { padding: 48, alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: '#5F5F5F', fontWeight: '500' },
  spacer: { height: 40 },
});
```

- [ ] **Step 2: Edit `mobile/src/navigation/HomeStack.tsx` — replace Celebrities placeholder**

Add import at top:
```tsx
import CelebritiesScreen from '../features/celebrities/screens/CelebritiesScreen';
```

Change:
```tsx
<Stack.Screen name="Celebrities" component={PlaceholderScreen} />
```
to:
```tsx
<Stack.Screen name="Celebrities" component={CelebritiesScreen} />
```

- [ ] **Step 3: Edit `mobile/src/features/home/components/StoriesStrip.tsx` — wire ⭐ Celebrities tap**

Replace the current `onItemPress` prop-only implementation so the component can navigate itself:

```tsx
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';

const STORIES = [
  { id: 1, label: 'Celebrities', emoji: '⭐', bg: '#FFF7ED', target: 'Celebrities' },
  { id: 2, label: 'Videos',      emoji: '🎬', bg: '#EFF6FF' },
  { id: 3, label: 'Galleries',   emoji: '🖼️', bg: '#F0FDF4' },
  { id: 4, label: 'Fan Fictions',emoji: '📖', bg: '#FDF4FF' },
  { id: 5, label: 'Quizzes',     emoji: '❓', bg: '#FFF1F2' },
  { id: 6, label: 'Shorts',      emoji: '⚡', bg: '#FFFBEB' },
  { id: 7, label: 'Web Stories', emoji: '🌐', bg: '#F0F9FF' },
] as const;

type Story = typeof STORIES[number];
type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  onItemPress?: (story: Story) => void;
}

export default function StoriesStrip({ onItemPress }: Props) {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = (s: Story) => {
    if ('target' in s && s.target === 'Celebrities') {
      navigation.navigate('Celebrities');
      return;
    }
    onItemPress?.(s);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.strip}
    >
      {STORIES.map(s => (
        <Pressable key={s.id} style={styles.item} onPress={() => handlePress(s)}>
          <View style={styles.ring}>
            <View style={[styles.innerCircle, { backgroundColor: s.bg }]}>
              <Text style={styles.emoji}>{s.emoji}</Text>
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>{s.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { backgroundColor: '#FFFFFF' },
  row: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    gap: 12, flexDirection: 'row', alignItems: 'center',
  },
  item: { width: 68, alignItems: 'center', gap: 5 },
  ring: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#3558F0',
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: {
    width: 51, height: 51, borderRadius: 25.5,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  label: {
    fontSize: 10, fontWeight: '600', color: '#5F5F5F',
    textAlign: 'center', maxWidth: 68,
  },
});
```

- [ ] **Step 4: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 5: Smoke check**

Start the dev server:
```bash
cd mobile && npm start
```
Load in Expo Go or simulator. From Home, tap ⭐ Celebrities → expect ranking list (with mock data if offline): Bollywood hero + 2 runners + list. Switch tabs: Television / Creators. Tap any card → expect (placeholder) CelebrityProfile screen.

- [ ] **Step 6: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/screens/CelebritiesScreen.tsx \
        mobile/src/navigation/HomeStack.tsx \
        mobile/src/features/home/components/StoriesStrip.tsx
git commit -m "feat(mobile/celebrities): add CelebritiesScreen and wire Home → Celebrities"
```

---

## Task 11: Biography tab child components — `StatsBar`, `AboutCard`, `BioSection`, `FactsCard`, `SocialMediaCard`, `BioSkeleton`

**Files:**
- Create: `mobile/src/features/celebrities/components/StatsBar.tsx`
- Create: `mobile/src/features/celebrities/components/AboutCard.tsx`
- Create: `mobile/src/features/celebrities/components/BioSection.tsx`
- Create: `mobile/src/features/celebrities/components/FactsCard.tsx`
- Create: `mobile/src/features/celebrities/components/SocialMediaCard.tsx`
- Create: `mobile/src/features/celebrities/components/BioSkeleton.tsx`

- [ ] **Step 1: `StatsBar.tsx`**

```tsx
// mobile/src/features/celebrities/components/StatsBar.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { CelebrityBiography } from '../../../services/api';
import { formatCount } from '../utils/formatCount';

interface Props { biography: CelebrityBiography }

export default function StatsBar({ biography }: Props) {
  const items = [
    biography.fanCount     > 0 && { icon: '👥', val: formatCount(biography.fanCount),     label: 'Fans' },
    biography.articleCount > 0 && { icon: '📰', val: formatCount(biography.articleCount), label: 'Articles' },
    biography.videoCount   > 0 && { icon: '🎬', val: formatCount(biography.videoCount),   label: 'Videos' },
    biography.photoCount   > 0 && { icon: '📸', val: formatCount(biography.photoCount),   label: 'Photos' },
    biography.viewCount    > 0 && { icon: '👁', val: formatCount(biography.viewCount),    label: 'Views' },
    biography.topicsCount  > 0 && { icon: '💬', val: formatCount(biography.topicsCount),  label: 'Topics' },
  ].filter(Boolean) as Array<{ icon: string; val: string; label: string }>;

  if (items.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map(s => (
        <View key={s.label} style={styles.chip}>
          <Text style={styles.icon}>{s.icon}</Text>
          <Text style={styles.val}>{s.val}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#EEF0F2',
  },
  icon: { fontSize: 13 },
  val: { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  label: { fontSize: 11, fontWeight: '600', color: '#7A7A7A' },
});
```

- [ ] **Step 2: `AboutCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/AboutCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { text: string }

export default function AboutCard({ text }: Props) {
  if (!text) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginBottom: 10, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF0F2',
  },
  text: { fontSize: 13, lineHeight: 20, color: '#333' },
});
```

- [ ] **Step 3: `BioSection.tsx`**

```tsx
// mobile/src/features/celebrities/components/BioSection.tsx
import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { BioSection as BioSectionType, BioSectionImage } from '../utils/parseBioHtml';
import { SECTION_ICONS } from '../utils/constants';

interface Props {
  section: BioSectionType;
  onImagePress: (images: BioSectionImage[], index: number) => void;
}

export default function BioSection({ section, onImagePress }: Props) {
  const icon = SECTION_ICONS[section.title] ?? '📌';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{section.title}</Text>
      </View>

      {section.items.length > 0 ? (
        <View style={styles.body}>
          {section.items.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {section.images.length > 0 ? (
        <View style={styles.imgGrid}>
          {section.images.map((img, i) => (
            <Pressable
              key={i}
              style={styles.imgWrap}
              onPress={() => onImagePress(section.images, i)}
            >
              <Image source={{ uri: img.src }} style={styles.img} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF0F2',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F6F7',
  },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  body: { padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 110, fontSize: 12, fontWeight: '600', color: '#7A7A7A' },
  value: { flex: 1, fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  imgWrap: {
    width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F5F6F7',
  },
  img: { width: '100%', height: '100%' },
});
```

- [ ] **Step 4: `FactsCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/FactsCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface FactItem { label: string; value: string }

interface Props { title: string; icon: string; items: Array<FactItem | false | null | undefined> }

export default function FactsCard({ title, icon, items }: Props) {
  const filtered = items.filter(Boolean) as FactItem[];
  if (filtered.length === 0) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        {filtered.map(f => (
          <View key={f.label} style={styles.row}>
            <Text style={styles.label}>{f.label}</Text>
            <Text style={styles.value}>{f.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF0F2', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F6F7',
  },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  body: { padding: 14, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  label: { width: 110, fontSize: 12, fontWeight: '600', color: '#7A7A7A' },
  value: { flex: 1, fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
});
```

- [ ] **Step 5: `SocialMediaCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/SocialMediaCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  instagram: string;
  twitter: string;
  facebook: string;
}

export default function SocialMediaCard({ instagram, twitter, facebook }: Props) {
  if (!instagram && !twitter && !facebook) return null;
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🌐</Text>
        <Text style={styles.title}>Social Media</Text>
      </View>
      <View style={styles.list}>
        {instagram ? <Row platform="Instagram" handle={`@${instagram}`} color="#E1306C" badge="📷" /> : null}
        {twitter   ? <Row platform="X (Twitter)" handle={`@${twitter}`}  color="#000000" badge="𝕏" />   : null}
        {facebook  ? <Row platform="Facebook" handle={facebook}          color="#1877F2" badge="f" />   : null}
      </View>
    </View>
  );
}

function Row({ platform, handle, color, badge }: { platform: string; handle: string; color: string; badge: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.platform}>{platform}</Text>
        <Text style={styles.handle}>{handle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#EEF0F2', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F6F7',
  },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  list: { padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  platform: { fontSize: 12, fontWeight: '700', color: '#5F5F5F' },
  handle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
});
```

- [ ] **Step 6: `BioSkeleton.tsx`**

```tsx
// mobile/src/features/celebrities/components/BioSkeleton.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BioSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        {[1, 2, 3, 4].map(i => <View key={i} style={styles.stat} />)}
      </View>
      {[1, 2].map(i => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHead} />
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.lineShort} />
        </View>
      ))}
    </View>
  );
}

const base = '#E6E8EB';
const styles = StyleSheet.create({
  wrap: { padding: 14, gap: 14 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, height: 40, borderRadius: 12, backgroundColor: base },
  card: { padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 8, borderWidth: 1, borderColor: '#EEF0F2' },
  cardHead: { width: '60%', height: 14, borderRadius: 6, backgroundColor: base, marginBottom: 6 },
  line:      { width: '100%', height: 10, borderRadius: 5, backgroundColor: base },
  lineShort: { width: '70%',  height: 10, borderRadius: 5, backgroundColor: base },
});
```

- [ ] **Step 7: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 8: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/components
git commit -m "feat(mobile/celebrities): add bio tab child components (stats, sections, facts, social, skeleton)"
```

---

## Task 12: `BiographyTab` assembly

**Files:**
- Create: `mobile/src/features/celebrities/components/BiographyTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
// mobile/src/features/celebrities/components/BiographyTab.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useCelebrityBiography } from '../hooks/useCelebrityBiography';
import { parseBioHtml, BioSectionImage } from '../utils/parseBioHtml';
import { formatLongDate } from '../utils/formatDate';
import StatsBar from './StatsBar';
import AboutCard from './AboutCard';
import BioSection from './BioSection';
import FactsCard from './FactsCard';
import SocialMediaCard from './SocialMediaCard';
import BioSkeleton from './BioSkeleton';
import ErrorBlock from './ErrorBlock';
import ImageLightbox from './ImageLightbox';

interface Props { personId: string }

export default function BiographyTab({ personId }: Props) {
  const { data: biography, isLoading, error } = useCelebrityBiography(personId);
  const [lightbox, setLightbox] = useState<{ images: BioSectionImage[]; index: number } | null>(null);

  const sections = useMemo(
    () => parseBioHtml(biography?.bioHtml),
    [biography?.bioHtml],
  );

  const openLightbox = useCallback((images: BioSectionImage[], index: number) => {
    setLightbox({ images, index });
  }, []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  if (isLoading) return <BioSkeleton />;
  if (error)     return <ErrorBlock message={error instanceof Error ? error.message : 'Failed to load biography'} />;
  if (!biography) return <ErrorBlock message="No biography found" />;

  const hasParsed = sections.length > 0;
  const join = (arr: string[]) => (arr.length ? arr.join(', ') : '');

  return (
    <View style={{ paddingBottom: 40 }}>
      <StatsBar biography={biography} />

      <AboutCard text={biography.shortDesc} />

      {hasParsed
        ? sections.map((s, i) => (
            <BioSection key={i} section={s} onImagePress={openLightbox} />
          ))
        : (
          <>
            <FactsCard title="Personal Info" icon="👤" items={[
              biography.profession.length ? { label: 'Profession', value: join(biography.profession) } : false,
              biography.nicknames.length  ? { label: 'Nicknames',  value: join(biography.nicknames) }  : false,
              biography.birthDate  ? { label: 'Date of Birth', value: formatLongDate(biography.birthDate) } : false,
              biography.birthPlace ? { label: 'Birthplace',    value: biography.birthPlace } : false,
              biography.zodiacSign ? { label: 'Zodiac Sign',   value: biography.zodiacSign } : false,
              biography.nationality ? { label: 'Nationality',  value: biography.nationality } : false,
              biography.hometown   ? { label: 'Hometown',      value: biography.hometown } : false,
              biography.religion   ? { label: 'Religion',      value: biography.religion } : false,
            ]} />
            <FactsCard title="Physical" icon="📏" items={[
              biography.height ? { label: 'Height', value: biography.height } : false,
              biography.weight ? { label: 'Weight', value: `${biography.weight} kg` } : false,
            ]} />
            <FactsCard title="Career" icon="🎬" items={[
              biography.education     ? { label: 'Qualification', value: biography.education } : false,
              biography.debut.length  ? { label: 'Debut',         value: join(biography.debut) } : false,
              biography.netWorth      ? { label: 'Net Worth',     value: biography.netWorth } : false,
            ]} />
            <FactsCard title="Family" icon="👨‍👩‍👧‍👦" items={[
              biography.maritalStatus ? { label: 'Status',   value: biography.maritalStatus } : false,
              biography.spouse.length   ? { label: 'Spouse',   value: join(biography.spouse) } : false,
              biography.children.length ? { label: 'Children', value: join(biography.children) } : false,
              biography.parents.length  ? { label: 'Parents',  value: join(biography.parents) } : false,
            ]} />
            <FactsCard title="Favorites" icon="❤️" items={[
              biography.favFilms.length  ? { label: 'Films',   value: join(biography.favFilms) }  : false,
              biography.favActors.length ? { label: 'Actors',  value: join(biography.favActors) } : false,
              biography.favFood.length   ? { label: 'Food',    value: join(biography.favFood) }   : false,
              biography.hobbies.length   ? { label: 'Hobbies', value: join(biography.hobbies) }   : false,
            ]} />
          </>
        )
      }

      <SocialMediaCard
        instagram={biography.instagram}
        twitter={biography.twitter}
        facebook={biography.facebook}
      />

      {lightbox ? (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={closeLightbox}
        />
      ) : null}
    </View>
  );
}
```

**Note:** `ImageLightbox` doesn't exist yet — the import will error on typecheck. We create it in Task 14. Skip `tsc` here; next task fixes it.

- [ ] **Step 2: Don't commit yet.** Proceed to Task 13 (FansTab) and Task 14 (ImageLightbox), then typecheck and commit together in Task 15.

---

## Task 13: `FansTab` + `FanCard`

**Files:**
- Create: `mobile/src/features/celebrities/components/FanCard.tsx`
- Create: `mobile/src/features/celebrities/components/FansTab.tsx`

- [ ] **Step 1: `FanCard.tsx`**

```tsx
// mobile/src/features/celebrities/components/FanCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CelebrityFan } from '../../../services/api';

interface Props { fan: CelebrityFan }

export default function FanCard({ fan }: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: fan.avatarAccent || '#3558F0' }]}>
        <Text style={styles.initial}>{fan.name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>{fan.name}</Text>
      {fan.level ? <Text style={styles.level} numberOfLines={1}>{fan.level}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', gap: 4, padding: 6 },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  initial: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 12, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
  level: { fontSize: 10, color: '#7A7A7A', textAlign: 'center' },
});
```

- [ ] **Step 2: `FansTab.tsx`**

```tsx
// mobile/src/features/celebrities/components/FansTab.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCelebrityFans } from '../hooks/useCelebrityFans';
import FanCard from './FanCard';
import Spinner from './Spinner';
import ErrorBlock from './ErrorBlock';

interface Props { personId: string }

export default function FansTab({ personId }: Props) {
  const {
    data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useCelebrityFans(personId);

  const fans = data?.pages.flatMap(p => p.fans) ?? [];
  const totalCount = data?.pages[0]?.pagination.totalCount ?? 0;

  if (isLoading && fans.length === 0) return <Spinner text="Loading fans..." />;
  if (error && fans.length === 0)
    return <ErrorBlock message={error instanceof Error ? error.message : 'Failed to load fans'} />;
  if (fans.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>👥</Text>
        <Text style={styles.emptyText}>No fans yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {totalCount > 0 ? (
        <View style={styles.header}>
          <Text style={styles.total}>{totalCount.toLocaleString()}</Text>
          <Text style={styles.label}>fans</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {fans.map(fan => (
          <View key={fan.id} style={styles.cell}>
            <FanCard fan={fan} />
          </View>
        ))}
      </View>

      {hasNextPage ? (
        <Pressable
          style={[styles.loadBtn, isFetchingNextPage && { opacity: 0.6 }]}
          onPress={() => { if (!isFetchingNextPage) fetchNextPage(); }}
        >
          <Text style={styles.loadBtnText}>
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 6, padding: 14 },
  total: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  label: { fontSize: 13, color: '#7A7A7A', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  cell: { width: '33.33%' },
  empty: { padding: 48, alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14, color: '#5F5F5F', fontWeight: '500' },
  loadBtn: {
    marginHorizontal: 14, marginTop: 10, paddingVertical: 12,
    borderRadius: 12, backgroundColor: '#3558F0', alignItems: 'center',
  },
  loadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
```

- [ ] **Step 3: Skip tsc — pending `ImageLightbox` from next task.** Do NOT commit yet.

---

## Task 14: `ImageLightbox` (mobile adaptation)

**Files:**
- Create: `mobile/src/features/celebrities/components/ImageLightbox.tsx`

- [ ] **Step 1: Create the lightbox component**

```tsx
// mobile/src/features/celebrities/components/ImageLightbox.tsx
import React, { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, Image, StyleSheet, Dimensions } from 'react-native';
import type { BioSectionImage } from '../utils/parseBioHtml';

interface Props {
  images: BioSectionImage[];
  startIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const img = images[index];
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);
  const goNext = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);

  if (!img) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content} onPress={e => e.stopPropagation()}>
          {/* Counter */}
          {hasMultiple ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{index + 1} / {images.length}</Text>
            </View>
          ) : null}

          {/* Close */}
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>

          {/* Image */}
          <Image source={{ uri: img.src }} style={styles.img} resizeMode="contain" />

          {/* Caption */}
          {img.alt ? <Text style={styles.caption}>{img.alt}</Text> : null}

          {/* Tap zones for prev/next */}
          {hasMultiple ? (
            <>
              <Pressable style={[styles.zone, styles.zoneLeft]} onPress={goPrev} />
              <Pressable style={[styles.zone, styles.zoneRight]} onPress={goNext} />
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    width, height,
    alignItems: 'center', justifyContent: 'center',
  },
  img: { width: width * 0.95, height: height * 0.75 },
  counter: {
    position: 'absolute', top: 50, alignSelf: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
  },
  counterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  closeBtn: {
    position: 'absolute', top: 48, right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  caption: {
    position: 'absolute', bottom: 60, left: 24, right: 24,
    color: '#FFFFFF', fontSize: 12, fontWeight: '500',
    textAlign: 'center',
  },
  zone: {
    position: 'absolute', top: 0, bottom: 0, width: '30%',
  },
  zoneLeft:  { left: 0 },
  zoneRight: { right: 0 },
});
```

- [ ] **Step 2: Typecheck & lint all components so far**

Run: `npm run tsc && npm run lint`
Expected: 0 errors. (BiographyTab, FansTab, ImageLightbox should all compile together now.)

- [ ] **Step 3: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/components/BiographyTab.tsx \
        mobile/src/features/celebrities/components/FansTab.tsx \
        mobile/src/features/celebrities/components/FanCard.tsx \
        mobile/src/features/celebrities/components/ImageLightbox.tsx
git commit -m "feat(mobile/celebrities): add BiographyTab, FansTab, FanCard, ImageLightbox"
```

---

## Task 15: `CelebrityDetailScreen` + wire into `HomeStack`

**Files:**
- Create: `mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx`
- Modify: `mobile/src/navigation/HomeStack.tsx` — swap placeholder for `CelebrityProfile`

- [ ] **Step 1: Create `CelebrityDetailScreen.tsx`**

```tsx
// mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ImageBackground } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import type { HomeStackParamList } from '../../../navigation/types';
import TrendBadge from '../components/TrendBadge';
import Initials from '../components/Initials';
import BiographyTab from '../components/BiographyTab';
import FansTab from '../components/FansTab';

const TABS = [
  { id: 'biography', label: 'Biography' },
  { id: 'fans',      label: 'Fans' },
] as const;

type TabId = typeof TABS[number]['id'];
type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'CelebrityProfile'>;
type DetailRouteProp = RouteProp<HomeStackParamList, 'CelebrityProfile'>;

export default function CelebrityDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { params } = useRoute<DetailRouteProp>();
  const { celebrity } = params;
  const [tab, setTab] = useState<TabId>('biography');

  return (
    <View style={styles.screen}>
      <TopNavBack title={celebrity.name} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {celebrity.thumbnail ? (
            <ImageBackground source={{ uri: celebrity.thumbnail }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, styles.heroFallback]}>
              <Initials name={celebrity.name} style={{ fontSize: 72 }} />
            </View>
          )}
          <View style={styles.heroScrim} />

          <View style={styles.heroTop}>
            <View style={styles.rankPill}>
              <Text style={styles.rankNum}>#{celebrity.rank}</Text>
              <TrendBadge trend={celebrity.trend} rankDiff={celebrity.rankDiff} variant="small" />
            </View>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.heroName} numberOfLines={2}>{celebrity.name}</Text>
            {celebrity.shortDesc ? (
              <Text style={styles.heroDesc} numberOfLines={2}>{celebrity.shortDesc}</Text>
            ) : null}
            {celebrity.prevRank > 0 ? (
              <Text style={styles.heroPrev}>Previous rank: #{celebrity.prevRank}</Text>
            ) : null}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {tab === 'biography' ? <BiographyTab personId={celebrity.id} /> : <FansTab personId={celebrity.id} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F6F7' },
  hero: { aspectRatio: 16/10, backgroundColor: '#1A1A1A', position: 'relative' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#3558F0' },
  heroScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '60%', backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroTop: { position: 'absolute', left: 14, top: 14, flexDirection: 'row', alignItems: 'center' },
  rankPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  rankNum: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  heroBottom: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heroDesc: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '500' },
  heroPrev: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#EEF0F2',
  },
  tabBtn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#3558F0' },
  tabLabel: { fontSize: 13, fontWeight: '700', color: '#7A7A7A' },
  tabLabelActive: { color: '#3558F0' },
});
```

- [ ] **Step 2: Update `HomeStack.tsx` — register `CelebrityProfile`**

Add import:
```tsx
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
```

Replace:
```tsx
<Stack.Screen name="CelebrityProfile" component={PlaceholderScreen} />
```
with:
```tsx
<Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
```

- [ ] **Step 3: Typecheck & lint**

Run: `npm run tsc && npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Smoke check — full flow**

```bash
cd mobile && npm start
```

Verify in Expo Go / simulator:
1. Home → tap ⭐ Celebrities → ranking list loads (mock data if offline)
2. Tab switch: Bollywood / Television / Creators → slices correctly
3. Tap hero → CelebrityProfile with hero, rank badge, Biography tab
4. Biography shows stats chips, about, structured facts (mock) + social media row
5. Tap Fans tab → grid of fan avatars with "Load More" button
6. Back arrow → returns to list

- [ ] **Step 5: Ask the user before committing**

```bash
git add mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx \
        mobile/src/navigation/HomeStack.tsx
git commit -m "feat(mobile/celebrities): add CelebrityDetailScreen with bio + fans tabs"
```

---

## Task 16: Update progress tracker + final smoke check

**Files:**
- Modify: `docs/tracking/mobile-development-progress.md` — mark section 10 Celebrities as 2/2

- [ ] **Step 1: Update progress tracker**

Open the file and:

- In the **Section Breakdown** table, change the Celebrities row from `| 0 | 0 | 2 | ░░░░░░░░░░ 0% |` to `| 2 | 2 | 2 | ████████████ 100% |` (adjust column widths exactly as the file expects — read the row first).
- In the **Quick Status Map** row for Celebrities, change `⭐ Celebrities    ❌❌` to `⭐ Celebrities    ✅✅`.
- In **Section 10. Celebrities** change the header to `0/2 → 2/2 ████████████ 100%` and update each status cell:
  - `| Celebrities Screen | ✅ DONE | Bollywood / Television / Creators ranking with hero, runners, list | |`
  - `| Celebrity Detail | ✅ DONE | Bio (parsed HTML + facts fallback) + Fans tabs with lightbox | |`
- Update the **Overall Progress** percentage proportionally if shown at the top.

(Read the file first with Read tool so you can do precise Edit operations — don't reformat unrelated rows.)

- [ ] **Step 2: Final lint + tsc run**

```bash
cd mobile && npm run tsc && npm run lint
```
Expected: 0 errors across the whole codebase.

- [ ] **Step 3: Final manual smoke check**

Do the full flow one more time as listed in Task 15 Step 4. Verify no regressions in other Home stack screens (Articles, Forums section, Photo Gallery section).

- [ ] **Step 4: Ask the user before committing**

```bash
git add docs/tracking/mobile-development-progress.md
git commit -m "docs(tracking): mark Celebrities section 10 as 2/2 complete"
```

---

## Self-review (plan → spec)

- **Spec §2 (Nav & Entry):** covered in Tasks 4, 10, 15.
- **Spec §3 (Data Layer):** types in Task 1, transforms in Task 2, fetchers+mocks in Task 3, hooks in Task 6.
- **Spec §4 (CelebritiesScreen):** all components in Tasks 7/8/9; screen assembly in Task 10.
- **Spec §5 (CelebrityDetailScreen):** BiographyTab+children in Tasks 11/12, FansTab in Task 13, lightbox in Task 14, screen assembly in Task 15.
- **Spec §6 (Adaptations):** scrim via absolute Views (no expo-linear-gradient), Modal-based lightbox, Pressable instead of onClick — applied throughout.
- **Spec §7 (File structure):** matches the plan's File Structure section exactly.
- **Spec §8 (Edge cases):** Initials fallback (Task 7/8), empty bioHtml→FactsCard (Task 12), API mock fallback (Task 3), empty fans (Task 13).
- **Spec §9 (Out of scope):** nothing in the plan adds follow, search, or share.
- **Spec §10 (Success criteria):** smoke check in Task 15 walks every criterion.

**Placeholders:** None — every step has concrete code or exact edits.

**Type consistency:** `Celebrity.thumbnail` is `string | null` everywhere; `CelebrityBiography.id` is `string`; hook return shapes match consumer destructuring.

---

## Execution Handoff

Plan complete and saved to [docs/superpowers/plans/2026-04-18-mobile-celebrities-feature.md](../plans/2026-04-18-mobile-celebrities-feature.md).

Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent handles each task, I review between tasks, fast iteration.
**2. Inline Execution** — I execute tasks in this session, stopping at natural checkpoints for you to review.

Which approach?
