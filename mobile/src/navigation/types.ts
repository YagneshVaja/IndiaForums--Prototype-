export type OnboardingStackParamList = {
  OnboardingSlides: undefined;
  GetStarted: undefined;
};

export type RootStackParamList = {
  /** First-time users — Onboarding slides → GetStarted */
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
    // Server-confirmed stats from POST /quizzes/{id}/response — null when
    // submit failed or the user is unauthenticated.
    server?: {
      percentageBelow: number;
      totalCount: number;
      totalUserPoints: number;
      finalResultForUser: number;
    } | null;
  };
  QuizLeaderboard: { id: string };
  Galleries: undefined;
  // Either pass a full Gallery object (list → detail flow, renders instantly)
  // or just an id + optional hints (deep-link / shorts flow, fetches on mount).
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
  Movies: undefined;
  // Pass the Movie object from the hub list so the hero renders instantly;
  // detail-only fields (story/cast/reviews) are fetched on mount.
  MovieDetail: { movie: import('../services/api').Movie };
  WriteMovieReview: {
    titleId: number;
    titleName: string;
    /** When supplied, the screen opens in edit mode for the user's existing review. */
    existingReview?: {
      reviewId: number;
      rating: number;     // 1–5 stars (already converted from server percent)
      subject: string;
      message: string;
    };
  };
  // Forum thread reachable from Movie → Discussion. Same shape as the
  // ForumsStack version so we can reuse TopicDetailScreen as-is.
  TopicDetail:
    | {
        topic: import('../services/api').ForumTopic;
        forum?: import('../services/api').Forum;
        jumpToLast?: boolean;
        autoAction?: 'like' | 'reply' | 'quote';
      }
    | { topicId: string; forumId?: string; focusPostId?: string };
  /** Pushed from the home Channels section "See full ranking" CTA. */
  ChannelDetail: { channelId: number };
  /** Forum thread reachable from ShowDetail's "Open discussion" CTA. Same
   *  shape as the ForumsStack version so we can reuse ForumThreadScreen as-is. */
  ForumThread: { forum: import('../services/api').Forum };
  /**
   * Pushed when a user taps a show on the channel detail grid. We pass the
   * full ChannelOverviewShow so the hero renders instantly off the cached
   * poster + rank data; the forum-backed sections fetch on mount.
   */
  ShowDetail: {
    show: import('../services/api').ChannelOverviewShow;
    /** Channel name + brand color for the hero metadata strip. */
    channelName?: string;
    channelBrand?: string;
  };
};

export type NewsStackParamList = {
  // initialCategory is set when entering News from Home's "View all" pill, so
  // the News tab opens pre-filtered to whatever category chip was active on
  // Home. Lowercase id matching NEWS_CATEGORIES (e.g. 'movies', 'television').
  NewsMain: { initialCategory?: string } | undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CategoryFeed: { category: string };
  /**
   * Pushed from the NewsMain "VIEW ALL NEWS" CTA. Pure article infinite-scroll
   * for the currently selected category + subcategory — no interleaved video /
   * quiz / gallery sections. Carries the active filter forward so the destination
   * matches what the user was just looking at.
   */
  ArticlesFullList: { category: string; subCat: string };
};

export type ForumsStackParamList = {
  ForumsMain: undefined;
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail:
    | {
        topic: import('../services/api').ForumTopic;
        forum?: import('../services/api').Forum;
        jumpToLast?: boolean;
        /** When set, auto-fire the matching action on the first post once posts load. */
        autoAction?: 'like' | 'reply' | 'quote';
      }
    | { topicId: string; forumId?: string; focusPostId?: string };
  ReportsInbox: { forum: import('../services/api').Forum };
};

export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResults: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  VideoDetail: { video: import('../services/api').Video };
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail:
    | {
        topic: import('../services/api').ForumTopic;
        forum?: import('../services/api').Forum;
        jumpToLast?: boolean;
        autoAction?: 'like' | 'reply' | 'quote';
      }
    | { topicId: string; forumId?: string; focusPostId?: string };
  MovieDetail: { movie: import('../services/api').Movie };
};

export type MySpaceStackParamList = {
  MySpaceMain: undefined;
  MySpaceSettings: undefined;
  Profile: { userId: string };
  EditProfile: undefined;
  Username: undefined;
  Status: undefined;
  Devices: undefined;
  VerifyEmail: undefined;
  EmailLogs: undefined;
  ChangePassword: undefined;
  BadgeDetail: { badgeId: string; userId?: string };
  MyActivities: undefined;
  HelpCenter: undefined;
  About: undefined;
  Buddies: undefined;
  Notifications: undefined;
  NotificationDispatch: { topicId: string; focusPostId?: string };
  Messages: undefined;
  MessageThread: { threadId: string };
  MessageFolders: undefined;
  Compose: { recipientId?: string; draftId?: string };
  // Forum entry points reachable from profile tabs (Posts, Watching, Forums).
  // Same shape as ForumsStackParamList — screens are reused as-is.
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail:
    | {
        topic: import('../services/api').ForumTopic;
        forum?: import('../services/api').Forum;
        jumpToLast?: boolean;
        autoAction?: 'like' | 'reply' | 'quote';
      }
    | { topicId: string; forumId?: string; focusPostId?: string };
  // Article entry point reachable from the Comments tab — comments link out
  // to the article they were posted on.
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
};
