import api, { PAGINATION_DEFAULTS } from './api';

// ── Buddy / Friend Graph API ─────────────────────────────────────────────────
// Endpoints split between two route prefixes:
//   - GET  /my-buddy-list                    (My Buddies tag)
//   - POST /user-buddies/friend-request      (User Buddies tag)
//   - POST /user-buddies/accept-friend-request
//   - POST /user-buddies/cancel-friend-request
//   - POST /user-buddies/block-user
//
// All endpoints require authentication.
//
// MyBuddyListResponseDto: { buddies, totalRecordCount, totalPages, currentPage, pageSize, mode, ... }
// SendFriendRequestDto:    { recipientId }
// AcceptFriendRequestDto:  { requestId }
// CancelFriendRequestDto:  { requestId }
// BlockUserDto:            { requestId, blockedUserId, block: 0|1, isFriend }
//
// Mode codes for getMyBuddyList:
//   bl  = Buddy List (friends)
//   pl  = Pending friend requests (received by me)
//   wl  = Waiting list (friend requests sent by me)
//   bll = Blocked list
//   vl  = Profile visitors

export const BUDDY_MODES = {
  FRIENDS:  'bl',
  PENDING:  'pl',
  SENT:     'wl',
  BLOCKED:  'bll',
  VISITORS: 'vl',
};

/**
 * Fetch the authenticated user's buddy list in one of the 5 modes.
 * @param {string} mode one of BUDDY_MODES.* values
 * @param {object} params optional { username, pn, ps }
 */
export function getMyBuddyList(mode, params = {}) {
  return api.get('/my-buddy-list', {
    params: { mode, ...PAGINATION_DEFAULTS, ...params },
  });
}

/**
 * Send a friend request to another user.
 * @param {number|string} recipientId
 */
export function sendFriendRequest(recipientId) {
  return api.post('/user-buddies/friend-request', { recipientId });
}

/**
 * Accept a pending friend request.
 * @param {number|string} requestId the buddyListId from the pending list
 */
export function acceptFriendRequest(requestId) {
  return api.post('/user-buddies/accept-friend-request', { requestId });
}

/**
 * Cancel a sent request OR reject a received pending request.
 * @param {number|string} requestId the buddyListId from the sent/pending list
 */
export function cancelFriendRequest(requestId) {
  return api.post('/user-buddies/cancel-friend-request', { requestId });
}

/**
 * Block or unblock a user. The spec uses an integer flag (0 = unblock, 1 = block).
 * @param {object} args
 * @param {number|string} args.blockedUserId target user
 * @param {boolean} args.block true to block, false to unblock
 * @param {boolean} [args.isFriend=false] whether target is currently a friend
 * @param {number|string} [args.requestId=0] existing buddyListId if any
 */
export function blockUser({ blockedUserId, block, isFriend = false, requestId = 0 }) {
  return api.post('/user-buddies/block-user', {
    requestId,
    blockedUserId,
    block: block ? 1 : 0,
    isFriend,
  });
}
