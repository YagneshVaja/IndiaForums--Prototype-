import api from './api';

// ── Forums Write API ─────────────────────────────────────────────────────────
// Routes:
//   POST   /forums/topics                              — create new topic
//   POST   /forums/topics/{topicId}/reply              — reply to a topic
//   PUT    /forums/posts/{threadId}                    — edit a post
//   POST   /forums/threads/react                       — react / like a post
//   GET    /forums/threads/{threadId}/likes            — list likers
//   GET    /forums/posts/{threadId}/history            — edit history of a post
//   POST   /forums/polls/{pollId}/vote                 — cast poll vote
//
// The existing read functions (forum list, topics list, posts list) still
// live in services/api.js for backwards-compat with the many hooks that
// import them today. Extracting those is Phase 10 cleanup, not Phase 5.
//
// Watch-list: there is **no** standalone POST/DELETE endpoint to toggle watch
// on an existing topic. The spec only exposes `addToWatchList` as a flag on
// `NewTopicRequestDto` and `TopicReplyRequestDto`, plus a read-only
// `GET /my-watched-topics`. So "watch a topic" only happens at the moment
// you create it or reply to it.

// Forum thread reaction codes (per spec description: Like, Love, Wow, Lol,
// Shock, Sad, Angry). The integer codes aren't enumerated in the spec —
// these match the convention used for content reactions in commentsApi.js.
export const THREAD_REACTION_TYPES = {
  LIKE:  1,
  LOVE:  2,
  WOW:   3,
  LOL:   4,
  SHOCK: 5,
  SAD:   6,
  ANGRY: 7,
};

// Default postTypeId for a normal text reply.
export const POST_TYPE_DEFAULT = 1;

const TOPICS_BASE  = '/forums/topics';
const POSTS_BASE   = '/forums/posts';
const THREADS_BASE = '/forums/threads';
const POLLS_BASE   = '/forums/polls';

/* ── Create / reply ────────────────────────────────────────────────────── */

/**
 * Create a brand-new forum topic.
 *
 * @param {object} args
 * @param {number}  args.forumId
 * @param {string}  args.subject
 * @param {string}  args.message
 * @param {number}  [args.topicTypeId=1]   1 = normal discussion topic
 * @param {number}  [args.flairId]
 * @param {boolean} [args.showSignature=true]
 * @param {boolean} [args.addToWatchList=true]   subscribe to email notifications
 * @param {boolean} [args.hasMaturedContent=false]
 * @param {object}  [args.pollData]              optional poll attached to topic
 * @param {string}  [args.userTags]              comma-separated user ids tagged
 * @param {string}  [args.titleTags]
 * @param {boolean} [args.addToMyWall=false]
 * @param {string}  [args.topicDescription]
 */
export function createTopic({
  forumId,
  subject,
  message,
  topicTypeId = 1,
  flairId,
  showSignature = true,
  addToWatchList = true,
  hasMaturedContent = false,
  pollData,
  userTags,
  titleTags,
  addToMyWall = false,
  topicDescription,
}) {
  const body = {
    forumId,
    subject,
    message,
    topicTypeId,
    showSignature,
    addToWatchList,
    hasMaturedContent,
    addToMyWall,
  };
  if (flairId !== undefined && flairId !== null) body.flairId = flairId;
  if (pollData)         body.pollData         = pollData;
  if (userTags)         body.userTags         = userTags;
  if (titleTags)        body.titleTags        = titleTags;
  if (topicDescription) body.topicDescription = topicDescription;
  return api.post(TOPICS_BASE, body);
}

/**
 * Reply to an existing topic.
 *
 * @param {number} topicId
 * @param {object} args
 * @param {number}  args.forumId                required by the spec
 * @param {string}  args.message
 * @param {string}  [args.subject]              optional override (≤200 chars)
 * @param {boolean} [args.showSignature=true]
 * @param {boolean} [args.addToWatchList=false]
 * @param {boolean} [args.hasMaturedContent=false]
 * @param {number}  [args.postTypeId=1]
 * @param {number}  [args.lastThreadQuoteId]    quoted-reply target
 * @param {number}  [args.lastThreadQuoteUserId]
 * @param {string}  [args.userTags]
 * @param {string}  [args.titleTags]
 * @param {number}  [args.draftId]
 */
