export type OnboardingStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
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
  ArticleDetail: { id: string };
  CategoryFeed: { category: string };
  CelebrityProfile: { id: string };
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

export type NewsStackParamList = {
  NewsMain: undefined;
  ArticleDetail: { id: string };
  CategoryFeed: { category: string };
};

export type ForumsStackParamList = {
  ForumsMain: undefined;
  ForumList: { category?: string };
  TopicList: { forumId: string };
  TopicDetail: { topicId: string };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  ArticleDetail: { id: string };
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
