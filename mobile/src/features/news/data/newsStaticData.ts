// Main category tabs. `subCatIds` holds the API's defaultCategoryId values
// that belong to this parent — used to client-side filter articles returned
// by /articles/list when only a parent category (no sub-chip) is selected.
export interface NewsCategory {
  id: string;
  label: string;
  subCatIds: number[] | null;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  { id: 'all',        label: 'ALL',       subCatIds: null },
  { id: 'television', label: 'TV',        subCatIds: [5, 6] },
  { id: 'movies',     label: 'MOVIES',    subCatIds: [7, 8, 16, 17, 18] },
  { id: 'digital',    label: 'DIGITAL',   subCatIds: [3, 9, 10, 19] },
  { id: 'lifestyle',  label: 'LIFESTYLE', subCatIds: [4, 11, 12, 13, 20] },
  { id: 'sports',     label: 'SPORTS',    subCatIds: [14, 15, 21] },
];

// Subcategory chip ids are the API's defaultCategoryId as a string, so
// `Number(subCat.id) === article.catId` is a direct filter. 'all' means no
// subcategory filter — fall back to the parent's subCatIds.
export const NEWS_SUBCATEGORIES: Record<string, Array<{ id: string; label: string }>> = {
  television: [
    { id: 'all', label: 'ALL' },
    { id: '5',   label: 'HINDI' },
    { id: '6',   label: 'ENGLISH' },
  ],
  movies: [
    { id: 'all', label: 'ALL' },
    { id: '7',   label: 'HINDI' },
    { id: '8',   label: 'ENGLISH' },
    { id: '16',  label: 'TAMIL' },
    { id: '17',  label: 'TELUGU' },
    { id: '18',  label: 'KANNADA' },
  ],
  digital: [
    { id: 'all', label: 'ALL' },
    { id: '9',   label: 'HINDI' },
    { id: '10',  label: 'ENGLISH' },
    { id: '19',  label: 'KOREAN' },
  ],
  lifestyle: [
    { id: 'all', label: 'ALL' },
    { id: '11',  label: 'FASHION' },
    { id: '12',  label: 'HEALTH' },
    { id: '13',  label: 'MAKEUP' },
    { id: '20',  label: 'FOOD' },
  ],
  sports: [
    { id: 'all', label: 'ALL' },
    { id: '15',  label: 'CRICKET' },
    { id: '21',  label: 'FOOTBALL' },
  ],
};

// Maps a NEWS_CATEGORIES.id to the lowercase `cat` value carried by
// `Video.cat` / `Gallery.cat`. The two vocabularies overlap except for
// 'television' → 'tv'. Used to filter the video and gallery pools when the
// user selects a non-'all' category in the News tab.
export const NEWS_CATEGORY_CONTENT_CAT: Record<string, string> = {
  television: 'tv',
  movies:     'movies',
  digital:    'digital',
  lifestyle:  'lifestyle',
  sports:     'sports',
};

// ──────────────────────────────────────────────────────────────────────────
// Quizzes (static seed). `category` matches a NEWS_CATEGORIES.id so the
// News feed can drop quizzes that don't belong to the active tab. When the
// active tab is 'all', every quiz qualifies.
// ──────────────────────────────────────────────────────────────────────────
export interface QuizItem {
  id: string;
  category: string;
  badge: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
  participants: string;
}

