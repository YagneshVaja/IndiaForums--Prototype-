export type OnboardingStackParamList = {
  Splash: undefined;
  OnboardingSlides: undefined;
  GetStarted: undefined;
};

export type RootStackParamList = {
  /** First-time users — shows Splash → Onboarding → GetStarted */
  Onboarding: undefined;
  /** Unauthenticated browsing (read-only) */
  Guest: undefined;
  /** Sign in / register flow */
  Auth: {
    screen?: 'Login' | 'Register' | 'ForgotPassword';
  };
  /** Authenticated main tabs */
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};

// ---------------------------------------------------------------------------
// Tab navigator
// ---------------------------------------------------------------------------

export type MainTabParamList = {
  Home: undefined;
  News: undefined;
  Forums: undefined;
  Search: undefined;
  MySpace: undefined;
};

// ---------------------------------------------------------------------------
// Stack param lists
// ---------------------------------------------------------------------------

export type HomeStackParamList = {
  HomeMain: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CategoryFeed: { category: string };
  Celebrities: undefined;
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  FanFiction: undefined;
  FanFictionDetail: { id: string };
  ChapterReader: { fanFictionId: string; chapterId: string };
  Videos: undefined;
  VideoDetail: { video: import('../services/api').Video };
  Shorts: undefined;
  WebStories: undefined;
  WebStoryPlayer: {
    stories: import('../services/api').WebStorySummary[];
    index: number;
  };
  Quizzes: undefined;
  QuizDetail: { id: string; title?: string; thumbnail?: string | null };
  QuizPlayer: { id: string };
  QuizResult: {
    id: string;
    score: number;
    answers?: { questionId: number; optionIdx: number; correct: boolean }[];
  };
  QuizLeaderboard: { id: string };
  Galleries: undefined;
  // Either pass a full Gallery object (list → detail flow, renders instantly)
  // or just an id + optional hints (deep-link / shorts flow, fetches on mount).
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
};

export type NewsStackParamList = {
  NewsMain: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CategoryFeed: { category: string };
};

export type ForumsStackParamList = {
  ForumsMain: undefined;
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail: {
    topic: import('../services/api').ForumTopic;
    forum?: import('../services/api').Forum;
  };
  ReportsInbox: { forum: import('../services/api').Forum };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { id: string };
};

export type MySpaceStackParamList = {
  MySpaceMain: undefined;
  Profile: { userId: string };
  EditProfile: undefined;
  Username: undefined;
  Status: undefined;
  Devices: undefined;
  VerifyEmail: undefined;
  EmailLogs: undefined;
  ChangePassword: undefined;
  BadgeDetail: { badgeId: string; userId?: string };
  MyArticles: undefined;
  MyActivities: undefined;
  MyFanFiction: undefined;
  HelpCenter: undefined;
  About: undefined;
  Buddies: undefined;
  Followers: { userId: string };
  Following: { userId: string };
  Notifications: undefined;
  Messages: undefined;
  MessageThread: { threadId: string };
  MessageFolders: undefined;
  Compose: { recipientId?: string };
};
