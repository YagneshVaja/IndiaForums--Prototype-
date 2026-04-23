import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  sendFriendRequest,
} from '../services/profileApi';

type Id = number | string;

interface Target {
  // User whose profile we're acting on.
  userId: Id;
  // The buddy-list row ID (userMapId / buddyListId). Zero/null when no row
  // exists yet — send-request is the only action that doesn't need it.
  requestId: Id | null | undefined;
  // Current friend state, needed by the block endpoint.
  isFriend?: boolean;
}

/**
 * Bundle of buddy-related mutations for a specific viewed user. Any success
 * invalidates that user's profile + any buddy lists so UI reflects the new
 * friend state without manual refetch wiring.
 */
export function useBuddyActions(target: Target) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['profile', 'user', String(target.userId)] });
    qc.invalidateQueries({ queryKey: ['profile-tab', 'buddies'] });
    qc.invalidateQueries({ queryKey: ['buddies'] });
  };

  const send = useMutation({
    mutationFn: () => sendFriendRequest(target.userId),
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: () => acceptFriendRequest(target.requestId ?? 0),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: () => cancelFriendRequest(target.requestId ?? 0),
    onSuccess: invalidate,
  });
  const block = useMutation({
    mutationFn: (shouldBlock: boolean) =>
      blockUser({
        requestId: target.requestId ?? 0,
        blockedUserId: target.userId,
        block: shouldBlock,
        isFriend: !!target.isFriend,
      }),
    onSuccess: invalidate,
  });

  return { send, accept, cancel, block };
}