export const QUIZZES: QuizItem[] = [
  {
    id: 'qz1', category: 'television',
    badge: 'TV · TRIVIA', participants: '1.2M',
    question: "Which show became India's most-watched in 2026 with record TRP ratings?",
    options: ['Anupamaa', 'Yeh Rishta Kya Kehlata Hai', 'Bigg Boss 18', 'Taarak Mehta'],
    answer: 0,
  },
  {
    id: 'qz2', category: 'movies',
    badge: 'MOVIES · QUIZ', participants: '876K',
    question: 'Stree 3 crossed ₹500 crore in how many days at the box office?',
    options: ['3 days', '5 days', '7 days', '10 days'],
    answer: 2,
  },
  {
    id: 'qz3', category: 'digital',
    badge: 'DIGITAL · QUIZ', participants: '543K',
    question: 'Which OTT platform streams Panchayat Season 4?',
    options: ['Netflix', 'Hotstar', 'Prime Video', 'SonyLIV'],
    answer: 2,
  },
  {
    id: 'qz4', category: 'sports',
    badge: 'SPORTS · CRICKET', participants: '2.1M',
    question: 'Who took 5 wickets in the T20 series finale for India?',
    options: ['Shami', 'Siraj', 'Bumrah', 'Kuldeep'],
    answer: 2,
  },
  {
    id: 'qz5', category: 'digital',
    badge: 'K-DRAMA · QUIZ', participants: '3.4M',
    question: 'Which K-drama became most-watched on Netflix globally in 2026?',
    options: ['My Demon S2', 'Squid Game S3', 'Queen of Tears 2026', 'Crash Landing 2'],
    answer: 2,
  },
  {
    id: 'qz6', category: 'movies',
    badge: 'MOVIES · MARVEL', participants: '4.7M',
    question: 'How many new Avengers films did Marvel confirm for Phase 6?',
    options: ['One', 'Two', 'Three', 'Four'],
    answer: 2,
  },
  // Lifestyle quizzes added so every News category has at least one slot;
  // without these, the LIFESTYLE tab never gets a quiz block.
  {
    id: 'qz7', category: 'lifestyle',
    badge: 'LIFESTYLE · BEAUTY', participants: '690K',
    question: 'Which fragrance note dominates the most-searched perfume of 2026?',
    options: ['Vanilla', 'Oud', 'Bergamot', 'Sandalwood'],
    answer: 1,
  },
  {
    id: 'qz8', category: 'television',
    badge: 'TV · BIGG BOSS', participants: '2.8M',
    question: 'Which Bigg Boss 18 contestant entered as a wildcard mid-season?',
    options: ['Karan Veer Mehra', 'Avinash Mishra', 'Rajat Dalal', 'Vivian Dsena'],
    answer: 2,
  },
];

// ──────────────────────────────────────────────────────────────────────────
// Visual stories (static seed). Stored flat with a `category` tag so the
// News feed can pick a per-category subset and chunk it into rails.
// ──────────────────────────────────────────────────────────────────────────
export interface VisualStoryItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  emoji: string;
  colors: [string, string];
}

export const VISUAL_STORIES: VisualStoryItem[] = [
  // Television
  { id: 'vs1',  category: 'television', title: 'BB18 Drama',    subtitle: '10 slides', emoji: '🎤', colors: ['#2d1b69', '#7c3aed'] },
  { id: 'vs15', category: 'television', title: 'Anupamaa S3',   subtitle: '12 slides', emoji: '📺', colors: ['#1c3a5e', '#2563eb'] },
  // Movies
  { id: 'vs2',  category: 'movies',     title: 'Stree 3 Cast',  subtitle: '8 slides',  emoji: '🎬', colors: ['#7f1d1d', '#ef4444'] },
  { id: 'vs5',  category: 'movies',     title: 'Cannes 2026',   subtitle: '9 slides',  emoji: '✨', colors: ['#0c4a6e', '#0ea5e9'] },
  { id: 'vs6',  category: 'movies',     title: 'Pushpa 3 Buzz', subtitle: '6 slides',  emoji: '🌺', colors: ['#4a1942', '#9333ea'] },
  { id: 'vs7',  category: 'movies',     title: 'Thalapathy 68', subtitle: '8 slides',  emoji: '🎭', colors: ['#14532d', '#15803d'] },
  { id: 'vs10', category: 'movies',     title: 'SRK New Film',  subtitle: '5 slides',  emoji: '🌟', colors: ['#1a1a2e', '#0f3460'] },
  { id: 'vs11', category: 'movies',     title: 'KGF 3 Teaser',  subtitle: '7 slides',  emoji: '💎', colors: ['#713f12', '#d97706'] },
  { id: 'vs13', category: 'movies',     title: 'Avatar 3 World',subtitle: '8 slides',  emoji: '🌊', colors: ['#0c4a6e', '#0ea5e9'] },
  // Digital / OTT
  { id: 'vs4',  category: 'digital',    title: 'K-Drama 2026',  subtitle: '7 slides',  emoji: '👑', colors: ['#831843', '#db2777'] },
  { id: 'vs8',  category: 'digital',    title: 'OTT Top Picks', subtitle: '11 slides', emoji: '🎞️', colors: ['#7f1d1d', '#b91c1c'] },
  // Lifestyle
  { id: 'vs14', category: 'lifestyle',  title: 'Celeb Diets',   subtitle: '6 slides',  emoji: '🥗', colors: ['#14532d', '#4ade80'] },
  // Sports
  { id: 'vs3',  category: 'sports',     title: 'IPL Moments',   subtitle: '12 slides', emoji: '🏏', colors: ['#14532d', '#16a34a'] },
  { id: 'vs9',  category: 'sports',     title: 'India Cricket', subtitle: '9 slides',  emoji: '🏆', colors: ['#1e3a8a', '#f97316'] },
  { id: 'vs12', category: 'sports',     title: 'WM42 Moments',  subtitle: '10 slides', emoji: '💪', colors: ['#7f1d1d', '#ef4444'] },
];
