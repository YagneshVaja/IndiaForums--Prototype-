// mobile/src/services/notificationRouter.ts

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
