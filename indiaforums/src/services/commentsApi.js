import api, { timeAgo } from './api';

// ── Comments + Content Reactions + Reports API ───────────────────────────────
// Routes:
//   GET    /comments?contentTypeId=&contentTypeValue=&parentCommentId=&cursor=&pageSize=
//   POST   /comments                            — create
//   PUT    /comments/{id}                       — update (owner / mod)
//   DELETE /comments/{id}                       — delete (owner / mod)
//   POST   /comments/like                       — like / dislike / toggle
//   GET    /comments/likes?commentId=           — list likers
//   POST   /content/reactions                   — emoji react to articles/media
//   POST   /reports                             — submit a content report
//   GET    /reports/types                       — list of report reasons
//   GET    /reports/my-report?contentType=&contentId=  — my existing report (if any)
//
// Content type IDs we care about (from spec descriptions):
//   1 = Forum thread/post (used by content/reactions)
//   6 = Media / Photo gallery
//   7 = Article (news)
//
// LikeComment.likeType (uint8): 1 = like, 2 = dislike (toggle by sending the
// same likeType again, switch by sending the opposite).

export const COMMENT_CONTENT_TYPES = {
  ARTICLE: 7,
  MEDIA:   6,
  FORUM:   1,
};

export const LIKE_TYPES = {
  LIKE:    1,
  DISLIKE: 2,
};

// Reaction codes for /content/reactions (per spec description: "Awesome, Nice,
// Loved, Lol, Funny, Fail, Omg, Cry"). The integer codes are not enumerated in
// the spec — backend convention used elsewhere in the app:
export const REACTION_TYPES = {
  AWESOME: 1,
  NICE:    2,
  LOVED:   3,
  LOL:     4,
  FUNNY:   5,
  FAIL:    6,
  OMG:     7,
  CRY:     8,
};

const COMMENTS = '/comments';
const REPORTS  = '/reports';

/* ── Read ────────────────────────────────────────────────────────────────── */

/**
 * Normalised comment shape used by UI components.
 * Keep this in sync with whatever ArticleScreen / ForumThreadView consume.
 */
export function transformComment(raw) {
  return {
    id:           raw.commentId,
    parentId:     raw.parentCommentId || 0,
    userId:       raw.userId || 0,
    user:         raw.userName || raw.realName || 'Anonymous',
    initial:      (raw.userName || raw.realName || 'A').charAt(0).toUpperCase(),
    accentColor:  raw.avatarAccent || '#3558F0',
    time:         timeAgo(raw.createdWhen),
    text:         raw.contents || '',
    imageUrl:     raw.commentImageUrl || null,
    linkUrl:      raw.linkUrl || null,
    likes:        Number(raw.likeCount || 0),
    dislikes:     Number(raw.disLikeCount || 0),
    replyCount:   Number(raw.replyCount || 0),
    groupId:      Number(raw.groupId || 0),
    statusCode:   Number(raw.commentStatusCode || 0),
    badgeJson:    raw.badgeJson || null,
    // Carry the raw record so callers that need richer fields don't have to
    // refetch — internal use only.
    _raw:         raw,
  };
}

/**
 * Fetch a paginated comment list.
 * @returns { comments, pagination }
 */
export async function getComments(
  contentTypeId,
  contentTypeValue,
  { cursor, pageSize = 25, parentCommentId = 0 } = {},
) {
  const params = { contentTypeId, contentTypeValue, parentCommentId, pageSize };
  if (cursor) params.cursor = cursor;

  const { data } = await api.get(COMMENTS, { params });
  const payload = data?.data || data;
  const rawComments = payload?.comments || [];

  return {
    comments: rawComments.map(transformComment),
    pagination: payload?.pagination || {
      currentPage: 1,
      pageSize,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
    },
  };
}

/* ── Write ───────────────────────────────────────────────────────────────── */

/**
 * Create a new comment (top-level or reply).
 * @param {object} args
 * @param {number} args.contentTypeId
 * @param {number} args.contentTypeValue
 * @param {string} args.contents               body text
 * @param {number} [args.parentCommentId]      reply target
 * @param {string} [args.commentImageUrl]
 * @param {string} [args.linkUrl]
 * @param {string} [args.guestName]            guest only
 * @param {string} [args.guestEmail]           guest only
 */
