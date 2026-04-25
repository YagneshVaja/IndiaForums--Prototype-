// DTOs mirroring api2.indiaforums.com OpenAPI spec (v1).
// Field shapes follow the spec exactly — API returns both integer and
// string forms for IDs, so every id is typed as `number | string`.

export interface UsernameChangeLogDto {
  usernameChangeId: number | string;
  userId: number | string;
  oldUsername: string;
  newUsername: string;
  lastUpdatedWhen: string | null;
}

export interface MyProfileResponseDto {
  userId: number | string;
  userName: string;
  displayName: string | null;
  email: string;
  phoneNumber: string | null;
  isEmailConfirmed: boolean;
  updateChecksum: string | null;
  groupId: number | string;
  statusCode: number | string;
  avatarType: number | string;
  avatarAccent: string | null;
  showCountry: number | string;
  countryCode: string | null;
  visitStreakCount: number | string;
  forumSignature: string | null;
  signatureJson: string | null;
  privacy: number | string;
  lastVisitedDate: string | null;
  commentCount: number | string | null;
  badgeJson: string | null;
  usernameChangeLog: UsernameChangeLogDto[];
  statusMessage: string | null;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  // Not in spec but real API includes these in practice:
  postCount?: number | string | null;
  joinDate?: string | null;
  rankName?: string | null;
  groupName?: string | null;
}

export interface UserProfileDto {
  userId: number | string;
  userName: string | null;
  displayName: string | null;
  email: string | null;
  groupId: number | string;
  statusCode: number | string;
  avatarType: number | string;
  avatarAccent: string | null;
  updateChecksum: string | null;
  privacy: number | string;
  lastVisitedDate: string | null;
  badgeJson: string | null;
  showFeeds: number | string;
  showScrapbook: number | string;
  showSlambook: number | string;
  showTestimonial: number | string;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  // Commonly returned even though not in minimal DTO:
  postCount?: number | string | null;
  commentCount?: number | string | null;
  groupName?: string | null;
  rankName?: string | null;
  joinDate?: string | null;
  forumSignature?: string | null;
  statusMessage?: string | null;
}

export interface BuddyDetailsDto {
  userMapId: number | string;
  friend: number | string;
  follow: number | string;
  block: number | string;
  userEmail: string | null;
}

export interface ActivityDto {
  activityId: number | string;
  contentTypeId: number | string;
  contentTypeValue: number | string;
  feedTypeId: number | string;
  wallUserId: number | string;
  wallUserName: string | null;
  userId: number | string;
  subject: string | null;
  content: string | null;
  contentId: string | null;
  pageUrl: string | null;
  contentUpdateChecksum: string | null;
  publishedWhen: string;
  lastEditedWhen: string | null;
  statusCode: number | string;
  likeCount: number | string;
  likeJsonData: string | null;
  commentCount: number | string;
  userJsonData: string | null;
  linkUrl: string | null;
  linkId: number | string;
  mediaCount: number | string;
  mediaJsonData: string | null;
  linkTypeId: number | string;
  imageUrl: string | null;
  userName: string | null;
  realName: string | null;
  updateChecksum: string | null;
  avatarType: number | string | null;
  avatarAccent: string | null;
  badgeJson: string | null;
  reactedEmojis: unknown[] | null;
  latestUserName: string | null;
  latestUserId: number | string | null;
}

export interface UserProfileResponseDto {
  user: UserProfileDto | null;
  loggedInUser: UserProfileDto | null;
  buddyDetails: BuddyDetailsDto | null;
  activities: ActivityDto[];
  mode: string;
  validationMessage: string | null;
  nextUrl: string | null;
  pageTitle: string;
  canonicalUrl: string | null;
}