export function replyToTopic(topicId, {
  forumId,
  message,
  subject,
  showSignature = true,
  addToWatchList = false,
  hasMaturedContent = false,
  postTypeId = POST_TYPE_DEFAULT,
  lastThreadQuoteId,
  lastThreadQuoteUserId,
  userTags,
  titleTags,
  draftId,
}) {
  const body = {
    topicId,
    forumId,
    message,
    showSignature,
    addToWatchList,
    hasMaturedContent,
    postTypeId,
  };
  if (subject)              body.subject              = subject;
  if (lastThreadQuoteId)    body.lastThreadQuoteId    = lastThreadQuoteId;
  if (lastThreadQuoteUserId)body.lastThreadQuoteUserId= lastThreadQuoteUserId;
  if (userTags)             body.userTags             = userTags;
  if (titleTags)            body.titleTags            = titleTags;
  if (draftId)              body.draftId              = draftId;
  return api.post(`${TOPICS_BASE}/${topicId}/reply`, body);
}

/* ── Edit / history ────────────────────────────────────────────────────── */

/**
 * Edit an existing forum post (thread). Owner only (or moderator).
 *
 * @param {number} postId    `threadId` in the spec
 * @param {object} args
 * @param {number}  args.topicId
 * @param {string}  args.message
 * @param {boolean} [args.showSignature=true]
 * @param {boolean} [args.hasMaturedContent=false]
 * @param {string}  [args.userTags]
 * @param {object}  [args.moderatorNote]   moderators only
 */
export function editPost(postId, {
  topicId,
  message,
  showSignature = true,
  hasMaturedContent = false,
  userTags,
  moderatorNote,
}) {
  const body = {
    threadId: postId,
    topicId,
    message,
    showSignature,
    hasMaturedContent,
  };
  if (userTags)      body.userTags      = userTags;
  if (moderatorNote) body.moderatorNote = moderatorNote;
  return api.put(`${POSTS_BASE}/${postId}`, body);
}

/**
 * Get the edit history of a forum post.
 */
export function getPostEditHistory(postId, { pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`${POSTS_BASE}/${postId}/history`, {
    params: { pageNumber, pageSize },
  });
}

/* ── Reactions ─────────────────────────────────────────────────────────── */

/**
 * React to a forum post / thread (Like, Love, Wow, Lol, Shock, Sad, Angry).
 *
 * @param {object} args
 * @param {number} args.threadId          the post id
 * @param {number} args.forumId
 * @param {number} args.reactionType      one of THREAD_REACTION_TYPES.*
 * @param {number} [args.threadLikeId]    pass the existing like row id when
 *                                        switching reaction types or removing
 */
export function reactToThread({ threadId, forumId, reactionType, threadLikeId }) {
  const body = { threadId, forumId, reactionType };
  if (threadLikeId !== undefined && threadLikeId !== null) {
    body.threadLikeId = threadLikeId;
  }
  return api.post(`${THREADS_BASE}/react`, body);
}

/**
 * Get the list of users who reacted to / liked a forum post.
 */
export function getThreadLikes(threadId) {
  return api.get(`${THREADS_BASE}/${threadId}/likes`);
}

/* ── Polls ─────────────────────────────────────────────────────────────── */

/**
 * Cast a vote on a poll attached to a topic.
 *
 * @param {number} pollId
 * @param {number[]|number} optionIds   one or more pollChoice ids
 */
export function castPollVote(pollId, optionIds) {
  const ids = Array.isArray(optionIds) ? optionIds.join(',') : String(optionIds);
  return api.post(`${POLLS_BASE}/${pollId}/vote`, {
    pollId,
    pollChoiceIds: ids,
  });
}

/* ── Moderation (group-gated) ──────────────────────────────────────────────
 * All endpoints in this section require moderator/admin privileges. The
 * frontend should hide the AdminPanel UI for users whose `groupId` does not
 * indicate moderator rights — the API will return 403 otherwise.
 */

/**
 * Close (lock) a forum topic.
 *
 * @param {object} args
 * @param {number}  args.topicId
 * @param {number}  args.forumId
 * @param {string}  [args.closePost]      optional message to post when closing
 * @param {boolean} [args.isCloseWithPost=false]
 * @param {boolean} [args.isAnonymous=false]
 */
export function closeTopic({ topicId, forumId, closePost, isCloseWithPost = false, isAnonymous = false }) {
  const body = { topicId, forumId, isCloseWithPost, isAnonymous };
  if (closePost) body.closePost = closePost;
  return api.post(`${TOPICS_BASE}/${topicId}/close`, body);
}

/**
 * Open / unlock a previously closed topic.
 */
export function openTopic({ topicId, forumId, openMessage, isOpenWithPost = false, isAnonymous = false }) {
  const body = { topicId, forumId, isOpenWithPost, isAnonymous };
  if (openMessage) body.openMessage = openMessage;
  return api.post(`${TOPICS_BASE}/${topicId}/open`, body);
}

