import api, { PAGINATION_DEFAULTS } from './api';

function userPath(userId: number | string) {
  return `/users/${userId}`;
}

// ── Own profile (authenticated user) ─────────────────────────────────────────
// Note: GET /me is broken backend-side. To load the current user's profile,
// call getProfile(currentUserId) instead — it returns { user, loggedInUser }.
export function updateMyProfile(data: any)              { return api.put('/me', data); }
export function getMyPreferences()                      { return api.get('/me/preferences'); }
export function updateMyPreferences(data: any)          { return api.put('/me/preferences', data); }
export function getMyPosts(params: any = {})               { return api.get('/my-posts', { params }); }
export function getMyPostsByTopic(params: any = {})        { return api.get('/my-posts-by-topic', { params }); }
export function getMyComments(params: any = {})            { return api.get('/my-comments', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyBadges()                              { return api.get('/my-badges'); }
export function getMyFanfictionFollowers(params: any = {}) { return api.get('/my-fanfiction-followers', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyFanfictionAuthors(params: any = {})   { return api.get('/my-fanfiction-following', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyForumDrafts(params: any = {})         { return api.get('/my-forum-drafts',         { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyCelebs(params: any = {})              { return api.get('/my-favourite-celebrities', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyForums(params: any = {})              { return api.get('/my-favourite-forums',     { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyMovies(params: any = {})              { return api.get('/my-favourite-movies',     { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyShows(params: any = {})               { return api.get('/my-favourite-shows',      { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyWatchingTopics(params: any = {})      { return api.get('/my-watched-topics',       { params: { ...PAGINATION_DEFAULTS, pr: 0, ...params } }); }
export function getMyWarningDetails()                      { return api.get('/my-warnings'); }
export function getMyBuddyList(params: any = {})           { return api.get('/my-buddy-list',           { params: { mode: 'bl', ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyUsernameHistory()                     { return api.get('/me/username/history'); }
export function updateMyUsername(data: any)                { return api.put('/me/username', data); }
export function getMyStatus()                              { return api.get('/me/status'); }
export function updateMyStatus(data: any)                  { return api.put('/me/status', data); }

// ── Other user's profile ─────────────────────────────────────────────────────

/**
 * Lightweight hover-card for a user — avatar, banner, online status, country
 * flag, permission flags, relationship flags, and navigation URLs.
 */
export function getHoverCard(userId: number | string) { return api.get(`${userPath(userId)}/hover-card`); }

export function getProfile(userId: number | string)                              { return api.get(`${userPath(userId)}/profile`); }
export function getActivities(userId: number | string, params: any = {})        { return api.get(`${userPath(userId)}/activities/load-more`, { params }); }
export function getPosts(userId: number | string, params: any = {})             { return api.get(`${userPath(userId)}/posts`, { params }); }
export function getPostsByTopic(userId: number | string, params: any = {})      { return api.get(`${userPath(userId)}/posts-by-topic`, { params }); }
export function getComments(userId: number | string, params: any = {})          { return api.get(`${userPath(userId)}/comments`, { params }); }
export function getBuddyList(userId: number | string, params: any = {})         { return api.get(`${userPath(userId)}/buddylist`, { params }); }
export function getMovies(userId: number | string, params: any = {})            { return api.get(`${userPath(userId)}/movies`, { params }); }
export function getShows(userId: number | string, params: any = {})             { return api.get(`${userPath(userId)}/shows`, { params }); }
export function getCelebs(userId: number | string, params: any = {})            { return api.get(`${userPath(userId)}/celebs`, { params }); }
export function getForums(userId: number | string, params: any = {})            { return api.get(`${userPath(userId)}/forums`, { params }); }
export function getFanfictionFollowers(userId: number | string, params: any = {}) { return api.get(`${userPath(userId)}/fanfiction-followers`, { params }); }
export function getUsernameChangeLog(userId: number | string)                    { return api.get(`${userPath(userId)}/username-change-log`); }
export function getBadges(userId: number | string)                               { return api.get(`${userPath(userId)}/badges`); }
export function getBadgeDetail(userId: number | string, badgeId: number | string) { return api.get(`${userPath(userId)}/badges/${badgeId}`); }
