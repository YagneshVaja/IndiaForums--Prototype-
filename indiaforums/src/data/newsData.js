export const NEWS_CATS = [
  { id: 'all',       label: 'ALL',      icon: 'grid' },
  { id: 'tv',        label: 'TV',       icon: 'tv' },
  { id: 'movies',    label: 'MOVIES',   icon: 'film' },
  { id: 'digital',   label: 'DIGITAL',  icon: 'digital' },
  { id: 'lifestyle', label: 'LIFESTYLE',icon: 'heart' },
  { id: 'sports',    label: 'SPORTS',   icon: 'trophy' },
];

export const NS_LANGS = {
  all:       ['ALL', 'HINDI', 'ENGLISH', 'TAMIL', 'TELUGU', 'KOREAN'],
  tv:        ['ALL', 'HINDI', 'ENGLISH'],
  movies:    ['ALL', 'HINDI', 'ENGLISH', 'TAMIL', 'TELUGU', 'KANNADA'],
  digital:   ['ALL', 'HINDI', 'ENGLISH', 'KOREAN'],
  lifestyle: ['ALL', 'FASHION', 'HEALTH', 'MAKEUP', 'FOOD'],
  sports:    ['ALL', 'CRICKET', 'FOOTBALL', 'WWE'],
};

export const LANG_EMOJI = {
  all: '🌐', hindi: '🇮🇳', english: '🌍', tamil: '🎭', telugu: '🌺',
  korean: '🇰🇷', kannada: '💎', cricket: '🏏', football: '⚽', wwe: '💪',
  fashion: '👗', health: '💚', makeup: '💄', food: '🥗',
};