export interface UserHoverCardDto {
  userId: number | string;
  userName: string | null;
  displayName: string | null;
  groupId: number | string;
  statusCode: number | string;
  badgeJson: string | null;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  userOnlineClass: string;
  countryFlagUnicode: string | null;
  isBlockAllowed: boolean;
  isWarningAllowed: boolean;
  isBanAllowed: boolean;
  isUserPostLinkVisible: boolean;
  isFriend: boolean;
  isFollowing: boolean;
  isBlocked: boolean;
  profileUrl: string | null;
  scrapbookUrl: string | null;
  slambookUrl: string | null;
  testimonialUrl: string | null;
  messageUrl: string | null;
  userPostUrl: string | null;
  userCommentUrl: string | null;
}

// ── Paginated list responses ────────────────────────────────────────────────

interface Paged {
  totalRecordCount: number | string;
  totalPages: number | string;
  currentPage: number | string;
  pageSize: number | string;
  nextUrl: string | null;
  previousUrl: string | null;
  firstUrl: string | null;
  lastUrl: string | null;
}

export interface MyPostTopicDto {
  topicId: number | string;
  forumId: number | string;
  topicTypeId: number | string;
  subject: string;
  pollId: number | string;
  viewCount: number | string;
  likeCount: number | string | null;
  locked: boolean;
  replyCount: number | string;
  statusCode: number | string;
  startThreadDate: string;
  lastThreadDate: string;
  startAuthorId: number | string;
  lastAuthorId: number | string;
  startThreadId: number | string;
  lastThreadId: number | string;
  startThreadUserName: string | null;
  lastThreadUserName: string | null;
  topicDesc: string | null;
  topicImage: string | null;
  pageUrl: string | null;
  linkTypeId: number | string | null;
  linkTypeValue: string | null;
  linkId: number | string;
  forumName: string | null;
  forumPageUrl: string | null;
  forumUpdateChecksum: string | null;
}

export type MyPostsResponseDto = Paged & {
  topics: MyPostTopicDto[];
  forumId: number | string | null;
  query: string | null;
  mode: string;
  validationMessage: string | null;
  user: UserProfileDto | null;
  buddyDetails: BuddyDetailsDto | null;
};

export interface MyCommentDto {
  commentId: number | string;
  parentCommentId: number | string | null;
  userId: number | string;
  contents: string;
  subject: string | null;
  replyCount: number | string;
  likeCount: number | string;
  disLikeCount: number | string;
  createdWhen: string;
  statusCode: number | string;
  imageUrl: string | null;
  provider: string | null;
  uploaderUrl: string | null;
  uploaderName: string | null;
  linkUrl: string | null;
  imageWidth: number | string;
  imageHeight: number | string;
  taggedBuddies: unknown[] | null;
}

export type MyCommentsResponseDto = Paged & {
  comments: MyCommentDto[];
  user: UserProfileDto | null;
  mode: string;
};

export interface BuddyDto {
  userId: number | string;
  userName: string;
  groupId: number | string;
  realName: string | null;
  userMapId: number | string | null;
  buddyListId: number | string | null;
  lastUpdatedWhen: string | null;
  groupName: string | null;
  avatarType: number | string;
  avatarAccent: string | null;
  lastVisitedDate: string | null;
  privacy: number | string;
  friendCheck: number | string;
  follow: number | string;
  friend: number | string;
  block: number | string;
  profileLogId: number | string | null;
  lastEditedWhen: string | null;
  updateChecksum: string | null;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
}

export type MyBuddyListResponseDto = Paged & {
  buddies: BuddyDto[];
  mode: string;
};

export interface UserBadgeDto {
  badgeId: number | string;
  name: string;
  badgeName: string;
  description: string | null;
  class: string | null;
  badgeCount: number | string;
  highestLevel: number | string;
  level: number | string;
  priorityLevel: number | string;
  badgeLevelId: number | string;
  pageUrl: string | null;
  updateChecksum: string | null;
  thumbnailUrl: string | null;
}

export interface MyBadgesResponseDto {
  badges: UserBadgeDto[];
}

