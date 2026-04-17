import api, { timeAgo } from './api';

// ── Comments + Content Reactions + Reports API ───────────────────────────────

export const COMMENT_CONTENT_TYPES = {
  ARTICLE: 7,
  MEDIA:   6,
  FORUM:   1,
};

export const LIKE_TYPES = {
  LIKE:    1,
  DISLIKE: 2,
};

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
 */
export function transformComment(raw: any) {
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
    _raw:         raw,
  };
}

/**
 * Fetch a paginated comment list.
 * @returns { comments, pagination }
 */
export async function getComments(
  contentTypeId: number,
  contentTypeValue: number,
  { cursor, pageSize = 25, parentCommentId = 0 }: {
    cursor?: string;
    pageSize?: number;
    parentCommentId?: number;
  } = {},
) {
  const params: any = { contentTypeId, contentTypeValue, parentCommentId, pageSize };
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
}: {
  contentTypeId: number;
  contentTypeValue: number;
  contents: string;
  parentCommentId?: number;
  commentImageUrl?: string;
  linkUrl?: string;
  guestName?: string;
  guestEmail?: string;
  taggedBuddies?: any[];
}) {
  const body: any = {
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
export function updateComment(commentId: number, { contents, commentImageUrl, linkUrl }: {
  contents?: string;
  commentImageUrl?: string;
  linkUrl?: string;
} = {}) {
  const body: any = { commentId };
  if (contents !== undefined)         body.contents         = contents;
  if (commentImageUrl !== undefined)  body.commentImageUrl  = commentImageUrl;
  if (linkUrl !== undefined)          body.linkUrl          = linkUrl;
  return api.put(`${COMMENTS}/${commentId}`, body);
}

/**
 * Delete a comment. Soft delete + cascading children, per spec.
 */
export function deleteComment(commentId: number) {
  return api.delete(`${COMMENTS}/${commentId}`);
}

/**
 * Like or dislike a comment. Pass `like: false` to dislike.
 */
export function likeComment({ commentId, like = true, commentLikeId }: {
  commentId: number;
  like?: boolean;
  commentLikeId?: number;
}) {
  const body: any = {
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
export function getCommentLikes(commentId: number) {
  return api.get(`${COMMENTS}/likes`, { params: { commentId } });
}

/* ── Content reactions (article / media / forum) ─────────────────────────── */

/**
 * Add an emoji reaction to a piece of content (article, media, etc.).
 */
export function reactToContent({ contentType, contentId, reactionType }: {
  contentType: number;
  contentId: number;
  reactionType: number;
}) {
  return api.post('/content/reactions', { contentType, contentId, reactionType });
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

/**
 * Submit a content report.
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
}: {
  contentType: number;
  contentId: number;
  reason: string;
  remark?: string;
  forumId?: number;
  topicId?: number;
  reportId?: number;
  authorName?: string;
  authorEmail?: string;
}) {
  const body: any = { contentType, contentId, reason };
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
 */
export function getReportTypes() {
  return api.get(`${REPORTS}/types`);
}

/**
 * Get the current user's existing report for a piece of content (if any).
 */
export function getMyExistingReport({ contentType, contentId }: { contentType: number; contentId: number }) {
  return api.get(`${REPORTS}/my-report`, {
    params: { contentType, contentId },
  });
}
