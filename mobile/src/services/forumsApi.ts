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

// Forum thread reaction codes (per spec description: Like, Love, Wow, Lol,
// Shock, Sad, Angry). The integer codes aren't enumerated in the spec —
// these match the convention used for content reactions in commentsApi.ts.
export const THREAD_REACTION_TYPES = {
  LIKE:  1,
  LOVE:  2,
  WOW:   3,
  LOL:   4,
  SHOCK: 5,
  SAD:   6,
  ANGRY: 7,
};

// Maps integer reaction code → API string enum value
export const REACTION_TYPE_STRINGS: Record<number, string> = {
  0: 'None',
  1: 'Like',
  2: 'Love',
  3: 'Wow',
  4: 'Lol',
  5: 'Shock',
  6: 'Sad',
  7: 'Angry',
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
}: {
  forumId: number;
  subject: string;
  message: string;
  topicTypeId?: number;
  flairId?: number;
  showSignature?: boolean;
  addToWatchList?: boolean;
  hasMaturedContent?: boolean;
  pollData?: any;
  userTags?: string;
  titleTags?: string;
  addToMyWall?: boolean;
  topicDescription?: string;
}) {
  const body: any = {
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
 */
export function replyToTopic(topicId: number, {
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
}: {
  forumId: number;
  message: string;
  subject?: string;
  showSignature?: boolean;
  addToWatchList?: boolean;
  hasMaturedContent?: boolean;
  postTypeId?: number;
  lastThreadQuoteId?: number;
  lastThreadQuoteUserId?: number;
  userTags?: string;
  titleTags?: string;
  draftId?: number;
}) {
  const body: any = {
    topicId,
    forumId,
    message,
    showSignature,
    addToWatchList,
    hasMaturedContent,
    postTypeId,
  };
  if (subject)               body.subject               = subject;
  if (lastThreadQuoteId)     body.lastThreadQuoteId     = lastThreadQuoteId;
  if (lastThreadQuoteUserId) body.lastThreadQuoteUserId = lastThreadQuoteUserId;
  if (userTags)              body.userTags              = userTags;
  if (titleTags)             body.titleTags             = titleTags;
  if (draftId)               body.draftId               = draftId;
  return api.post(`${TOPICS_BASE}/${topicId}/reply`, body);
}

/* ── Edit / history ────────────────────────────────────────────────────── */

/**
 * Edit an existing forum post (thread). Owner only (or moderator).
 */
export function editPost(postId: number, {
  topicId,
  message,
  showSignature = true,
  hasMaturedContent = false,
  userTags,
  moderatorNote,
}: {
  topicId: number;
  message: string;
  showSignature?: boolean;
  hasMaturedContent?: boolean;
  userTags?: string;
  moderatorNote?: any;
}) {
  const body: any = {
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
export function getPostEditHistory(postId: number, { pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`${POSTS_BASE}/${postId}/history`, {
    params: { pageNumber, pageSize },
  });
}

/* ── Reactions ─────────────────────────────────────────────────────────── */

/**
 * React to a forum post / thread (Like, Love, Wow, Lol, Shock, Sad, Angry).
 */
export function reactToThread({ threadId, forumId, reactionType, threadLikeId }: {
  threadId: number;
  forumId: number;
  reactionType: number;
  threadLikeId?: number;
}) {
  const reactionValue = reactionType === 0 ? 'None' : reactionType;
  const body: any = { threadId, forumId, reactionType: reactionValue };
  if (threadLikeId !== undefined && threadLikeId !== null) {
    body.threadLikeId = threadLikeId;
  }
  return api.post(`${THREADS_BASE}/react`, body);
}

/**
 * Get the list of users who reacted to / liked a forum post.
 */
export function getThreadLikes(threadId: number) {
  return api.get(`${THREADS_BASE}/${threadId}/likes`);
}

/* ── Polls ─────────────────────────────────────────────────────────────── */

/**
 * Cast a vote on a poll attached to a topic.
 */
export function castPollVote(pollId: number, optionIds: number | number[]) {
  const ids = Array.isArray(optionIds) ? optionIds.join(',') : String(optionIds);
  return api.post(`${POLLS_BASE}/${pollId}/vote`, {
    pollId,
    pollChoiceIds: ids,
  });
}

/* ── Moderation (group-gated) ─────────────────────────────────────────────── */

/**
 * Close (lock) a forum topic.
 */
export function closeTopic({ topicId, forumId, closePost, isCloseWithPost = false, isAnonymous = false }: {
  topicId: number;
  forumId: number;
  closePost?: string;
  isCloseWithPost?: boolean;
  isAnonymous?: boolean;
}) {
  const body: any = { topicId, forumId, isCloseWithPost, isAnonymous };
  if (closePost) body.closePost = closePost;
  return api.post(`${TOPICS_BASE}/${topicId}/close`, body);
}

/**
 * Open / unlock a previously closed topic.
 */
export function openTopic({ topicId, forumId, openMessage, isOpenWithPost = false, isAnonymous = false }: {
  topicId: number;
  forumId: number;
  openMessage?: string;
  isOpenWithPost?: boolean;
  isAnonymous?: boolean;
}) {
  const body: any = { topicId, forumId, isOpenWithPost, isAnonymous };
  if (openMessage) body.openMessage = openMessage;
  return api.post(`${TOPICS_BASE}/${topicId}/open`, body);
}

/**
 * Move a topic to a different forum.
 */
export function moveTopic({ topicId, toForumId, newTopicId }: {
  topicId: number;
  toForumId: number;
  newTopicId?: number[];
}) {
  const body: any = { topicId, toForumId };
  if (Array.isArray(newTopicId)) body.newTopicId = newTopicId;
  return api.post(`${TOPICS_BASE}/${topicId}/move`, body);
}

/**
 * Merge a topic into another topic.
 */
export function mergeTopic({ topicId, newTopicId }: { topicId: number; newTopicId: number }) {
  return api.post(`${TOPICS_BASE}/${topicId}/merge`, { topicId, newTopicId });
}

/**
 * Trash one or more topics.
 */
export function trashTopics(topicIds: number | number[], forumIds?: number[]) {
  const body: any = { topicIds: Array.isArray(topicIds) ? topicIds : [topicIds] };
  if (Array.isArray(forumIds) && forumIds.length > 0) body.forumIds = forumIds;
  return api.post(`${TOPICS_BASE}/trash`, body);
}

/**
 * Restore a topic from trash to its original forum.
 */
export function restoreTopic(topicId: number) {
  return api.post(`${TOPICS_BASE}/${topicId}/untrash`, {});
}

/**
 * Trash a single forum post (move to trash topic).
 */
export function trashPost({ threadId, topicId }: { threadId: number; topicId: number }) {
  return api.post(`${POSTS_BASE}/${threadId}/trash`, { threadId, topicId });
}

/**
 * Untrash (restore) a single forum post.
 */
export function untrashPost(threadId: number) {
  return api.post(`${POSTS_BASE}/${threadId}/untrash`, {});
}

/**
 * Update a topic's admin settings (subject, priority, locked, flair, etc.).
 */
export function updateTopicAdminSettings(topicId: number, settings: any) {
  const body = { topicId, ...settings };
  return api.put(`${TOPICS_BASE}/${topicId}/admin`, body);
}

/**
 * Close a reported topic and update related reports.
 */
export function closeReportedTopic({ topicId, forumId, threadId, closePost, isCloseWithPost = false, isAnonymous = false }: {
  topicId: number;
  forumId: number;
  threadId?: number;
  closePost?: string;
  isCloseWithPost?: boolean;
  isAnonymous?: boolean;
}) {
  const body: any = { topicId, forumId, isCloseWithPost, isAnonymous };
  if (threadId)  body.threadId  = threadId;
  if (closePost) body.closePost = closePost;
  return api.post(`${TOPICS_BASE}/${topicId}/close-reported`, body);
}

/**
 * Close (resolve) one or more report-abuse records.
 */
export function closeReports({ reportIds, forumId }: { reportIds: number | number[]; forumId: number }) {
  return api.post(`/forums/reports/close`, {
    reportIds: Array.isArray(reportIds) ? reportIds : [reportIds],
    forumId,
  });
}

/**
 * Get the list of reported topics for a forum.
 */
export function getReportedTopics(forumId: number, { pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`/forums/${forumId}/reportedtopics`, {
    params: { pageNumber, pageSize },
  });
}

/**
 * Get the list of reported posts for a topic (optionally filtered to one threadId).
 */
export function getReportedPosts(topicId: number, { threadId, pageNumber = 1, pageSize = 20 }: {
  threadId?: number;
  pageNumber?: number;
  pageSize?: number;
} = {}) {
  const params: any = { pageNumber, pageSize };
  if (threadId) params.threadId = threadId;
  return api.get(`${TOPICS_BASE}/${topicId}/reportedposts`, { params });
}

/**
 * Get topic action history (lock/unlock/move/merge/trash/restore log).
 */
export function getTopicActionHistory({ topicId = 0, actionId = 0, pageNumber = 1, pageSize = 20 } = {}) {
  return api.get(`${TOPICS_BASE}/history`, {
    params: { topicId, actionId, pageNumber, pageSize },
  });
}