export interface UserBadgesResponseDto {
  user: UserProfileDto | null;
  buddyDetails: BuddyDetailsDto | null;
  badges: UserBadgeDto[];
}

export interface BadgeDetailDto {
  badgeId: number | string;
  name: string;
  description: string | null;
  class: string | null;
  points: number | string;
  limit: number | string;
  image: boolean;
  hasImage: boolean;
  awardManually: boolean;
  isRepeatable: boolean;
  statusCode: number | string;
  priorityLevel: number | string;
  level: number | string;
  pageUrl: string | null;
  updateChecksum: string | null;
  badgeLevelId: number | string;
  thumbnailUrl: string | null;
}

export interface UserBadgeLevelDto {
  contentTypeId: number | string;
  contentTypeValue: number | string;
  superSeeded: boolean;
  createdWhen: string;
  levelCounter: number | string;
  level: number | string;
  authorNote: string | null;
  badgeLevelId: number | string;
  title: string | null;
  pageUrl: string | null;
  updateChecksum: string | null;
  summary: string | null;
  points: number | string;
  awardedBy: number | string | null;
  userName: string | null;
  displayName: string | null;
  linkUrl: string | null;
  thumbnailUrl: string | null;
}

export interface BadgeDetailsResponseDto {
  badge: BadgeDetailDto | null;
  badgeLevels: UserBadgeLevelDto[];
  user: UserProfileDto | null;
  buddyDetails: BuddyDetailsDto | null;
}

export interface MyForumDto {
  forumId: number | string;
  categoryId: number | string | null;
  forumName: string;
  forumDescription: string | null;
  dateStarted: string;
  topicsCount: number | string;
  postsCount: number | string;
  pageUrl: string | null;
  updateChecksum: string | null;
  hasBanner: boolean | null;
  hasThumbnail: boolean | null;
  createdBy: number | string;
  followCount: number | string;
  joinType: number | string;
  forumType: number | string;
  currentRank: number | string;
  previousRank: number | string;
  watchId: number | string;
  emailFrequency: number | string;
  isFavourite: boolean;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
}

export interface InvitedForumDto {
  forumId: number | string;
  forumName: string;
  topicsCount: number | string;
  postsCount: number | string;
  followCount: number | string;
  joinType: number | string;
  forumType: number | string;
  createdBy: number | string;
  pageUrl: string | null;
}

export type MyFavouriteForumsResponseDto = Paged & {
  forums: MyForumDto[];
  invitedForums: InvitedForumDto[];
  requestedForums: InvitedForumDto[];
  user: UserProfileDto | null;
};

export interface CelebrityDto {
  personId: number | string;
  displayName: string;
  pageUrl: string | null;
  updateChecksum: string | null;
  thumbnailUrl: string | null;
}

export type MyFavouriteCelebritiesResponseDto = Paged & {
  celebrities: CelebrityDto[];
  user: UserProfileDto | null;
};

export interface MovieDto {
  titleId: number | string;
  titleName: string;
  startYear: number | string | null;
  pageUrl: string | null;
  updateChecksum: string | null;
  hasThumbnail: boolean;
  audienceRating: number | string;
  criticRating: number | string;
  audienceRatingCount: number | string;
  criticRatingCount: number | string;
  averageRating: number | string;
  posterUrl: string | null;
}

export type MyFavouriteMoviesResponseDto = Paged & {
  movies: MovieDto[];
  user: UserProfileDto | null;
};

export interface ShowDto {
  titleId: number | string;
  titleName: string;
  pageUrl: string | null;
  updateChecksum: string | null;
  forumId: number | string;
  hasThumbnail: boolean;
  posterUrl: string | null;
}

export interface MyFavouriteShowsResponseDto {
  shows: ShowDto[];
  user: UserProfileDto | null;
  currentPage: number | string;
  pageSize: number | string;
}

export interface ForumDraftDto {
  forumDraftId: number | string;
  forumId: number | string;
  topicId: number | string | null;
  createdWhen: string;
  subject: string;
  message: string;
  forumName: string | null;
  pageUrl: string | null;
}

