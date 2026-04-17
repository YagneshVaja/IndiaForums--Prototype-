import api, { PAGINATION_DEFAULTS } from './api';

// ── Buddy / Friend Graph API ─────────────────────────────────────────────────

export const BUDDY_MODES = {
  FRIENDS:  'bl',
  PENDING:  'pl',
  SENT:     'wl',
  BLOCKED:  'bll',
  VISITORS: 'vl',
};

/**
 * Fetch the authenticated user's buddy list in one of the 5 modes.
 */
export function getMyBuddyList(mode: string, params: any = {}) {
  return api.get('/my-buddy-list', {
    params: { mode, ...PAGINATION_DEFAULTS, ...params },
  });
}

/**
 * Send a friend request to another user.
 */
export function sendFriendRequest(recipientId: number | string) {
  return api.post('/user-buddies/friend-request', { recipientId });
}

/**
 * Accept a pending friend request.
 */
export function acceptFriendRequest(requestId: number | string) {
  return api.post('/user-buddies/accept-friend-request', { requestId });
}

/**
 * Cancel a sent request OR reject a received pending request.
 */
export function cancelFriendRequest(requestId: number | string) {
  return api.post('/user-buddies/cancel-friend-request', { requestId });
}

/**
 * Block or unblock a user.
 */
export function blockUser({ blockedUserId, block, isFriend = false, requestId = 0 }: {
  blockedUserId: number | string;
  block: boolean;
  isFriend?: boolean;
  requestId?: number | string;
}) {
  return api.post('/user-buddies/block-user', {
    requestId,
    blockedUserId,
    block: block ? 1 : 0,
    isFriend,
  });
}
