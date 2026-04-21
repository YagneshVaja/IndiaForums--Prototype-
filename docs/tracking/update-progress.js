#!/usr/bin/env node
/**
 * Mobile Development Progress Tracker
 * Auto-triggered by hook on Write/Edit, or run manually:
 *   node docs/tracking/update-progress.js
 *
 * Rules:
 *   - COMPLETED = manually set in JSON (never auto-downgraded)
 *   - IN_PROGRESS = file exists with real implementation code
 *   - NOT_STARTED = file missing, or contains PlaceholderScreen, or < 25 real lines
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..', '..');
const MOBILE    = path.join(ROOT, 'mobile', 'src');
const JSON_FILE = path.join(__dirname, 'screen-checklist.json');
const MD_FILE   = path.join(__dirname, 'mobile-development-progress.md');

// ---------------------------------------------------------------------------
// Screen → expected file path (relative to MOBILE)
// ---------------------------------------------------------------------------
const SCREEN_MAP = {
  onboarding: {
    SplashScreen:    'features/onboarding/screens/SplashScreen.tsx',
    OnboardingSlides:'features/onboarding/screens/OnboardingScreen.tsx',
    GetStarted:      'features/onboarding/screens/GetStartedScreen.tsx',
  },
  auth: {
    Login:          'features/auth/screens/LoginScreen.tsx',
    Register:       'features/auth/screens/RegisterScreen.tsx',
    ForgotPassword: 'features/auth/screens/ForgotPasswordScreen.tsx',
    ResetPassword:  'features/auth/screens/ResetPasswordScreen.tsx',
    VerifyEmail:    'features/auth/screens/VerifyEmailScreen.tsx',
  },
  home: {
    HomeScreen:   'features/home/screens/HomeScreen.tsx',
    CategoryFeed: 'features/home/screens/CategoryFeedScreen.tsx',
  },
  news: {
    NewsScreen:    'features/news/screens/NewsScreen.tsx',
    ArticleDetail: 'features/news/screens/ArticleDetailScreen.tsx',
  },
  forums: {
    ForumsMain:    'features/forums/screens/ForumsScreen.tsx',
    ForumList:     'features/forums/screens/ForumListScreen.tsx',
    AllTopicsView: 'features/forums/screens/AllTopicsScreen.tsx',
    TopicDetail:   'features/forums/screens/TopicDetailScreen.tsx',
    ReportsInbox:  'features/forums/screens/ReportsInboxScreen.tsx',
  },
  search: {
    SearchScreen: 'features/search/screens/SearchScreen.tsx',
    TagDetail:    'features/search/screens/TagDetailScreen.tsx',
  },
  gallery: {
    GalleryScreen: 'features/gallery/screens/GalleryScreen.tsx',
    GalleryDetail: 'features/gallery/screens/GalleryDetailScreen.tsx',
  },
  video_shorts: {
    VideoScreen:  'features/video/screens/VideoScreen.tsx',
    VideoDetail:  'features/video/screens/VideoDetailScreen.tsx',
    ShortsScreen: 'features/shorts/screens/ShortsScreen.tsx',
  },
  web_stories: {
    WebStoriesList: 'features/webstories/screens/WebStoriesScreen.tsx',
    WebStoryPlayer: 'features/webstories/screens/WebStoryPlayerScreen.tsx',
  },
  celebrities: {
    CelebritiesScreen: 'features/celebrities/screens/CelebritiesScreen.tsx',
    CelebrityDetail:   'features/celebrities/screens/CelebrityDetailScreen.tsx',
  },
  fan_fiction: {
    FanFictionMain:    'features/fanfiction/screens/FanFictionScreen.tsx',
    FanFictionDetail:  'features/fanfiction/screens/FanFictionDetailScreen.tsx',
    ChapterReader:     'features/fanfiction/screens/ChapterReaderScreen.tsx',
    FanFictionAuthors: 'features/fanfiction/screens/FanFictionAuthorsScreen.tsx',
    AuthorFollowers:   'features/fanfiction/screens/AuthorFollowersScreen.tsx',
  },
  quizzes: {
    QuizzesScreen:  'features/quizzes/screens/QuizzesScreen.tsx',
    QuizPlayer:     'features/quizzes/screens/QuizPlayerScreen.tsx',
    QuizResult:     'features/quizzes/screens/QuizResultScreen.tsx',
    QuizLeaderboard:'features/quizzes/screens/QuizLeaderboardScreen.tsx',
  },
  my_space: {
    MySpaceDashboard: 'features/myspace/screens/MySpaceScreen.tsx',
    UserProfile:      'features/myspace/screens/ProfileScreen.tsx',
    EditProfile:      'features/myspace/screens/EditProfileScreen.tsx',
    ChangePassword:   'features/myspace/screens/ChangePasswordScreen.tsx',
    MyArticles:       'features/myspace/screens/MyArticlesScreen.tsx',
    MyFanFiction:     'features/myspace/screens/MyFanFictionScreen.tsx',
    FollowersList:    'features/myspace/screens/FollowersScreen.tsx',
    FollowingList:    'features/myspace/screens/FollowingScreen.tsx',
    Buddies:          'features/buddies/screens/BuddiesScreen.tsx',
  },
  notifications: {
    NotificationsScreen: 'features/notifications/screens/NotificationsScreen.tsx',
  },
  messages: {
    MessagesInbox:  'features/messages/screens/MessagesScreen.tsx',
    MessageThread:  'features/messages/screens/MessageThreadScreen.tsx',
    ComposeMessage: 'features/messages/screens/ComposeScreen.tsx',
    MessageFolders: 'features/messages/screens/FoldersScreen.tsx',
  },
  account_settings: {
    AccountSettings:      'features/settings/screens/AccountSettingsScreen.tsx',
    Activities:           'features/settings/screens/ActivitiesScreen.tsx',
    Devices:              'features/settings/screens/DevicesScreen.tsx',
    NotificationSettings: 'features/settings/screens/NotificationSettingsScreen.tsx',
    Status:               'features/settings/screens/StatusScreen.tsx',
    UsernameEdit:         'features/settings/screens/UsernameScreen.tsx',
  },
  help: {
    HelpCenter: 'features/help/screens/HelpCenterScreen.tsx',
  },
};

// ---------------------------------------------------------------------------
// Status detection
// ---------------------------------------------------------------------------
function detectStatus(relPath, currentStatus) {
  // COMPLETED is always a manual decision — never auto-downgrade
  if (currentStatus === 'COMPLETED') return 'COMPLETED';

  const fullPath = path.join(MOBILE, relPath);
  if (!fs.existsSync(fullPath)) return 'NOT_STARTED';

  const content = fs.readFileSync(fullPath, 'utf8');
  const realLines = content.split('\n').filter(l => l.trim().length > 0).length;

  if (content.includes('PlaceholderScreen') || realLines < 25) return 'NOT_STARTED';

  return 'IN_PROGRESS';
}

// ---------------------------------------------------------------------------
// Progress bar generator
// ---------------------------------------------------------------------------
function bar(done, inProg, total, width = 20) {
  const completedBlocks = Math.round((done / total) * width);
  const inProgBlocks    = Math.round((inProg / total) * width);
  const emptyBlocks     = width - completedBlocks - inProgBlocks;
  return '█'.repeat(Math.max(0, completedBlocks)) +
         '▒'.repeat(Math.max(0, inProgBlocks)) +
         '░'.repeat(Math.max(0, emptyBlocks));
}

function sectionBar(done, inProg, total) {
  const pct = total === 0 ? 0 : Math.round(((done + inProg * 0.5) / total) * 100);
  const filled = Math.round((pct / 100) * 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${pct}%`;
}

// ---------------------------------------------------------------------------
// Build the auto-update block
// ---------------------------------------------------------------------------
function buildAutoBlock(checklist, date) {
  const counts = { COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0 };
  const sectionStats = {};

  for (const [section, screens] of Object.entries(checklist)) {
    if (section === '_meta') continue;
    const s = { COMPLETED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, total: 0 };
    for (const status of Object.values(screens)) {
      s[status] = (s[status] || 0) + 1;
      counts[status]++;
      s.total++;
    }
    sectionStats[section] = s;
  }

  const total = counts.COMPLETED + counts.IN_PROGRESS + counts.NOT_STARTED;
  const overallPct = total === 0 ? 0 : Math.round(
    ((counts.COMPLETED + counts.IN_PROGRESS * 0.5) / total) * 100
  );

  const sectionEmoji = {
    onboarding: '📱', auth: '🔐', home: '🏠', news: '📰',
    forums: '💬', search: '🔍', gallery: '🖼️', video_shorts: '🎬',
    web_stories: '📖', celebrities: '⭐', fan_fiction: '📚',
    quizzes: '🧩', my_space: '👤', notifications: '🔔',
    messages: '✉️', account_settings: '⚙️', help: '❓',
  };

  const sectionNames = {
    onboarding: 'Onboarding', auth: 'Auth', home: 'Home',
    news: 'News', forums: 'Forums', search: 'Search',
    gallery: 'Gallery', video_shorts: 'Video/Shorts', web_stories: 'Web Stories',
    celebrities: 'Celebrities', fan_fiction: 'Fan Fiction', quizzes: 'Quizzes',
    my_space: 'My Space', notifications: 'Notifications', messages: 'Messages',
    account_settings: 'Settings', help: 'Help',
  };

  // Quick map row
  const quickMap = Object.entries(sectionStats).map(([section, s]) => {
    const icon = sectionEmoji[section] || '•';
    const name = (sectionNames[section] || section).padEnd(14);
    const dots = [
      ...Array(s.COMPLETED).fill('✅'),
      ...Array(s.IN_PROGRESS).fill('🔄'),
      ...Array(s.NOT_STARTED).fill('❌'),
    ].join('');
    return `${icon} ${name} ${dots}`;
  }).join('\n');

  // Section summary table
  const sectionTable = Object.entries(sectionStats).map(([section, s]) => {
    const name = sectionNames[section] || section;
    const b = sectionBar(s.COMPLETED, s.IN_PROGRESS, s.total);
    return `| ${name.padEnd(16)} | ${String(s.COMPLETED).padStart(4)} | ${String(s.IN_PROGRESS).padStart(4)} | ${String(s.NOT_STARTED).padStart(4)} | ${b} |`;
  }).join('\n');

  return `<!-- BEGIN_AUTO_UPDATE -->
> ⚡ Auto-updated by hook on every mobile file save · Last updated: ${date}

## 📊 Overall Progress

\`\`\`
Total     ${bar(counts.COMPLETED, counts.IN_PROGRESS, total)} ${counts.COMPLETED + counts.IN_PROGRESS}/${total} screens touched
Done   ✅ ${'█'.repeat(Math.round((counts.COMPLETED / total) * 20)).padEnd(20)} ${counts.COMPLETED}/${total} (${Math.round((counts.COMPLETED / total) * 100)}%)
WIP    🔄 ${'▒'.repeat(Math.round((counts.IN_PROGRESS / total) * 20)).padEnd(20)} ${counts.IN_PROGRESS}/${total} (${Math.round((counts.IN_PROGRESS / total) * 100)}%)
Todo   ❌ ${'░'.repeat(Math.round((counts.NOT_STARTED / total) * 20)).padEnd(20)} ${counts.NOT_STARTED}/${total} (${Math.round((counts.NOT_STARTED / total) * 100)}%)
Overall   [${overallPct}%]
\`\`\`

## 🗺️ Section Breakdown

| Section          | Done | WIP  | Todo | Progress           |
|------------------|-----:|-----:|-----:|--------------------|
${sectionTable}

## ⚡ Quick Status Map

\`\`\`
${quickMap}
\`\`\`
<!-- END_AUTO_UPDATE -->`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function run() {
  const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  let changed = false;

  // Update statuses
  for (const [section, screens] of Object.entries(SCREEN_MAP)) {
    if (!raw[section]) raw[section] = {};
    for (const [name, relPath] of Object.entries(screens)) {
      const current = raw[section][name] || 'NOT_STARTED';
      const next    = detectStatus(relPath, current);
      if (next !== current) {
        raw[section][name] = next;
        changed = true;
        console.log(`  ${section}/${name}: ${current} → ${next}`);
      }
    }
  }

  // Recount for _meta
  let done = 0, wip = 0, todo = 0;
  for (const [section, screens] of Object.entries(raw)) {
    if (section === '_meta') continue;
    for (const status of Object.values(screens)) {
      if (status === 'COMPLETED')   done++;
      else if (status === 'IN_PROGRESS') wip++;
      else todo++;
    }
  }
  const total = done + wip + todo;
  const pct   = Math.round(((done + wip * 0.5) / total) * 100);

  const prevMeta = raw._meta || {};
  if (prevMeta.completed !== done || prevMeta.in_progress !== wip || prevMeta.not_started !== todo) {
    raw._meta = { ...prevMeta, completed: done, in_progress: wip, not_started: todo, completion_pct: pct, total_screens: total };
    changed = true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const autoBlock = buildAutoBlock(raw, today);

  // Update JSON only if changed
  if (changed) {
    fs.writeFileSync(JSON_FILE, JSON.stringify(raw, null, 2) + '\n');
    console.log(`✅ screen-checklist.json updated (${done} done, ${wip} WIP, ${todo} todo)`);
  }

  // Update markdown auto-update block (always refresh date+stats)
  let md = fs.readFileSync(MD_FILE, 'utf8');
  const begin = '<!-- BEGIN_AUTO_UPDATE -->';
  const end   = '<!-- END_AUTO_UPDATE -->';
  const s = md.indexOf(begin);
  const e = md.indexOf(end);

  if (s !== -1 && e !== -1) {
    const newMd = md.slice(0, s) + autoBlock + md.slice(e + end.length);
    if (newMd !== md) {
      fs.writeFileSync(MD_FILE, newMd);
      console.log(`✅ mobile-development-progress.md stats refreshed`);
    }
  } else {
    console.warn('⚠️  No BEGIN/END_AUTO_UPDATE markers found in markdown — skipping md update');
  }

  if (!changed) console.log('✓ No status changes detected');
}

run();