export interface MyForumDraftsResponseDto {
  drafts: ForumDraftDto[];
  totalCount: number | string;
  pageNumber: number | string;
  pageSize: number | string;
  totalPages: number | string;
}

export interface FollowingDto {
  userId: number | string;
  userName: string;
  displayName: string | null;
  avatarType: number | string;
  avatarAccent: string | null;
  updateChecksum: string | null;
  groupId: number | string;
  lastVisitedDate: string | null;
  privacy: number | string;
  emailNotify: boolean;
  pushNotify: boolean;
  avatarUrl: string | null;
}

export type MyFanFictionFollowingResponseDto = Paged & {
  following: FollowingDto[];
};

export interface FollowerDto {
  userId: number | string;
  userName: string;
  displayName: string | null;
  userMapId: number | string | null;
  avatarType: number | string;
  avatarAccent: string | null;
  updateChecksum: string | null;
  follow: number | string;
  friend: number | string;
  groupId: number | string;
  lastVisitedDate: string | null;
  privacy: number | string;
  avatarUrl: string | null;
}

export type MyFanFictionFollowersResponseDto = Paged & {
  followers: FollowerDto[];
};

export interface WarningDto {
  warningId: number | string;
  createdBy: number | string;
  userName: string | null;
  message: string;
  createdWhen: string;
  act: number | string;
  anonymous: boolean;
  warnLevel: number | string;
}

export interface MyWarningDetailsResponseDto {
  warningHistory: WarningDto[];
}

export interface UserActivitiesResponseDto {
  activities: ActivityDto[];
  user: UserProfileDto | null;
  nextUrl: string | null;
  displayTimelineValue: string | null;
  validationMessage: string | null;
}

// ── Buddy mutations ─────────────────────────────────────────────────────────

export interface BuddyActionResponseDto {
  isSuccess: boolean;
  message: string;
  buddyListId: number | string | null;
}

// ── Edit Profile / Preferences / Uploads ────────────────────────────────────

export interface UpdateProfileCommand {
  userId: number | string;
  displayName?: string | null;
  gender?: number | string | null;
  forumSignature?: string | null;
  dob?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  youtube?: string | null;
  instagram?: string | null;
  avatarTitle?: string | null;
  bio?: string | null;
  pronoun?: string | null;
  updateChecksum?: string | null;
  groupId: number | string;
}

export interface UpdateProfileResponseDto {
  success: boolean;
  message: string;
  updateChecksum: string | null;
}

// API returns every flag as `0 | 1` (but sometimes string-typed). Treat
// anything truthy as "on" for UI purposes.
export interface UserPreferencesDto {
  emailPm: number | string;
  emailPmReply: number | string;
  emailPmRead: number | string;
  emailQuote: number | string;
  emailCommentReply: number | string;
  emailScrapbook: number | string;
  emailSlambook: number | string;
  emailSlambookReply: number | string;
  emailTestimonial: number | string;
  emailFFNotify: number | string;
  emailFFChapterNotify: number | string;
  emailBadgeAchievement: number | string;
  emailNewsLetter: number | string;
  emailRecommendation: number | string;
  emailPostTag: number | string;
  emailDailyWeeklyMonthlyNotifications: number | string;
  emailNewTopicAlert: number | string;
  emailTopicDailyDigest: number | string;
  showSignature: number | string;
  showScrapbook: number | string;
  showSlambook: number | string;
  showTestimonial: number | string;
  showFeeds: number | string;
  showCountry: number | string;
  showMyPosts: number | string;
  allowUserTags: number | string;
  allowPM: number | string;
  privacy: number | string;
  countryCode: string | null;
}

export type UpdatePreferencesRequestDto = UserPreferencesDto;

export interface UploadUserImageRequestDto {
  imageData: string | null;
}

