// mobile/src/services/notificationRouter.ts
import type { NotificationDto } from '../features/notifications/types';

export type NavTarget =
  | { stack: 'MySpace'; screen: 'Notifications' }
  | { stack: 'MySpace'; screen: 'MessageThread'; params: { threadId: string } }
  | { stack: 'MySpace'; screen: 'BadgeDetail'; params: { badgeId: string } }
  | { stack: 'MySpace'; screen: 'Profile'; params: { userId: string } }
  | {
      stack: 'MySpace';
      screen: 'NotificationDispatch';
      params: { topicId: string; focusPostId?: string };
    }
  | {
      stack: 'News';
      screen: 'ArticleDetail';
      params: { id: string };
    };

type AnyData = Record<string, unknown> | null | undefined;

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.length > 0 ? v : null;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * Parse iforums:// deep link → NavTarget.
 * Recognised forms:
 *   iforums://topic/<id>[?postId=<id>]
 *   iforums://message/<id>
 *   iforums://article/<id>
 *   iforums://badge/<id>
 *   iforums://user/<id>
 */
function parseDeepLink(raw: string): NavTarget | null {
  const m = raw.match(/^iforums:\/\/([a-z]+)\/([^?#]+)(?:\?(.+))?$/i);
  if (!m) return null;
  const [, kind, id, query] = m;
  const params = new URLSearchParams(query ?? '');
  switch (kind.toLowerCase()) {
    case 'topic': {
      const postId = params.get('postId') ?? params.get('focusPostId');
      return {
        stack: 'MySpace',
        screen: 'NotificationDispatch',
        params: postId ? { topicId: id, focusPostId: postId } : { topicId: id },
      };
    }
    case 'message':
      return { stack: 'MySpace', screen: 'MessageThread', params: { threadId: id } };
    case 'article':
      return { stack: 'News', screen: 'ArticleDetail', params: { id } };
    case 'badge':
      return { stack: 'MySpace', screen: 'BadgeDetail', params: { badgeId: id } };
    case 'user':
      return { stack: 'MySpace', screen: 'Profile', params: { userId: id } };
    default:
      return null;
  }
}

export function routeFromPayload(data: AnyData): NavTarget | null {
  if (!data || typeof data !== 'object') return null;

  // 1. deepLink wins if it parses
  const deepLinkStr = asString(data.deepLink);
  if (deepLinkStr) {
    const parsed = parseDeepLink(deepLinkStr);
    if (parsed) return parsed;
    // fall through: malformed deepLink — try ID keys
  }

  // 2. ID keys — first match wins, in priority order
  const articleId = asString(data.articleId);
  if (articleId) {
    return { stack: 'News', screen: 'ArticleDetail', params: { id: articleId } };
  }

  const topicId = asString(data.topicId);
  if (topicId) {
    const focusPostId = asString(data.postId) ?? asString(data.focusPostId);
    return {
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: focusPostId ? { topicId, focusPostId } : { topicId },
    };
  }

  const threadId = asString(data.threadId);
  if (threadId) {
    return { stack: 'MySpace', screen: 'MessageThread', params: { threadId } };
  }

  const badgeId = asString(data.badgeId);
  if (badgeId) {
    return { stack: 'MySpace', screen: 'BadgeDetail', params: { badgeId } };
  }

  const userId = asString(data.userId);
  if (userId) {
    return { stack: 'MySpace', screen: 'Profile', params: { userId } };
  }

  return null;
}

export function routeFromNotification(n: NotificationDto): NavTarget | null {
  // 1. jsonData is the richest hint — try it first
  if (n.jsonData) {
    try {
      const parsed = JSON.parse(n.jsonData);
      if (parsed && typeof parsed === 'object') {
        const target = routeFromPayload(parsed as Record<string, unknown>);
        if (target) return target;
      }
    } catch {
      /* malformed — fall through */
    }
  }

  // 2. (contentTypeId, contentTypeValue) discriminator
  const ctIdRaw = n.contentTypeId;
  const ctId = typeof ctIdRaw === 'string' ? parseInt(ctIdRaw, 10) : ctIdRaw;
  const ctValRaw = n.contentTypeValue;
  const ctVal = ctValRaw == null ? null : String(ctValRaw);

  if (ctId === 7 && ctVal) {
    return { stack: 'News', screen: 'ArticleDetail', params: { id: ctVal } };
  }

  // contentTypeId === 6 is media/photo — no dedicated mobile screen yet, return null
  // Other contentTypeId values are not yet documented in the OpenAPI spec.

  // 3. templateId-based mapping — uses real backend template IDs observed
  // in the `notificationTemplates` array returned by GET /user-notifications
  // (the spec doesn't enumerate these; verified on-device).
  const tplIdRaw = n.templateId;
  const tplId = typeof tplIdRaw === 'string' ? parseInt(tplIdRaw, 10) : tplIdRaw;
  const ctValue = n.contentTypeValue == null ? null : String(n.contentTypeValue);

  if (tplId === 23 && ctValue && ctValue !== '0') {
    // "tagged you in a post" — contentTypeValue is the topic id
    return {
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: ctValue },
    };
  }

  // templateIds 37, 38 (forum-related), 4, 5 (profile-related):
  // We don't have a clean target screen yet. Returning null falls back
  // to the Notifications list — the screen-level handler will show a
  // toast so the user knows the tap was registered.

  return null;
}