export const NS_DATA = {
  all: {
    hindi: [
      { id: 1, cat: 'TV · HINDI',      tag: 'TRENDING', breaking: true,  title: "Yeh Rishta Kya Kehlata Hai: Abhira's shocking decision stuns the entire family",          time: '1 hr ago',  bg: 'linear-gradient(135deg,#4a1942,#7e22ce)', emoji: '📺', source: 'IF News Desk' },
      { id: 2, cat: 'MOVIES · HINDI',  tag: 'BOX OFFICE',breaking: false, title: "Stree 3 crosses ₹500 crore in first week — Bollywood's biggest 2026 opener",            time: '3 hr ago',  bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', emoji: '🎬', source: 'Box Office' },
      { id: 3, cat: 'DIGITAL · HINDI', tag: 'OTT',      breaking: false, title: 'Panchayat Season 4 officially confirmed; cast and shoot schedule revealed',                time: '10 hr ago', bg: 'linear-gradient(135deg,#3b2f04,#a16207)', emoji: '🌾', source: 'OTT Desk' },
      { id: 4, cat: 'TV · HINDI',      tag: 'BB18',     breaking: false, title: 'Bigg Boss 18 elimination shocker — house in total chaos after last night',                 time: '2 hr ago',  bg: 'linear-gradient(135deg,#2d1b69,#7c3aed)', emoji: '🎤', source: 'Reality Hub' },
      { id: 5, cat: 'TV · HINDI',      tag: '',         breaking: false, title: 'Anupamaa hits new ratings high — most-watched show three weeks in a row',                  time: '4 hr ago',  bg: 'linear-gradient(135deg,#1c3a5e,#2563eb)', emoji: '👑', source: 'TRP Watch' },
      { id: 6, cat: 'MOVIES · HINDI',  tag: 'REVIEW',   breaking: false, title: 'Chhaava 2 gets a standing ovation at premiere — early reviews are glowing',                time: '5 hr ago',  bg: 'linear-gradient(135deg,#3b1f04,#b45309)', emoji: '⚔️', source: 'Film Critic' },
    ],
    english: [
      { id: 1, cat: 'MOVIES · ENGLISH',tag: '',          breaking: false, title: 'Avatar 3 early screening reactions are overwhelmingly positive worldwide',                time: '4 hr ago',  bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', emoji: '🌊', source: 'Global Desk' },
      { id: 2, cat: 'TV · ENGLISH',    tag: 'NEW',      breaking: true,  title: 'HBO announces Game of Thrones prequel series set 300 years before original',             time: '5 hr ago',  bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)', emoji: '🐉', source: 'HBO Watch' },
      { id: 3, cat: 'DIGITAL · ENGLISH',tag: 'OTT',     breaking: false, title: 'Netflix India drops teaser for their most expensive original series yet',                  time: '1 hr ago',  bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', emoji: '🎞️', source: 'OTT Desk' },
      { id: 4, cat: 'MOVIES · ENGLISH',tag: '',          breaking: true,  title: 'Marvel announces Phase 6 slate — three new Avengers films confirmed for 2027',           time: '1 hr ago',  bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', emoji: '🦸', source: 'Marvel HQ' },
    ],
    tamil: [
      { id: 1, cat: 'MOVIES · TAMIL',  tag: '',          breaking: false, title: 'Thalapathy 68 first look reveal breaks internet — fans go berserk online',               time: '2 hr ago',  bg: 'linear-gradient(135deg,#14532d,#15803d)', emoji: '🎭', source: 'Kollywood Desk' },
      { id: 2, cat: 'MOVIES · TAMIL',  tag: 'REVIEW',   breaking: false, title: 'Vettaiyan review: Rajinikanth at his absolute best in this gripping action thriller',     time: '5 hr ago',  bg: 'linear-gradient(135deg,#431407,#c2410c)', emoji: '🔥', source: 'Kollywood Desk' },
    ],
    telugu: [
      { id: 1, cat: 'MOVIES · TELUGU', tag: '',          breaking: true,  title: 'Pushpa 3 officially announced — Allu Arjun to start shoot by mid-2026',                  time: '1 hr ago',  bg: 'linear-gradient(135deg,#4a1942,#9333ea)', emoji: '🌺', source: 'Tollywood Desk' },
      { id: 2, cat: 'MOVIES · TELUGU', tag: 'REVIEW',   breaking: false, title: 'Kalki 2898 AD crosses ₹1000 crore globally — landmark for Telugu cinema',                time: '3 hr ago',  bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', emoji: '🤖', source: 'Tollywood Desk' },
    ],
    korean: [
      { id: 1, cat: 'DIGITAL · KOREAN',tag: '',          breaking: false, title: 'Squid Game S3 episode 4 — unpacking that brutal and emotional finale twist',              time: '2 hr ago',  bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', emoji: '🎮', source: 'K-Content' },
      { id: 2, cat: 'DIGITAL · KOREAN',tag: 'NEW',      breaking: false, title: 'My Demon Season 2 officially greenlit — fans celebrate with trending hashtag',            time: '5 hr ago',  bg: 'linear-gradient(135deg,#4a1942,#7e22ce)', emoji: '😈', source: 'K-Content' },
      { id: 3, cat: 'DIGITAL · KOREAN',tag: '',          breaking: true,  title: 'Queen of Tears 2026 becomes most-watched Korean drama of the year on Netflix',           time: '7 hr ago',  bg: 'linear-gradient(135deg,#831843,#db2777)', emoji: '👑', source: 'K-Content' },
    ],
  },
  tv: {
    hindi: [
      { id: 1, cat: 'TV · HINDI', tag: 'TRENDING', breaking: true,  title: "Yeh Rishta Kya Kehlata Hai: Abhira's shocking decision stuns the entire family", time: '1 hr ago', bg: 'linear-gradient(135deg,#4a1942,#7e22ce)', emoji: '📺', source: 'IF News Desk' },
      { id: 2, cat: 'TV · HINDI', tag: 'BB18',     breaking: false, title: 'Bigg Boss 18 elimination shocker — house in total chaos after last night',        time: '2 hr ago', bg: 'linear-gradient(135deg,#2d1b69,#7c3aed)', emoji: '🎤', source: 'Reality Hub' },
      { id: 3, cat: 'TV · HINDI', tag: '',          breaking: false, title: 'Anupamaa hits new ratings high — most-watched show three weeks in a row',         time: '4 hr ago', bg: 'linear-gradient(135deg,#1c3a5e,#2563eb)', emoji: '👑', source: 'TRP Watch' },
      { id: 4, cat: 'TV · HINDI', tag: 'NEW',      breaking: false, title: 'Ghum Hai Kisikey Pyaar Meiin gets a major twist — fans shocked by today\'s episode', time: '6 hr ago', bg: 'linear-gradient(135deg,#831843,#db2777)', emoji: '💔', source: 'IF News Desk' },
    ],
    english: [
      { id: 1, cat: 'TV · ENGLISH', tag: 'NEW', breaking: true,  title: 'HBO announces Game of Thrones prequel series set 300 years before original', time: '5 hr ago', bg: 'linear-gradient(135deg,#0f172a,#1e3a5f)', emoji: '🐉', source: 'HBO Watch' },
      { id: 2, cat: 'TV · ENGLISH', tag: '',    breaking: false, title: "The Crown Season 7 teaser drops — UK royal family drama returns this fall",   time: '3 hr ago', bg: 'linear-gradient(135deg,#1e293b,#334155)', emoji: '👸', source: 'Global Desk' },
    ],
  },
  movies: {
    hindi: [
      { id: 1, cat: 'MOVIES · HINDI', tag: 'BOX OFFICE', breaking: false, title: "Stree 3 crosses ₹500 crore in first week — Bollywood's biggest 2026 opener",   time: '3 hr ago', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', emoji: '🎬', source: 'Box Office' },
      { id: 2, cat: 'MOVIES · HINDI', tag: '',            breaking: true,  title: "SRK's next film officially announced — fans erupt after surprise genre reveal", time: '2 hr ago', bg: 'linear-gradient(135deg,#1a1a2e,#0f3460)', emoji: '🌟', source: 'IF Exclusive' },
      { id: 3, cat: 'MOVIES · HINDI', tag: 'REVIEW',     breaking: false, title: 'Chhaava 2 gets a standing ovation at premiere — early reviews are glowing',     time: '5 hr ago', bg: 'linear-gradient(135deg,#3b1f04,#b45309)', emoji: '⚔️', source: 'Film Critic' },
      { id: 4, cat: 'MOVIES · HINDI', tag: '',            breaking: false, title: 'Salman Khan confirms Tiger 4 — shoot begins next quarter in Europe',            time: '8 hr ago', bg: 'linear-gradient(135deg,#14532d,#16a34a)', emoji: '🐯', source: 'Bollywood Desk' },
    ],
    english: [
      { id: 1, cat: 'MOVIES · ENGLISH', tag: '',      breaking: false, title: 'Avatar 3 early screening reactions are overwhelmingly positive worldwide',             time: '4 hr ago', bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', emoji: '🌊', source: 'Global Desk' },
      { id: 2, cat: 'MOVIES · ENGLISH', tag: '',      breaking: true,  title: 'Marvel announces Phase 6 slate — three new Avengers films confirmed for 2027',       time: '1 hr ago', bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', emoji: '🦸', source: 'Marvel HQ' },
    ],
    tamil: [
      { id: 1, cat: 'MOVIES · TAMIL', tag: '',       breaking: false, title: 'Thalapathy 68 first look reveal breaks internet — fans go berserk online',           time: '2 hr ago', bg: 'linear-gradient(135deg,#14532d,#15803d)', emoji: '🎭', source: 'Kollywood Desk' },
      { id: 2, cat: 'MOVIES · TAMIL', tag: 'REVIEW', breaking: false, title: 'Vettaiyan review: Rajinikanth at his absolute best in this gripping action thriller', time: '5 hr ago', bg: 'linear-gradient(135deg,#431407,#c2410c)', emoji: '🔥', source: 'Kollywood Desk' },
    ],
    telugu: [
      { id: 1, cat: 'MOVIES · TELUGU', tag: '',       breaking: true,  title: 'Pushpa 3 officially announced — Allu Arjun to start shoot by mid-2026',             time: '1 hr ago', bg: 'linear-gradient(135deg,#4a1942,#9333ea)', emoji: '🌺', source: 'Tollywood Desk' },
      { id: 2, cat: 'MOVIES · TELUGU', tag: 'REVIEW', breaking: false, title: 'Kalki 2898 AD crosses ₹1000 crore globally — landmark for Telugu cinema',           time: '3 hr ago', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', emoji: '🤖', source: 'Tollywood Desk' },
    ],
    kannada: [
      { id: 1, cat: 'MOVIES · KANNADA', tag: '', breaking: false, title: "KGF Chapter 3 teaser confirmed for release on Yash's birthday next month", time: '4 hr ago', bg: 'linear-gradient(135deg,#713f12,#d97706)', emoji: '💎', source: 'Sandalwood Desk' },
    ],
  },
  digital: {
    hindi: [
      { id: 1, cat: 'DIGITAL · HINDI', tag: '',    breaking: true,  title: 'Celebrity Chef Ranveer Brar to be a part of The Traitors 2: Report',  time: '3 hr ago',  bg: 'linear-gradient(135deg,#1e293b,#334155)', emoji: '👨‍🍳', source: 'OTT Desk' },
      { id: 2, cat: 'DIGITAL · HINDI', tag: 'OTT', breaking: false, title: 'Panchayat Season 4 officially confirmed; cast and shoot schedule revealed', time: '10 hr ago', bg: 'linear-gradient(135deg,#3b2f04,#a16207)', emoji: '🌾', source: 'OTT Desk' },
    ],
    english: [
      { id: 1, cat: 'DIGITAL · ENGLISH', tag: 'OTT', breaking: false, title: 'Netflix India drops teaser for their most expensive original series yet',  time: '1 hr ago', bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)', emoji: '🎞️', source: 'OTT Desk' },
      { id: 2, cat: 'DIGITAL · ENGLISH', tag: '',    breaking: false, title: "Apple TV+ India announces its biggest original slate of 2026",            time: '6 hr ago', bg: 'linear-gradient(135deg,#1e293b,#475569)', emoji: '📱', source: 'Tech Desk' },
    ],
    korean: [
      { id: 1, cat: 'DIGITAL · KOREAN', tag: '',    breaking: false, title: 'Squid Game S3 episode 4 — unpacking that brutal and emotional finale twist',          time: '2 hr ago', bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)', emoji: '🎮', source: 'K-Content' },
      { id: 2, cat: 'DIGITAL · KOREAN', tag: 'NEW', breaking: false, title: 'My Demon Season 2 officially greenlit — fans celebrate with trending hashtag',        time: '5 hr ago', bg: 'linear-gradient(135deg,#4a1942,#7e22ce)', emoji: '😈', source: 'K-Content' },
      { id: 3, cat: 'DIGITAL · KOREAN', tag: '',    breaking: true,  title: 'Queen of Tears 2026 becomes most-watched Korean drama of the year on Netflix',        time: '7 hr ago', bg: 'linear-gradient(135deg,#831843,#db2777)', emoji: '👑', source: 'K-Content' },
    ],
  },
  lifestyle: {
    fashion: [
      { id: 1, cat: 'LIFESTYLE · FASHION', tag: '',      breaking: false, title: "Ranveer Singh's bold Met Gala 2026 look has fans and critics completely divided", time: '7 hr ago', bg: 'linear-gradient(135deg,#431407,#ea580c)', emoji: '👗', source: 'Fashion Desk' },
      { id: 2, cat: 'LIFESTYLE · FASHION', tag: 'TREND', breaking: false, title: "Deepika Padukone's Cannes 2026 gown by Sabyasachi is absolutely breathtaking",  time: '3 hr ago', bg: 'linear-gradient(135deg,#831843,#db2777)', emoji: '✨', source: 'Fashion Desk' },
    ],
    health: [
      { id: 1, cat: 'LIFESTYLE · HEALTH', tag: '',      breaking: false, title: "Malaika Arora's morning yoga routine: the exact poses she swears by daily",         time: '12 hr ago', bg: 'linear-gradient(135deg,#4a1d96,#8b5cf6)', emoji: '🧘', source: 'Wellness Desk' },
      { id: 2, cat: 'LIFESTYLE · HEALTH', tag: 'TIPS',  breaking: false, title: '5 Ayurvedic habits Shilpa Shetty credits for her youthful skin and energy',        time: '6 hr ago',  bg: 'linear-gradient(135deg,#14532d,#16a34a)', emoji: '🌿', source: 'Wellness Desk' },
    ],
    makeup: [
      { id: 1, cat: 'LIFESTYLE · MAKEUP', tag: '', breaking: false, title: "Alia Bhatt's minimalist skincare routine is breaking the internet this week", time: '5 hr ago', bg: 'linear-gradient(135deg,#831843,#db2777)', emoji: '💄', source: 'Beauty Desk' },
    ],
    food: [
      { id: 1, cat: 'LIFESTYLE · FOOD', tag: 'RECIPE', breaking: false, title: "Shilpa Shetty shares her go-to Sunday brunch recipe and it is absolutely delightful", time: '9 hr ago', bg: 'linear-gradient(135deg,#14532d,#4ade80)', emoji: '🥗', source: 'Food Desk' },
    ],
  },
  sports: {
    cricket: [
      { id: 1, cat: 'SPORTS · CRICKET', tag: 'IPL',      breaking: false, title: "MI vs CSK: Rohit's record-breaking innings steals the show at Wankhede", time: '45 min ago', bg: 'linear-gradient(135deg,#14532d,#16a34a)', emoji: '🏏', source: 'Cricket Desk' },
      { id: 2, cat: 'SPORTS · CRICKET', tag: 'BREAKING', breaking: true,  title: 'India wins T20 series — Bumrah takes five wickets in stunning match finale', time: '1 hr ago',    bg: 'linear-gradient(135deg,#1e3a8a,#f97316)', emoji: '🏆', source: 'Cricket Desk' },
    ],
    football: [
      { id: 1, cat: 'SPORTS · FOOTBALL', tag: '', breaking: false, title: 'Sunil Chhetri comes out of retirement for a special farewell match in Mumbai', time: '3 hr ago', bg: 'linear-gradient(135deg,#1c1917,#44403c)', emoji: '⚽', source: 'Football Desk' },
    ],
    wwe: [
      { id: 1, cat: 'SPORTS · WWE', tag: '', breaking: true, title: "John Cena's surprise return at WrestleMania 42 sends the crowd into meltdown", time: '2 hr ago', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', emoji: '💪', source: 'WWE India' },
    ],
  },
};

export function getNewsArticles(cat, lang) {
  const catData = NS_DATA[cat] || {};
  if (lang === 'all') {
    return Object.values(catData).flat();
  }
  return catData[lang] || [];
}

// Extends the base article list to ~40 items for infinite scroll demo
const TIME_VARIANTS = ['just now', '30 min ago', '1 hr ago', '2 hr ago', '4 hr ago', '6 hr ago', '9 hr ago', '12 hr ago', '1 day ago'];
export function getInfiniteArticles(cat, lang) {
  const base = getNewsArticles(cat, lang);
  if (base.length === 0) return [];
  const result = [];
  let t = 0;
  while (result.length < 40) {
    for (const a of base) {
      if (result.length >= 40) break;
      result.push({
        ...a,
        id: `${a.id}_${result.length}`,
        time: result.length < base.length ? a.time : TIME_VARIANTS[t % TIME_VARIANTS.length],
      });
      t++;
    }
  }
  return result;
}

// ── Section data pools ────────────────────────────────────────────────────────

export const VIDEOS = [
  [
    { id: 'v1',  title: 'Stree 3 | Full Official Trailer',            duration: '2:47', views: '12M',  emoji: '🎬', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
    { id: 'v2',  title: 'Bigg Boss 18 | Full Episode Highlights',     duration: '18:32',views: '4.5M', emoji: '🎤', bg: 'linear-gradient(135deg,#2d1b69,#7c3aed)' },
    { id: 'v3',  title: "Anupamaa | Today's Biggest Twist",           duration: '6:14', views: '2.1M', emoji: '📺', bg: 'linear-gradient(135deg,#1c3a5e,#2563eb)' },
    { id: 'v4',  title: 'IPL 2026 | Best Catches Compilation',        duration: '9:05', views: '8.3M', emoji: '🏏', bg: 'linear-gradient(135deg,#14532d,#16a34a)' },
  ],
  [
    { id: 'v5',  title: 'Pushpa 3 | Title Announcement Video',        duration: '1:23', views: '22M',  emoji: '🌺', bg: 'linear-gradient(135deg,#4a1942,#9333ea)' },
    { id: 'v6',  title: 'Squid Game S3 | Final Episode Recap',        duration: '12:44',views: '31M',  emoji: '🎮', bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
    { id: 'v7',  title: 'Deepika at Cannes 2026 | Full Look',         duration: '4:18', views: '6.7M', emoji: '✨', bg: 'linear-gradient(135deg,#831843,#db2777)' },
    { id: 'v8',  title: 'WrestleMania 42 | John Cena Return Moment',  duration: '3:55', views: '18M',  emoji: '💪', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
  ],
  [
    { id: 'v9',  title: 'Thalapathy 68 | First Look Motion Poster',   duration: '0:58', views: '9.4M', emoji: '🎭', bg: 'linear-gradient(135deg,#14532d,#15803d)' },
    { id: 'v10', title: 'Avatar 3 | Official Trailer Reaction',        duration: '15:22',views: '5.6M', emoji: '🌊', bg: 'linear-gradient(135deg,#0c4a6e,#0ea5e9)' },
    { id: 'v11', title: 'KGF Chapter 3 | Teaser Breakdown',           duration: '7:45', views: '14M',  emoji: '💎', bg: 'linear-gradient(135deg,#713f12,#d97706)' },
    { id: 'v12', title: 'India vs Pakistan | Post-Match Analysis',     duration: '22:10',views: '11M',  emoji: '🏆', bg: 'linear-gradient(135deg,#1e3a8a,#f97316)' },
  ],
];

export const QUIZZES = [
  { id: 'qz1', badge: 'TV · TRIVIA',        question: "Which show became India's most-watched in 2026 with record TRP ratings?",  options: ['Anupamaa', 'Yeh Rishta Kya Kehlata Hai', 'Bigg Boss 18', 'Taarak Mehta'], answer: 0, participants: '1.2M' },
  { id: 'qz2', badge: 'MOVIES · QUIZ',      question: 'Stree 3 crossed ₹500 crore in how many days at the box office?',          options: ['3 days', '5 days', '7 days', '10 days'], answer: 2, participants: '876K' },
  { id: 'qz3', badge: 'DIGITAL · QUIZ',     question: 'Which OTT platform streams Panchayat Season 4?',                          options: ['Netflix', 'Hotstar', 'Prime Video', 'SonyLIV'], answer: 2, participants: '543K' },
  { id: 'qz4', badge: 'SPORTS · CRICKET',   question: 'Who took 5 wickets in the T20 series finale for India?',                  options: ['Shami', 'Siraj', 'Bumrah', 'Kuldeep'], answer: 2, participants: '2.1M' },
  { id: 'qz5', badge: 'K-DRAMA · QUIZ',     question: 'Which K-drama became most-watched on Netflix globally in 2026?',          options: ['My Demon S2', 'Squid Game S3', 'Queen of Tears 2026', 'Crash Landing 2'], answer: 2, participants: '3.4M' },
  { id: 'qz6', badge: 'MOVIES · MARVEL',    question: 'How many new Avengers films did Marvel confirm for Phase 6?',             options: ['One', 'Two', 'Three', 'Four'], answer: 2, participants: '4.7M' },
];

export const PHOTO_GALLERIES = [
  [
    { id: 'pg1', title: "Deepika's Cannes 2026 Looks",   count: 18, emoji: '✨', bg: 'linear-gradient(135deg,#831843,#db2777)' },
    { id: 'pg2', title: 'IPL 2026 Opening Ceremony',     count: 24, emoji: '🏏', bg: 'linear-gradient(135deg,#14532d,#16a34a)' },
    { id: 'pg3', title: 'Stree 3 Premiere Night',        count: 31, emoji: '🎬', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
    { id: 'pg4', title: "Ranveer's Met Gala 2026",       count: 15, emoji: '👗', bg: 'linear-gradient(135deg,#431407,#ea580c)' },
  ],
  [
    { id: 'pg5', title: 'Thalapathy 68 First Look Event',count: 22, emoji: '🎭', bg: 'linear-gradient(135deg,#14532d,#15803d)' },
    { id: 'pg6', title: 'Pushpa 3 Announcement Party',   count: 19, emoji: '🌺', bg: 'linear-gradient(135deg,#4a1942,#9333ea)' },
    { id: 'pg7', title: 'Bigg Boss 18 Grand Finale',     count: 27, emoji: '🎤', bg: 'linear-gradient(135deg,#2d1b69,#7c3aed)' },
    { id: 'pg8', title: 'India vs Pakistan Match Day',   count: 33, emoji: '🏆', bg: 'linear-gradient(135deg,#1e3a8a,#f97316)' },
  ],
  [
    { id: 'pg9',  title: "SRK's New Film Announcement",  count: 20, emoji: '🌟', bg: 'linear-gradient(135deg,#1a1a2e,#0f3460)' },
    { id: 'pg10', title: 'KGF 3 Teaser Launch Event',    count: 16, emoji: '💎', bg: 'linear-gradient(135deg,#713f12,#d97706)' },
    { id: 'pg11', title: 'Panchayat S4 Cast Reunion',    count: 12, emoji: '🌾', bg: 'linear-gradient(135deg,#3b2f04,#a16207)' },
    { id: 'pg12', title: "Alia Bhatt's London Vacation", count: 28, emoji: '💄', bg: 'linear-gradient(135deg,#831843,#db2777)' },
  ],
];

export const VISUAL_STORIES = [
  [
    { id: 'vs1',  title: 'BB18 Drama',      subtitle: '10 slides', emoji: '🎤', bg: 'linear-gradient(160deg,#2d1b69,#7c3aed)' },
    { id: 'vs2',  title: 'Stree 3 Cast',    subtitle: '8 slides',  emoji: '🎬', bg: 'linear-gradient(160deg,#7f1d1d,#ef4444)' },
    { id: 'vs3',  title: 'IPL Moments',     subtitle: '12 slides', emoji: '🏏', bg: 'linear-gradient(160deg,#14532d,#16a34a)' },
    { id: 'vs4',  title: 'K-Drama 2026',    subtitle: '7 slides',  emoji: '👑', bg: 'linear-gradient(160deg,#831843,#db2777)' },
    { id: 'vs5',  title: 'Cannes 2026',     subtitle: '9 slides',  emoji: '✨', bg: 'linear-gradient(160deg,#0c4a6e,#0ea5e9)' },
  ],
  [
    { id: 'vs6',  title: 'Pushpa 3 Buzz',   subtitle: '6 slides',  emoji: '🌺', bg: 'linear-gradient(160deg,#4a1942,#9333ea)' },
    { id: 'vs7',  title: 'Thalapathy 68',   subtitle: '8 slides',  emoji: '🎭', bg: 'linear-gradient(160deg,#14532d,#15803d)' },
    { id: 'vs8',  title: 'OTT Top Picks',   subtitle: '11 slides', emoji: '🎞️', bg: 'linear-gradient(160deg,#7f1d1d,#b91c1c)' },
    { id: 'vs9',  title: 'India Cricket',   subtitle: '9 slides',  emoji: '🏆', bg: 'linear-gradient(160deg,#1e3a8a,#f97316)' },
    { id: 'vs10', title: "SRK New Film",    subtitle: '5 slides',  emoji: '🌟', bg: 'linear-gradient(160deg,#1a1a2e,#0f3460)' },
  ],
  [
    { id: 'vs11', title: 'KGF 3 Teaser',    subtitle: '7 slides',  emoji: '💎', bg: 'linear-gradient(160deg,#713f12,#d97706)' },
    { id: 'vs12', title: 'WM42 Moments',    subtitle: '10 slides', emoji: '💪', bg: 'linear-gradient(160deg,#7f1d1d,#ef4444)' },
    { id: 'vs13', title: 'Avatar 3 World',  subtitle: '8 slides',  emoji: '🌊', bg: 'linear-gradient(160deg,#0c4a6e,#0ea5e9)' },
    { id: 'vs14', title: 'Celeb Diets',     subtitle: '6 slides',  emoji: '🥗', bg: 'linear-gradient(160deg,#14532d,#4ade80)' },
    { id: 'vs15', title: 'Anupamaa S3',     subtitle: '12 slides', emoji: '📺', bg: 'linear-gradient(160deg,#1c3a5e,#2563eb)' },
  ],
];
