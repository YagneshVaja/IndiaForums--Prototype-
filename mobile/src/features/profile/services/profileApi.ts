import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../../../services/api';
import type {
  BuddyActionResponseDto,
  MyBadgesResponseDto,
  MyBuddyListResponseDto,
  MyCommentsResponseDto,
  MyFanFictionFollowersResponseDto,
  MyFanFictionFollowingResponseDto,
  MyFavouriteCelebritiesResponseDto,
  MyFavouriteForumsResponseDto,
  MyFavouriteMoviesResponseDto,
  MyFavouriteShowsResponseDto,
  MyForumDraftsResponseDto,
  MyPostsResponseDto,
  MyProfileResponseDto,
  MyWarningDetailsResponseDto,
  UserFanFictionDto,
  BadgeDetailsResponseDto,
  UpdatePreferencesRequestDto,
  UpdateProfileCommand,
  UpdateProfileResponseDto,
  UploadCroppedImageRequestDto,
  UploadCroppedImageResponseDto,
  UploadUserImageRequestDto,
  UploadUserImageResponseDto,
  UserActivitiesResponseDto,
  UserBadgesResponseDto,
  UserHoverCardDto,
  UserPreferencesDto,
  UserProfileResponseDto,
  ChangeUsernameRequestDto,
  ChangeUsernameResponseDto,
  UsernameHistoryResponseDto,
  UserStatusDto,
  UpdateStatusRequestDto,
  UpdateStatusResponseDto,
  UserDevicesResponseDto,
  UpdateDevicePreferencesRequestDto,
  UpdateDevicePreferencesResponseDto,
  UnregisterDeviceResponseDto,
  ConfirmEmailRequestDto,
  EmailLogsResponseDto,
  EmailVerificationResponseDto,
  ResendEmailVerificationRequestDto,
} from '../types';

type Id = number | string;

interface Page {
  pn?: number;
  ps?: number;
  mode?: string;
}

// ── Profile (hero + identity) ───────────────────────────────────────────────

export function getMyProfile() {
  return apiClient.get<MyProfileResponseDto>('/me').then((r) => r.data);
}

export function getUserProfile(userId: Id, params?: { mode?: string; cursor?: string; pageSize?: number }) {
  return apiClient
    .get<UserProfileResponseDto>(`/users/${userId}/profile`, { params })
    .then((r) => r.data);
}

export function getUserHoverCard(userId: Id) {
  return apiClient.get<UserHoverCardDto>(`/users/${userId}/hover-card`).then((r) => r.data);
}

// ── Activity tab ────────────────────────────────────────────────────────────

export function getUserActivities(
  userId: Id,
  params: { mode: string; pageSize: number; cursor?: string | number; yearWeekNum?: string },
) {
  return apiClient
    .get<UserActivitiesResponseDto>(`/user-activities/${userId}`, { params })
    .then((r) => r.data);
}

// ── Fan-fictions authored by a user ─────────────────────────────────────────
// /fan-fictions accepts a (contentType, contentId) filter pair. ContentType=9
// means "user" per the search-endpoint description in the OpenAPI spec.
// Returns a normalized envelope so the profile tab can paginate uniformly.
const CONTENT_TYPE_USER = 9;

interface RawFanFictionsResponse {
  data?: { fanFictions?: UserFanFictionDto[]; items?: UserFanFictionDto[] };
  fanFictions?: UserFanFictionDto[];
  pagination?: {
    currentPage?: number | string;
    pageSize?: number | string;
    totalPages?: number | string;
    totalItems?: number | string;
    hasNextPage?: boolean;
  };
}

export async function getUserFanFictions(
  userId: Id,
  params: { pn: number; ps: number },
): Promise<{ items: UserFanFictionDto[]; total: number; page: number; totalPages: number }> {
  const { data } = await apiClient.get<RawFanFictionsResponse>('/fan-fictions', {
    params: {
      contentType: CONTENT_TYPE_USER,
      contentId: userId,
      pageNumber: params.pn,
      pageSize: params.ps,
    },
  });
  const list =
    data?.data?.fanFictions ??
    data?.data?.items ??
    data?.fanFictions ??
    [];
  const p = data?.pagination ?? {};
  const numv = (v: number | string | undefined): number => {
    if (v == null) return 0;
    return typeof v === 'number' ? v : parseInt(v, 10) || 0;
  };
  return {
    items: list,
    total: numv(p.totalItems),
    page: numv(p.currentPage) || params.pn,
    totalPages: numv(p.totalPages) || 1,
  };
}

// ── Posts / Comments tabs ───────────────────────────────────────────────────

export function getMyPosts(params: Page & { fid?: number; q?: string; pc?: number; pr?: number }) {
  return apiClient.get<MyPostsResponseDto>('/my-posts', { params }).then((r) => r.data);
}

export function getUserPosts(userId: Id, params: Page & { fid?: number; q?: string; pc?: number; pr?: number }) {
  return apiClient
    .get<MyPostsResponseDto>(`/users/${userId}/posts`, { params })
    .then((r) => r.data);
}

