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
  FanFictionAuthors: undefined;
  AuthorFollowers: { authorId: string };
  Videos: undefined;
  VideoDetail: { video: import('../services/api').Video };
  Shorts: undefined;
  WebStories: undefined;
  WebStoryPlayer: { id: string };
  Quizzes: undefined;
  QuizPlayer: { id: string };
  QuizResult: { id: string; score: number };
  QuizLeaderboard: { id: string };
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
  ChangePassword: undefined;
  MyArticles: undefined;
  MyFanFiction: undefined;
  Followers: { userId: string };
  Following: { userId: string };
  Notifications: undefined;
  Messages: undefined;
  MessageThread: { threadId: string };
  Compose: { recipientId?: string };
};