export interface UploadUserImageResponseDto {
  imageUrl: string | null;
  message: string;
  isRemoved: boolean;
}

// Stage a cropped image to the server's 24-hour temp folder. Body is a
// base64-encoded JPEG (no `data:` prefix). The returned `tempUrl` is the
// transient resource you can preview / pass on; `fileId`/`tempPath` let a
// follow-up call commit the file (e.g. when saving a profile or post).
export interface UploadCroppedImageRequestDto {
  imageData: string;
}

export interface UploadCroppedImageResponseDto {
  tempPath: string | null;
  fileId: string | null;
  tempUrl: string | null;
  // ISO 8601 — temp file expires 24h after upload.
  expiresAt: string | null;
}

// Forum reply / topic image attachment. API converts to WebP (q=95) and
// caps dimensions at 800x1200. mediaId/width/height come back as
// number | string (the spec allows both forms).
export interface UploadPostImageResponseDto {
  success: boolean;
  message: string;
  filePath: string | null;
  mediaId: number | string | null;
  width: number | string | null;
  height: number | string | null;
}

// ── Username change + history ───────────────────────────────────────────────

export interface ChangeUsernameRequestDto {
  newUsername: string;
}

export interface ChangeUsernameResponseDto {
  success: boolean;
  message: string;
  newUsername: string | null;
  nextChangeAllowedDate: string | null;
}

export interface UsernameHistoryResponseDto {
  currentUsername: string;
  changeHistory: UsernameChangeLogDto[];
  daysSinceLastChange: number | string | null;
  canChangeUsername: boolean;
  nextChangeAllowedDate: string | null;
  totalCount: number | string;
  pageNumber: number | string;
  pageSize: number | string;
  totalPages: number | string;
}

// ── Status ──────────────────────────────────────────────────────────────────

export interface UserStatusDto {
  userId: number | string;
  userName: string;
  statusCode: number | string;
  statusName: string;
  lockoutEnd: string | null;
  canChangeStatus: boolean;
}

export interface UpdateStatusRequestDto {
  statusCode: number | string;
}

export interface UpdateStatusResponseDto {
  success: boolean;
  message: string;
  newStatusCode: number | string;
  lockoutEnd: string | null;
}

// ── Devices ─────────────────────────────────────────────────────────────────

export interface DeviceDto {
  deviceTokenId: number | string;
  platform: string;
  deviceName: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  createdWhen: string;
  lastActiveWhen: string;
  enableNotifications: boolean;
  isActive: boolean;
}

export interface UserDevicesResponseDto {
  devices: DeviceDto[];
  totalCount: number | string;
}

export interface RegisterDeviceRequestDto {
  deviceToken: string;
  platform: string;
  deviceName?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
}

export interface RegisterDeviceResponseDto {
  success: boolean;
  message: string;
  deviceTokenId: number | string | null;
  isNewDevice: boolean;
}

export interface UpdateDevicePreferencesRequestDto {
  enableNotifications: boolean;
}

export interface UpdateDevicePreferencesResponseDto {
  success: boolean;
  message: string;
}

export interface UnregisterDeviceResponseDto {
  success: boolean;
  message: string;
}

// ── Email verification ──────────────────────────────────────────────────────

export interface ConfirmEmailRequestDto {
  token: string;
}

export interface ResendEmailVerificationRequestDto {
  // When present, the backend updates the pending email before resending.
  // For the "verify my current email" flow, leave this null.
  newEmail: string | null;
}

export interface EmailVerificationResponseDto {
  success: boolean;
  message: string;
  email: string | null;
  emailConfirmed: boolean;
}

export interface EmailLogDto {
  emailLogId: number | string;
  email: string;
  subject: string;
  sentWhen: string;
  status: string | null;
  emailType: string | null;
}

export interface EmailLogsResponseDto {
  email: string;
  userName: string;
  emailConfirmed: boolean;
  emailLogs: EmailLogDto[];
  totalCount: number | string;
}