export function getMyComments(params: Page) {
  return apiClient.get<MyCommentsResponseDto>('/my-comments', { params }).then((r) => r.data);
}

export function getUserComments(userId: Id, params: Page) {
  return apiClient
    .get<MyCommentsResponseDto>(`/users/${userId}/comments`, { params })
    .then((r) => r.data);
}

// ── Buddies tab ─────────────────────────────────────────────────────────────

export function getMyBuddies(params: Page & { username?: string }) {
  return apiClient.get<MyBuddyListResponseDto>('/my-buddy-list', { params }).then((r) => r.data);
}

export function getUserBuddies(userId: Id, params: Page & { q?: string }) {
  return apiClient
    .get<MyBuddyListResponseDto>(`/users/${userId}/buddylist`, { params })
    .then((r) => r.data);
}

// ── Forums tab ──────────────────────────────────────────────────────────────

export function getMyForums(params: Page) {
  return apiClient.get<MyFavouriteForumsResponseDto>('/my-favourite-forums', { params }).then((r) => r.data);
}

export function getUserForums(userId: Id, params: Page) {
  return apiClient
    .get<MyFavouriteForumsResponseDto>(`/users/${userId}/forums`, { params })
    .then((r) => r.data);
}

// ── Favourites tab (celebs + movies + shows) ────────────────────────────────

export function getMyCelebs(params: Page) {
  return apiClient
    .get<MyFavouriteCelebritiesResponseDto>('/my-favourite-celebrities', { params })
    .then((r) => r.data);
}

export function getUserCelebs(userId: Id, params: Page) {
  return apiClient
    .get<MyFavouriteCelebritiesResponseDto>(`/users/${userId}/celebs`, { params })
    .then((r) => r.data);
}

export function getMyMovies(params: Page) {
  return apiClient.get<MyFavouriteMoviesResponseDto>('/my-favourite-movies', { params }).then((r) => r.data);
}

export function getUserMovies(userId: Id, params: Page) {
  return apiClient
    .get<MyFavouriteMoviesResponseDto>(`/users/${userId}/movies`, { params })
    .then((r) => r.data);
}

export function getMyShows(params: Page) {
  return apiClient.get<MyFavouriteShowsResponseDto>('/my-favourite-shows', { params }).then((r) => r.data);
}

export function getUserShows(userId: Id, params: Page) {
  return apiClient
    .get<MyFavouriteShowsResponseDto>(`/users/${userId}/shows`, { params })
    .then((r) => r.data);
}

// ── Badges tab ──────────────────────────────────────────────────────────────

export function getMyBadges() {
  return apiClient.get<MyBadgesResponseDto>('/my-badges').then((r) => r.data);
}

export function getUserBadges(userId: Id) {
  return apiClient.get<UserBadgesResponseDto>(`/users/${userId}/badges`).then((r) => r.data);
}

export function getMyBadgeDetail(badgeId: Id) {
  return apiClient
    .get<BadgeDetailsResponseDto>(`/my-badges/${badgeId}`)
    .then((r) => r.data);
}

export function getUserBadgeDetail(userId: Id, badgeId: Id) {
  return apiClient
    .get<BadgeDetailsResponseDto>(`/users/${userId}/badges/${badgeId}`)
    .then((r) => r.data);
}

// ── Self-only tabs ──────────────────────────────────────────────────────────

export function getMyDrafts(params: Page) {
  return apiClient.get<MyForumDraftsResponseDto>('/my-forum-drafts', { params }).then((r) => r.data);
}

export function getMyWatchedTopics(params: Page & { pc?: number; pr?: number }) {
  return apiClient.get<MyPostsResponseDto>('/my-watched-topics', { params }).then((r) => r.data);
}

export function getMyFFFollowing(params: Page) {
  return apiClient
    .get<MyFanFictionFollowingResponseDto>('/my-fanfiction-following', { params })
    .then((r) => r.data);
}

export function getMyFFFollowers(params: Page) {
  return apiClient
    .get<MyFanFictionFollowersResponseDto>('/my-fanfiction-followers', { params })
    .then((r) => r.data);
}

export function getMyWarnings() {
  return apiClient.get<MyWarningDetailsResponseDto>('/my-warnings').then((r) => r.data);
}

// ── Buddy actions (mutations) ───────────────────────────────────────────────
// Request body shapes match the API DTOs exactly:
//   SendFriendRequestDto   { recipientId }
//   AcceptFriendRequestDto { requestId }
//   CancelFriendRequestDto { requestId }
//   BlockUserDto           { requestId, blockedUserId, block, isFriend }
// `requestId` is the userMapId / buddyListId row id. `recipientId` is the
// target user's userId for brand-new requests.

export function sendFriendRequest(recipientId: Id) {
  return apiClient
    .post<BuddyActionResponseDto>('/user-buddies/friend-request', { recipientId })
    .then((r) => r.data);
}

