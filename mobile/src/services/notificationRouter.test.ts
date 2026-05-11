// mobile/src/services/notificationRouter.test.ts
import { routeFromPayload, routeFromNotification } from './notificationRouter';
import type { NotificationDto } from '../features/notifications/types';

function n(partial: Partial<NotificationDto>): NotificationDto {
  return {
    notificationId: 0,
    userId: 0,
    templateId: 0,
    contentTypeId: 0,
    contentTypeValue: 0,
    message: null,
    createdBy: 0,
    publishedWhen: '',
    jsonData: null,
    read: 0,
    title: null,
    user: null,
    displayUserName: null,
    ...partial,
  };
}

describe('notificationRouter', () => {
  test('returns null for null/undefined/empty data', () => {
    expect(routeFromPayload(null)).toBeNull();
    expect(routeFromPayload(undefined)).toBeNull();
    expect(routeFromPayload({})).toBeNull();
  });

  test('articleId routes to ArticleDetail', () => {
    expect(routeFromPayload({ articleId: '42' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('topicId (no postId) routes to NotificationDispatch', () => {
    expect(routeFromPayload({ topicId: '99' })).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99' },
    });
  });

  test('topicId + postId routes to NotificationDispatch with focusPostId', () => {
    expect(routeFromPayload({ topicId: '99', postId: '12345' })).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99', focusPostId: '12345' },
    });
  });

  test('threadId routes to MessageThread', () => {
    expect(routeFromPayload({ threadId: '7' })).toEqual({
      stack: 'MySpace',
      screen: 'MessageThread',
      params: { threadId: '7' },
    });
  });

  test('badgeId routes to BadgeDetail', () => {
    expect(routeFromPayload({ badgeId: '3' })).toEqual({
      stack: 'MySpace',
      screen: 'BadgeDetail',
      params: { badgeId: '3' },
    });
  });

  test('userId routes to Profile', () => {
    expect(routeFromPayload({ userId: '88' })).toEqual({
      stack: 'MySpace',
      screen: 'Profile',
      params: { userId: '88' },
    });
  });

  test('numeric IDs are coerced to strings', () => {
    expect(routeFromPayload({ articleId: 42 })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('deepLink (iforums://topic/99?postId=12) overrides ID keys', () => {
    expect(
      routeFromPayload({
        deepLink: 'iforums://topic/99?postId=12',
        articleId: '42', // ignored — deepLink wins
      }),
    ).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '99', focusPostId: '12' },
    });
  });

  test('deepLink iforums://message/55 routes to MessageThread', () => {
    expect(routeFromPayload({ deepLink: 'iforums://message/55' })).toEqual({
      stack: 'MySpace',
      screen: 'MessageThread',
      params: { threadId: '55' },
    });
  });

  test('deepLink iforums://article/77 routes to ArticleDetail', () => {
    expect(routeFromPayload({ deepLink: 'iforums://article/77' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '77' },
    });
  });

  test('deepLink iforums://badge/9 routes to BadgeDetail', () => {
    expect(routeFromPayload({ deepLink: 'iforums://badge/9' })).toEqual({
      stack: 'MySpace',
      screen: 'BadgeDetail',
      params: { badgeId: '9' },
    });
  });

  test('deepLink iforums://user/123 routes to Profile', () => {
    expect(routeFromPayload({ deepLink: 'iforums://user/123' })).toEqual({
      stack: 'MySpace',
      screen: 'Profile',
      params: { userId: '123' },
    });
  });

  test('malformed deepLink falls back to ID keys', () => {
    expect(routeFromPayload({ deepLink: 'not a url', articleId: '42' })).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });

  test('malformed deepLink with no ID keys returns null', () => {
    expect(routeFromPayload({ deepLink: 'not a url' })).toBeNull();
  });

  test('unknown keys only returns null', () => {
    expect(routeFromPayload({ randomKey: 'value' })).toBeNull();
  });

  test('priority: articleId beats topicId beats threadId beats badgeId beats userId', () => {
    expect(
      routeFromPayload({
        articleId: '1',
        topicId: '2',
        threadId: '3',
        badgeId: '4',
        userId: '5',
      }),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '1' },
    });
  });
});

describe('routeFromNotification', () => {
  test('null jsonData + unknown contentType → null', () => {
    expect(routeFromNotification(n({ contentTypeId: 99, contentTypeValue: 5 }))).toBeNull();
  });

  test('jsonData carrying topicId routes to NotificationDispatch', () => {
    expect(
      routeFromNotification(
        n({ jsonData: JSON.stringify({ topicId: 42, postId: 99 }) }),
      ),
    ).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '42', focusPostId: '99' },
    });
  });

  test('jsonData carrying deepLink wins', () => {
    expect(
      routeFromNotification(
        n({ jsonData: JSON.stringify({ deepLink: 'iforums://message/7' }) }),
      ),
    ).toEqual({
      stack: 'MySpace',
      screen: 'MessageThread',
      params: { threadId: '7' },
    });
  });

  test('contentTypeId=7 + value routes to ArticleDetail', () => {
    expect(
      routeFromNotification(n({ contentTypeId: 7, contentTypeValue: 1234 })),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '1234' },
    });
  });

  test('contentTypeId=7 also handles string IDs', () => {
    expect(
      routeFromNotification(n({ contentTypeId: '7', contentTypeValue: '1234' })),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '1234' },
    });
  });

  test('malformed jsonData falls through gracefully', () => {
    expect(
      routeFromNotification(n({ jsonData: 'not json', contentTypeId: 7, contentTypeValue: 88 })),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '88' },
    });
  });

  test('empty jsonData object falls through to contentType', () => {
    expect(
      routeFromNotification(n({ jsonData: '{}', contentTypeId: 7, contentTypeValue: 88 })),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '88' },
    });
  });

  test('templateId=23 (tagged in post) routes to NotificationDispatch using contentTypeValue', () => {
    expect(
      routeFromNotification(n({ templateId: 23, contentTypeValue: 5089183 })),
    ).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '5089183' },
    });
  });

  test('templateId=23 works with string templateId and contentTypeValue', () => {
    expect(
      routeFromNotification(n({ templateId: '23', contentTypeValue: '5089183' })),
    ).toEqual({
      stack: 'MySpace',
      screen: 'NotificationDispatch',
      params: { topicId: '5089183' },
    });
  });

  test('templateId=23 with missing contentTypeValue returns null', () => {
    expect(routeFromNotification(n({ templateId: 23, contentTypeValue: 0 }))).toBeNull();
  });

  test('templateId=37 (forum invite) currently has no route → null', () => {
    expect(routeFromNotification(n({ templateId: 37, contentTypeValue: 99 }))).toBeNull();
  });

  test('jsonData still wins over templateId mapping', () => {
    expect(
      routeFromNotification(
        n({
          templateId: 23,
          contentTypeValue: 99,
          jsonData: JSON.stringify({ articleId: '42' }),
        }),
      ),
    ).toEqual({
      stack: 'News',
      screen: 'ArticleDetail',
      params: { id: '42' },
    });
  });
});
