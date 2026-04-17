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

export type MainTabParamList = {
  HomeTab:    undefined;
  NewsTab:    undefined;
  ForumsTab:  undefined;
  SearchTab:  undefined;
  MySpaceTab: undefined;
};

export type HomeStackParamList = {
  Home:             undefined;
  Article:          { articleId: number; title: string };
  Galleries:        undefined;
  GalleryDetail:    { galleryId: number; title: string };
  FanFiction:       undefined;
  FanFictionDetail: { storyId: number; title: string };
  ChapterReader:    { chapterId: number; storyId: number; storyTitle: string };
  Quizzes:          undefined;
  QuizPlayer:       { quizId: number; title: string };
  WebStories:       undefined;
  WebStoryPlayer:   { startIndex: number };
  Shorts:           undefined;
  TagDetail:        { tagId: number; tagName: string; contentType: number };
  Profile:          { userId: number; username: string };
  Celebrity:        { celebrityId: number; name: string };
  Video:            { videoId: number; title: string };
  VideoDetail:      { videoId: number };
};

export type NewsStackParamList = {
  News:    undefined;
  Article: { articleId: number; title: string };
};

export type ForumsStackParamList = {
  Forums:      undefined;
  ForumList:   { forumId: number; forumTitle: string };
  TopicList:   { forumId: number; forumTitle: string };
  TopicDetail: { topicId: number; topicTitle: string };
};

export type SearchStackParamList = {
  Search:  undefined;
  Article: { articleId: number; title: string };
  Profile: { userId: number; username: string };
};

export type MySpaceStackParamList = {
  MySpace:         undefined;
  Profile:         { userId: number; username: string };
  AccountSettings: undefined;
  Notifications:   undefined;
  Activities:      undefined;
  Inbox:           undefined;
  Thread:          { threadId: number; subject: string };
  Compose:         { toUserId?: number; toUsername?: string };
  Folders:         undefined;
  Devices:         undefined;
  HelpCenter:      undefined;
  Buddies:         undefined;
};