export function acceptFriendRequest(requestId: Id) {
  return apiClient
    .post<BuddyActionResponseDto>('/user-buddies/accept-friend-request', { requestId })
    .then((r) => r.data);
}

export function cancelFriendRequest(requestId: Id) {
  return apiClient
    .post<BuddyActionResponseDto>('/user-buddies/cancel-friend-request', { requestId })
    .then((r) => r.data);
}

export function blockUser(params: {
  requestId: Id;
  blockedUserId: Id;
  block: boolean;
  isFriend: boolean;
}) {
  return apiClient
    .post<BuddyActionResponseDto>('/user-buddies/block-user', params)
    .then((r) => r.data);
}

// ── Edit profile ────────────────────────────────────────────────────────────

export function updateMyProfile(body: UpdateProfileCommand) {
  return apiClient.put<UpdateProfileResponseDto>('/me', body).then((r) => r.data);
}

// ── Preferences ─────────────────────────────────────────────────────────────

export function getMyPreferences() {
  return apiClient.get<UserPreferencesDto>('/me/preferences').then((r) => r.data);
}

export function updateMyPreferences(body: UpdatePreferencesRequestDto) {
  return apiClient.put<void>('/me/preferences', body).then((r) => r.data);
}

// ── Image uploads ───────────────────────────────────────────────────────────
// API accepts a base64-encoded imageData string (no data:URL prefix).
//
// The /upload/* endpoints were returning 415 from RN despite the apiClient
// default Content-Type being `application/json`. Pinning the header at the
// call site and owning JSON.stringify ourselves bypasses any header munging
// from axios/RN-fetch and keeps the wire shape identical to the web client.
const JSON_UPLOAD_CONFIG: AxiosRequestConfig = {
  headers: { 'Content-Type': 'application/json' },
  transformRequest: [(data) => JSON.stringify(data)],
};

export function uploadUserThumbnail(body: UploadUserImageRequestDto) {
  return apiClient
    .post<UploadUserImageResponseDto>('/upload/user-thumbnail', body, JSON_UPLOAD_CONFIG)
    .then((r) => r.data);
}

export function uploadUserBanner(body: UploadUserImageRequestDto) {
  return apiClient
    .post<UploadUserImageResponseDto>('/upload/user-banner', body, JSON_UPLOAD_CONFIG)
    .then((r) => r.data);
}

// Stage a cropped image in the 24h temp folder. Use this when you need a
// preview URL before committing — e.g. an image picker that shows the
// cropped result, gets confirmation, then runs a follow-up save.
export function uploadCroppedImage(body: UploadCroppedImageRequestDto) {
  return apiClient
    .post<UploadCroppedImageResponseDto>('/upload/cropped-image', body, JSON_UPLOAD_CONFIG)
    .then((r) => r.data);
}

// ── Username ────────────────────────────────────────────────────────────────

export function updateMyUsername(body: ChangeUsernameRequestDto) {
  return apiClient.put<ChangeUsernameResponseDto>('/me/username', body).then((r) => r.data);
}

export function getMyUsernameHistory() {
  return apiClient.get<UsernameHistoryResponseDto>('/me/username/history').then((r) => r.data);
}

// ── Status ──────────────────────────────────────────────────────────────────

export function getMyStatus() {
  return apiClient.get<UserStatusDto>('/me/status').then((r) => r.data);
}

export function updateMyStatus(body: UpdateStatusRequestDto) {
  return apiClient.put<UpdateStatusResponseDto>('/me/status', body).then((r) => r.data);
}

// ── Devices ─────────────────────────────────────────────────────────────────

export function getDevices() {
  return apiClient.get<UserDevicesResponseDto>('/devices').then((r) => r.data);
}

export function removeDevice(deviceId: Id) {
  return apiClient
    .delete<UnregisterDeviceResponseDto>(`/devices/${deviceId}`)
    .then((r) => r.data);
}

export function updateDevicePreferences(deviceId: Id, body: UpdateDevicePreferencesRequestDto) {
  return apiClient
    .put<UpdateDevicePreferencesResponseDto>(`/devices/${deviceId}/preferences`, body)
    .then((r) => r.data);
}

// ── Email verification ──────────────────────────────────────────────────────

export function confirmEmail(body: ConfirmEmailRequestDto) {
  return apiClient
    .post<EmailVerificationResponseDto>('/email-verification/confirm', body)
    .then((r) => r.data);
}

// newEmail is optional — omit (or pass null) for the "verify my current email"
// flow; pass a new email to change it before resending.
export function resendEmailVerification(body?: ResendEmailVerificationRequestDto) {
  return apiClient
    .post<EmailVerificationResponseDto>('/email-verification/resend', body ?? null)
    .then((r) => r.data);
}

export function getEmailLogs() {
  return apiClient.get<EmailLogsResponseDto>('/email-verification/logs').then((r) => r.data);
}