export function createComment({
  contentTypeId,
  contentTypeValue,
  contents,
  parentCommentId = 0,
  commentImageUrl,
  linkUrl,
  guestName,
  guestEmail,
  taggedBuddies,
}) {
  const body = {
    contentTypeId,
    contentTypeValue,
    parentCommentId,
    contents,
  };
  if (commentImageUrl) body.commentImageUrl = commentImageUrl;
  if (linkUrl)         body.linkUrl         = linkUrl;
  if (guestName)       body.guestName       = guestName;
  if (guestEmail)      body.guestEmail      = guestEmail;
  if (taggedBuddies && taggedBuddies.length) body.taggedBuddies = taggedBuddies;
  return api.post(COMMENTS, body);
}

/**
 * Update an existing comment. Only the owner / mods can do this.
 */
export function updateComment(commentId, { contents, commentImageUrl, linkUrl } = {}) {
  const body = { commentId };
  if (contents !== undefined)         body.contents         = contents;
  if (commentImageUrl !== undefined)  body.commentImageUrl  = commentImageUrl;
  if (linkUrl !== undefined)          body.linkUrl          = linkUrl;
  return api.put(`${COMMENTS}/${commentId}`, body);
}

/**
 * Delete a comment. Soft delete + cascading children, per spec.
 */
export function deleteComment(commentId) {
  return api.delete(`${COMMENTS}/${commentId}`);
}

/**
 * Like or dislike a comment. Pass `like: false` to dislike.
 * `commentLikeId` is optional and is used by the backend to update an existing
 * like row when you're switching from like → dislike (or removing).
 */
export function likeComment({ commentId, like = true, commentLikeId }) {
  const body = {
    commentId,
    likeType: like ? LIKE_TYPES.LIKE : LIKE_TYPES.DISLIKE,
  };
  if (commentLikeId !== undefined && commentLikeId !== null) {
    body.commentLikeId = commentLikeId;
  }
  return api.post(`${COMMENTS}/like`, body);
}

/**
 * Get the list of users who liked / disliked a comment.
 */
export function getCommentLikes(commentId) {
  return api.get(`${COMMENTS}/likes`, { params: { commentId } });
}

/* ── Content reactions (article / media / forum) ─────────────────────────── */

/**
 * Add an emoji reaction to a piece of content (article, media, etc.).
 * NOTE: this is content-level, *not* comment-level. For comment likes use
 * `likeComment` above.
 *
 * @param {object} args
 * @param {number} args.contentType   contentType id (1=forum, 6=media, 7=article …)
 * @param {number} args.contentId     id of the content
 * @param {number} args.reactionType  one of REACTION_TYPES.*
 */
export function reactToContent({ contentType, contentId, reactionType }) {
  return api.post('/content/reactions', { contentType, contentId, reactionType });
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

/**
 * Submit a content report.
 * @param {object} args
 * @param {number} args.contentType    uint8 (matches comment/content types)
 * @param {number} args.contentId
 * @param {string} args.reason         a string from `getReportTypes()`
 * @param {string} [args.remark]
 * @param {number} [args.forumId]      for forum content
 * @param {number} [args.topicId]      for forum content
 * @param {number} [args.reportId]     pass the existing reportId to update
 * @param {string} [args.authorName]   anonymous reporters only
 * @param {string} [args.authorEmail]  anonymous reporters only
 */
export function reportContent({
  contentType,
  contentId,
  reason,
  remark,
  forumId,
  topicId,
  reportId,
  authorName,
  authorEmail,
}) {
  const body = { contentType, contentId, reason };
  if (remark !== undefined)      body.remark      = remark;
  if (forumId !== undefined)     body.forumId     = forumId;
  if (topicId !== undefined)     body.topicId     = topicId;
  if (reportId !== undefined)    body.reportId    = reportId;
  if (authorName !== undefined)  body.authorName  = authorName;
  if (authorEmail !== undefined) body.authorEmail = authorEmail;
  return api.post(REPORTS, body);
}

/**
 * Fetch the list of report reason categories (Spam, Harassment, Fraud, …).
 * @returns Promise<axios response> with `data: ReportTypeDto[]`
 */
export function getReportTypes() {
  return api.get(`${REPORTS}/types`);
}

/**
 * Get the current user's existing report for a piece of content (if any).
 * Returns 404-ish or empty when there is no prior report — callers should
 * treat any error as "no existing report".
 */
export function getMyExistingReport({ contentType, contentId }) {
  return api.get(`${REPORTS}/my-report`, {
    params: { contentType, contentId },
  });
}
