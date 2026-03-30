export const GALLERY_CATS = [
  { id: 'all',        label: 'All' },
  { id: 'tv-shows',   label: 'TV Shows' },
  { id: 'movies',     label: 'Movies' },
  { id: 'celebrities',label: 'Celebrities' },
  { id: 'events',     label: 'Events' },
  { id: 'web-series', label: 'Web Series' },
];

const makePhotos = (emojis, bgs) =>
  emojis.map((e, i) => ({ emoji: e, bg: bgs[i % bgs.length] }));

export const GALLERIES = [
  /* ── TV SHOWS ── */
  {
    id: 1,
    title: 'Anupamaa Cast Behind The Scenes – Week 12',
    cat: 'tv-shows',
    catLabel: 'TV Shows',
    count: 24,
    emoji: '🎭',
    bg: 'linear-gradient(135deg,#667eea,#764ba2)',
    time: '2 hours ago',
    featured: true,
    photos: makePhotos(
      ['🎭','📸','😊','🎬','🌟','💃','🎤','😍','🎉','🌹','🎭','💫','🎬','😎','🌟','💃','📸','🎤','🌹','🎭','😊','💫','🎬','🌹'],
      ['linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)']
    ),
  },
  {
    id: 2,
    title: 'Yeh Rishta Kya Kehlata Hai – Romantic Moments',
    cat: 'tv-shows',
    catLabel: 'TV Shows',
    count: 18,
    emoji: '💑',
    bg: 'linear-gradient(135deg,#f093fb,#f5576c)',
    time: '5 hours ago',
    photos: makePhotos(
      ['💑','🌸','💕','🌹','😍','💃','🎭','💫','😊','🎬','🌷','💕','💑','🌸','😍','🌹','🎭','💫'],
      ['linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#fa709a,#fee140)']
    ),
  },
  {
    id: 3,
    title: 'Taarak Mehta – Holi Special Episode Photos',
    cat: 'tv-shows',
    catLabel: 'TV Shows',
    count: 31,
    emoji: '🎊',
    bg: 'linear-gradient(135deg,#fa709a,#fee140)',
    time: 'Yesterday',
    photos: makePhotos(
      ['🎊','🌈','🎨','🎉','😂','🎭','💦','🌸','🎊','🎨','🌈','🎉','😂','🎭','💦','🌸','🎊','🎨','🌈','🎉','😂','🎭','💦','🌸','🎊','🎨','🌈','🎉','😂','🎭','💦'],
      ['linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#a18cd1,#fbc2eb)','linear-gradient(135deg,#ffecd2,#fcb69f)']
    ),
  },
  {
    id: 4,
    title: 'Ghum Hai Kisikey Pyaar Meiin – New Track',
    cat: 'tv-shows',
    catLabel: 'TV Shows',
    count: 16,
    emoji: '😢',
    bg: 'linear-gradient(135deg,#4facfe,#00f2fe)',
    time: '2 days ago',
    photos: makePhotos(
      ['😢','💔','🌧️','😭','💫','🌊','😢','💔','🌧️','😭','💫','🌊','😢','💔','🌧️','😭'],
      ['linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#667eea,#764ba2)']
    ),
  },

  /* ── MOVIES ── */
  {
    id: 5,
    title: 'Stree 2 – Grand Premiere Night in Mumbai',
    cat: 'movies',
    catLabel: 'Movies',
    count: 42,
    emoji: '🎬',
    bg: 'linear-gradient(135deg,#0c0c0c,#434343)',
    time: '3 hours ago',
    featured: true,
    photos: makePhotos(
      ['🎬','⭐','🌟','💫','🎭','😎','🔥','💃','🕺','🎉','🌹','🎬','⭐','🌟','💫','🎭','😎','🔥','💃','🕺','🎉','🌹','🎬','⭐','🌟','💫','🎭','😎','🔥','💃','🕺','🎉','🌹','🎬','⭐','🌟','💫','🎭','😎','🔥','💃','🕺'],
      ['linear-gradient(135deg,#0c0c0c,#434343)','linear-gradient(135deg,#232526,#414345)','linear-gradient(135deg,#373B44,#4286f4)']
    ),
  },
  {
    id: 6,
    title: 'Animal – Ranbir Kapoor Exclusive BTS Gallery',
    cat: 'movies',
    catLabel: 'Movies',
    count: 27,
    emoji: '🐯',
    bg: 'linear-gradient(135deg,#373B44,#4286f4)',
    time: '1 day ago',
    photos: makePhotos(
      ['🐯','🎬','💪','😤','🔥','⚔️','🐯','🎬','💪','😤','🔥','⚔️','🐯','🎬','💪','😤','🔥','⚔️','🐯','🎬','💪','😤','🔥','⚔️','🐯','🎬','💪'],
      ['linear-gradient(135deg,#373B44,#4286f4)','linear-gradient(135deg,#0c0c0c,#434343)','linear-gradient(135deg,#232526,#414345)']
    ),
  },
  {
    id: 7,
    title: 'Jawan – Shah Rukh Khan Action Stills',
    cat: 'movies',
    catLabel: 'Movies',
    count: 33,
    emoji: '💥',
    bg: 'linear-gradient(135deg,#f7971e,#ffd200)',
    time: '3 days ago',
    photos: makePhotos(
      ['💥','🕵️','🔫','💪','😎','🏃','💥','🕵️','🔫','💪','😎','🏃','💥','🕵️','🔫','💪','😎','🏃','💥','🕵️','🔫','💪','😎','🏃','💥','🕵️','🔫','💪','😎','🏃','💥','🕵️','🔫'],
      ['linear-gradient(135deg,#f7971e,#ffd200)','linear-gradient(135deg,#fc4a1a,#f7b733)']
    ),
  },

  /* ── CELEBRITIES ── */
  {
    id: 8,
    title: 'Deepika Padukone – Cannes 2024 Looks',
    cat: 'celebrities',
    catLabel: 'Celebrities',
    count: 20,
    emoji: '👸',
    bg: 'linear-gradient(135deg,#c79081,#dfa579)',
    time: '6 hours ago',
    featured: true,
    photos: makePhotos(
      ['👸','💄','👗','💍','🌟','📸','👸','💄','👗','💍','🌟','📸','👸','💄','👗','💍','🌟','📸','👸','📸'],
      ['linear-gradient(135deg,#c79081,#dfa579)','linear-gradient(135deg,#f5f7fa,#c3cfe2)','linear-gradient(135deg,#ffecd2,#fcb69f)']
    ),
  },
  {
    id: 9,
    title: 'Ranveer Singh – Bold Fashion Moments 2024',
    cat: 'celebrities',
    catLabel: 'Celebrities',
    count: 15,
    emoji: '🦁',
    bg: 'linear-gradient(135deg,#fc5c7d,#6a3093)',
    time: '8 hours ago',
    photos: makePhotos(
      ['🦁','💫','👔','🎨','🔥','😎','🦁','💫','👔','🎨','🔥','😎','🦁','💫','👔'],
      ['linear-gradient(135deg,#fc5c7d,#6a3093)','linear-gradient(135deg,#a18cd1,#fbc2eb)']
    ),
  },
  {
    id: 10,
    title: 'Priyanka Chopra – Global Icon Award Night',
    cat: 'celebrities',
    catLabel: 'Celebrities',
    count: 22,
    emoji: '🏆',
    bg: 'linear-gradient(135deg,#f7971e,#ffd200)',
    time: '1 day ago',
    photos: makePhotos(
      ['🏆','⭐','💎','🌟','👑','💐','🏆','⭐','💎','🌟','👑','💐','🏆','⭐','💎','🌟','👑','💐','🏆','⭐','💎','🏆'],
      ['linear-gradient(135deg,#f7971e,#ffd200)','linear-gradient(135deg,#fc4a1a,#f7b733)']
    ),
  },
  {
    id: 11,
    title: 'Alia Bhatt – Mom Moments & Family Pics',
    cat: 'celebrities',
    catLabel: 'Celebrities',
    count: 18,
    emoji: '👶',
    bg: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    time: '2 days ago',
    photos: makePhotos(
      ['👶','💕','🌸','😊','🤱','💫','👶','💕','🌸','😊','🤱','💫','👶','💕','🌸','😊','🤱','💫'],
      ['linear-gradient(135deg,#a1c4fd,#c2e9fb)','linear-gradient(135deg,#ffecd2,#fcb69f)']
    ),
  },

  /* ── EVENTS ── */
  {
    id: 12,
    title: 'Filmfare Awards 2024 – Red Carpet Highlights',
    cat: 'events',
    catLabel: 'Events',
    count: 56,
    emoji: '🏅',
    bg: 'linear-gradient(135deg,#FFD700,#FFA500)',
    time: '12 hours ago',
    featured: true,
    photos: makePhotos(
      ['🏅','⭐','💄','👗','👔','💍','🌟','📸','🎉','🥂','🏅','⭐','💄','👗','👔','💍','🌟','📸','🎉','🥂','🏅','⭐','💄','👗','👔','💍','🌟','📸','🎉','🥂','🏅','⭐','💄','👗','👔','💍','🌟','📸','🎉','🥂','🏅','⭐','💄','👗','👔','💍','🌟','📸','🎉','🥂','🏅','⭐','💄','👗','📸','🎉'],
      ['linear-gradient(135deg,#FFD700,#FFA500)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)']
    ),
  },
  {
    id: 13,
    title: 'IIFA 2024 – Best Moments From Abu Dhabi',
    cat: 'events',
    catLabel: 'Events',
    count: 38,
    emoji: '🌍',
    bg: 'linear-gradient(135deg,#43e97b,#38f9d7)',
    time: '2 days ago',
    photos: makePhotos(
      ['🌍','⭐','🎭','💃','🕺','🎉','🌍','⭐','🎭','💃','🕺','🎉','🌍','⭐','🎭','💃','🕺','🎉','🌍','⭐','🎭','💃','🕺','🎉','🌍','⭐','🎭','💃','🕺','🎉','🌍','⭐','🎭','💃','🕺','🎉','🌍','🎭'],
      ['linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#667eea,#764ba2)']
    ),
  },
  {
    id: 14,
    title: 'Zee Cine Awards – Stage Moments Gallery',
    cat: 'events',
    catLabel: 'Events',
    count: 29,
    emoji: '🎤',
    bg: 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    time: '4 days ago',
    photos: makePhotos(
      ['🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤','🎶','🎸','🎵','🎤'],
      ['linear-gradient(135deg,#a18cd1,#fbc2eb)','linear-gradient(135deg,#fc5c7d,#6a3093)']
    ),
  },

  /* ── WEB SERIES ── */
  {
    id: 15,
    title: 'Mirzapur 3 – Official Stills Released',
    cat: 'web-series',
    catLabel: 'Web Series',
    count: 21,
    emoji: '🔫',
    bg: 'linear-gradient(135deg,#1a1a2e,#16213e)',
    time: '4 hours ago',
    featured: true,
    photos: makePhotos(
      ['🔫','😤','💪','⚔️','🔥','🌃','🔫','😤','💪','⚔️','🔥','🌃','🔫','😤','💪','⚔️','🔥','🌃','🔫','😤','💪'],
      ['linear-gradient(135deg,#1a1a2e,#16213e)','linear-gradient(135deg,#0f0c29,#302b63)','linear-gradient(135deg,#24243e,#302b63)']
    ),
  },
  {
    id: 16,
    title: 'Panchayat Season 3 – Village Life Captured',
    cat: 'web-series',
    catLabel: 'Web Series',
    count: 19,
    emoji: '🌾',
    bg: 'linear-gradient(135deg,#56ab2f,#a8e063)',
    time: '1 day ago',
    photos: makePhotos(
      ['🌾','🏡','🌳','😊','🚲','🌻','🌾','🏡','🌳','😊','🚲','🌻','🌾','🏡','🌳','😊','🚲','🌻','🌾'],
      ['linear-gradient(135deg,#56ab2f,#a8e063)','linear-gradient(135deg,#43e97b,#38f9d7)']
    ),
  },
  {
    id: 17,
    title: 'Sacred Games – Iconic Scenes Revisited',
    cat: 'web-series',
    catLabel: 'Web Series',
    count: 25,
    emoji: '🃏',
    bg: 'linear-gradient(135deg,#232526,#414345)',
    time: '3 days ago',
    photos: makePhotos(
      ['🃏','🌃','😈','🔍','💊','🚔','🃏','🌃','😈','🔍','💊','🚔','🃏','🌃','😈','🔍','💊','🚔','🃏','🌃','😈','🔍','💊','🚔','🃏'],
      ['linear-gradient(135deg,#232526,#414345)','linear-gradient(135deg,#0c0c0c,#434343)']
    ),
  },
];
