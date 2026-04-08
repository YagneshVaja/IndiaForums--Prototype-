import api from './api';

// ── WebStories API ───────────────────────────────────────────────────────────
//
// Two endpoints wired against the live api2.indiaforums.com backend.
// Real shapes verified live on 2026-04-08.
//
//   GET /webstories?page&pageSize     — paginated list (sparse)
//   GET /webstories/{storyId}/details — single story with author + slides
//
// Base URL + api version come from the shared `api` axios instance (see
// services/api.js), so callers never have to think about /api/v{version}.
//
// ── Real response shapes ────────────────────────────────────────────────────
//
//   List → { data: WebStory[], totalCount: number }
//
//     where WebStory (list item) is:
//       {
//         storyId, title,
//         pageUrl,                       ← slug, not a full URL
//         publishedWhen,                 ← ISO 8601
//         hasThumbnail, thumbnailUrl,    ← cover image
//         webStoryUpdateChecksum
//       }
//
//     IMPORTANT: the list endpoint does NOT return author, category,
//     description, slide count, or view count — those only come from
//     /details. UI built on the list response must not assume those fields.
//
//   Detail → FLAT object (no envelope) with:
//       {
//         // Author block (top-level on the response, not nested):
//         userId, userName, realName,
//         groupId, groupName,
//         avatarType, avatarAccent,
//
//         // Story block:
//         storyId, title, pageUrl, description,
//         hasThumbnail, thumbnailUrl,
//         webStoryUpdateChecksum, statusCode,
//         createdWhen, lastEditedWhen, publishedWhen,
//         theme, approvedBy, featured, authorByLine,
//
//         // Slides — JSON STRING that must be parsed:
//         slidesJson,                    ← JSON.parse(...) → Slide[]
//         slidesHtmlContent              ← legacy/null
//       }
//
//     Each parsed slide has:
//       {
//         slideNumber, slideType,        ← "cover-slide" | "default-slide" | …
//         title, author, description,
//         attribute, url, urlAction,
//         image, video,                  ← media URLs (NOT imageUrl/videoUrl)
//         imageSource, imageCredits, videoCredits, mediaSource,
//         cite, quote,                   ← quote slides
//         pollId, quizId, question, options,
//         fact, listicle, listItems,
//         animation, timer, authorByLine
//       }
//
// All shape normalisation lives in `components/stories/normalize.js`. UI
// components consume the normalised output and must not touch raw API fields.

const BASE = '/webstories';

/**
 * Get a paginated list of web stories.
 *
 * @param {object} [args]
 * @param {number} [args.page=1]
 * @param {number} [args.pageSize=24]
 * @param {string|number} [args.categoryId] — optional category filter, if the
 *   backend supports it (ignored otherwise)
 */
export function getWebStories({ page = 1, pageSize = 24, categoryId } = {}) {
  const params = { page, pageSize };
  if (categoryId != null && categoryId !== 'all') params.categoryId = categoryId;
  return api.get(BASE, { params });
}

/**
 * Get full details for a single web story, including all slides.
 *
 * @param {string|number} storyId
 */
export function getWebStoryDetails(storyId) {
  return api.get(`${BASE}/${storyId}/details`);
}
