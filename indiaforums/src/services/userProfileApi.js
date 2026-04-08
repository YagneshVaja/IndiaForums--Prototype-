import api, { PAGINATION_DEFAULTS } from './api';

function userPath(userId) {
  return `/users/${userId}`;
}

// ── Own profile (authenticated user) ─────────────────────────────────────────
// Note: GET /me is broken backend-side. To load the current user's profile,
// call getProfile(currentUserId) instead — it returns { user, loggedInUser }.
export function updateMyProfile(data)             { return api.put('/me', data); }
export function getMyPreferences()                { return api.get('/me/preferences'); }
export function updateMyPreferences(data)         { return api.put('/me/preferences', data); }
export function getMyPosts(params = {})              { return api.get('/my-posts', { params }); }
export function getMyPostsByTopic(params = {})       { return api.get('/my-posts-by-topic', { params }); }
export function getMyComments(params = {})           { return api.get('/my-comments', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyBadges()                        { return api.get('/my-badges'); }
export function getMyFanfictionFollowers(params = {}){ return api.get('/my-fanfiction-followers', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
// /my-fanfiction-following → authors the user follows (Phase 8)
export function getMyFanfictionAuthors(params = {})  { return api.get('/my-fanfiction-following', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyForumDrafts(params = {})        { return api.get('/my-forum-drafts',         { params: { ...PAGINATION_DEFAULTS, ...params } }); }
// /my-favourite-* — own-profile favourites (Phase 8)
export function getMyCelebs(params = {})             { return api.get('/my-favourite-celebrities', { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyForums(params = {})             { return api.get('/my-favourite-forums',     { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyMovies(params = {})             { return api.get('/my-favourite-movies',     { params: { ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyShows(params = {})              { return api.get('/my-favourite-shows',      { params: { ...PAGINATION_DEFAULTS, ...params } }); }
// /my-watched-topics → topics the user is subscribed to for email notifications (Phase 8)
export function getMyWatchingTopics(params = {})     { return api.get('/my-watched-topics',       { params: { ...PAGINATION_DEFAULTS, pr: 0, ...params } }); }
// /my-warnings → warning history for the authenticated user (Phase 8)
export function getMyWarningDetails()                { return api.get('/my-warnings'); }
// /my-buddy-list → buddy/friend/blocked/visitor lists; mode is required: bl|pl|wl|bll|vl
export function getMyBuddyList(params = {})          { return api.get('/my-buddy-list',           { params: { mode: 'bl', ...PAGINATION_DEFAULTS, ...params } }); }
export function getMyUsernameHistory()               { return api.get('/me/username/history'); }
export function updateMyUsername(data)               { return api.put('/me/username', data); }
export function getMyStatus()                        { return api.get('/me/status'); }
export function updateMyStatus(data)                 { return api.put('/me/status', data); }

// ── Other user's profile ─────────────────────────────────────────────────────
export function getProfile(userId)                          { return api.get(`${userPath(userId)}/profile`); }
export function getActivities(userId, params = {})          { return api.get(`${userPath(userId)}/activities/load-more`, { params }); }
export function getPosts(userId, params = {})               { return api.get(`${userPath(userId)}/posts`, { params }); }
export function getPostsByTopic(userId, params = {})        { return api.get(`${userPath(userId)}/posts-by-topic`, { params }); }
export function getComments(userId, params = {})            { return api.get(`${userPath(userId)}/comments`, { params }); }
export function getBuddyList(userId, params = {})           { return api.get(`${userPath(userId)}/buddylist`, { params }); }
export function getMovies(userId, params = {})              { return api.get(`${userPath(userId)}/movies`, { params }); }
export function getShows(userId, params = {})               { return api.get(`${userPath(userId)}/shows`, { params }); }
export function getCelebs(userId, params = {})              { return api.get(`${userPath(userId)}/celebs`, { params }); }
export function getForums(userId, params = {})              { return api.get(`${userPath(userId)}/forums`, { params }); }
export function getFanfictionFollowers(userId, params = {}) { return api.get(`${userPath(userId)}/fanfiction-followers`, { params }); }
export function getUsernameChangeLog(userId)                { return api.get(`${userPath(userId)}/username-change-log`); }
export function getBadges(userId)                           { return api.get(`${userPath(userId)}/badges`); }
export function getBadgeDetail(userId, badgeId)             { return api.get(`${userPath(userId)}/badges/${badgeId}`); }