/**
 * Move a topic to a different forum.
 *
 * @param {object} args
 * @param {number}  args.topicId
 * @param {number}  args.toForumId
 * @param {number[]} [args.newTopicId]    optional list of split topic ids
 */
export function moveTopic({ topicId, toForumId, newTopicId }) {
  const body = { topicId, toForumId };
  if (Array.isArray(newTopicId)) body.newTopicId = newTopicId;
  return api.post(`${TOPICS_BASE}/${topicId}/move`, body);
}

/**
 * Merge a topic into another topic.
 *
 * @param {object} args
 * @param {number} args.topicId       the source topic to merge from
 * @param {number} args.newTopicId    the target topic to merge into
 */
export function mergeTopic({ topicId, newTopicId }) {
  return api.post(`${TOPICS_BASE}/${topicId}/merge`, { topicId, newTopicId });
}

/**
 * Trash one or more topics.
 *
 * @param {number[]} topicIds
 * @param {number[]} [forumIds]   optional matching forum ids
 */
export function trashTopics(topicIds, forumIds) {
  const body = { topicIds: Array.isArray(topicIds) ? topicIds : [topicIds] };
  if (Array.isArray(forumIds) && forumIds.length > 0) body.forumIds = forumIds;
  return api.post(`${TOPICS_BASE}/trash`, body);
}

/**
 * Restore a topic from trash to its original forum.
 */
export function restoreTopic(topicId) {
  return api.post(`${TOPICS_BASE}/${topicId}/untrash`, {});
}

/**
 * Trash a single forum post (move to trash topic).
 */
export function trashPost({ threadId, topicId }) {
  return api.post(`${POSTS_BASE}/${threadId}/trash`, { threadId, topicId });
}

/**
 * Untrash (restore) a single forum post.
 */
export function untrashPost(threadId) {
  return api.post(`${POSTS_BASE}/${threadId}/untrash`, {});
}

/**
 * Update a topic's admin settings (subject, priority, locked, flair, etc.).
 *
 * @param {number} topicId
 * @param {object} settings
 * @param {string}  [settings.subject]
 * @param {number}  [settings.priority]    0/1/... pin priority
 * @param {string}  [settings.titleTags]
 * @param {boolean} [settings.locked]
 * @param {boolean} [settings.hasMaturedContent]
 * @param {number}  [settings.flairId]
 */
export function updateTopicAdminSettings(topicId, settings) {
  const body = { topicId, ...settings };
  return api.put(`${TOPICS_BASE}/${topicId}/admin`, body);
}

/**
 * Close a reported topic and update related reports.
 *
 * @param {object} args
 * @param {number}  args.topicId
 * @param {number}  args.forumId
 * @param {number}  [args.threadId]      specific reported thread to close
 * @param {string}  [args.closePost]
 * @param {boolean} [args.isCloseWithPost=false]
 * @param {boolean} [args.isAnonymous=false]
 */
export function closeReportedTopic({ topicId, forumId, threadId, closePost, isCloseWithPost = false, isAnonymous = false }) {
  const body = { topicId, forumId, isCloseWithPost, isAnonymous };
  if (threadId)  body.threadId  = threadId;
  if (closePost) body.closePost = closePost;
  return api.post(`${TOPICS_BASE}/${topicId}/close-reported`, body);
}

/**
 * Close (resolve) one or more report-abuse records.
 */
export function closeReports({ reportIds, forumId }) {
  return api.post(`/forums/reports/close`, {
    reportIds: Array.isArray(reportIds) ? reportIds : [reportIds],
    forumId,
  });
}

/**
 * Get the list of reported topics for a forum.
 */
export function getReportedTopics(forumId, { pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`/forums/${forumId}/reportedtopics`, {
    params: { pageNumber, pageSize },
  });
}

/**
 * Get the list of reported posts for a topic (optionally filtered to one threadId).
 */
export function getReportedPosts(topicId, { threadId, pageNumber = 1, pageSize = 20 } = {}) {
  const params = { pageNumber, pageSize };
  if (threadId) params.threadId = threadId;
  return api.get(`${TOPICS_BASE}/${topicId}/reportedposts`, { params });
}

/**
 * Get topic action history (lock/unlock/move/merge/trash/restore log).
 *
 * @param {object} [args]
 * @param {number} [args.topicId=0]
 * @param {number} [args.actionId=0]
 * @param {number} [args.pageNumber=1]
 * @param {number} [args.pageSize=20]
 */
export function getTopicActionHistory({ topicId = 0, actionId = 0, pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`${TOPICS_BASE}/history`, {
    params: { topicId, actionId, pageNumber, pageSize },
  });
}
