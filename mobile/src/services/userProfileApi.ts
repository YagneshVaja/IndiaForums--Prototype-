import { apiClient } from './api';

// Minimal surface needed right now — only the moderator-group backfill.
// Auth responses don't include groupId, so we fetch the full profile after
// login and merge it in. The full profile response has many more fields;
// we only care about user.groupId/groupName here, so the type is narrow.

export interface UserProfileResponse {
  user?: {
    userId?: number | string;
    userName?: string;
    groupId?: number | null;
    groupName?: string | null;
  };
  loggedInUser?: unknown;
}

export function getProfile(userId: number | string) {
  return apiClient.get<UserProfileResponse>(`/users/${userId}/profile`);
}
