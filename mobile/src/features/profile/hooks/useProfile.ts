import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import {
  getMyProfile,
  getUserProfile,
} from '../services/profileApi';
import type { MyProfileResponseDto, UserProfileDto, UserProfileResponseDto } from '../types';
import { useEffect } from 'react';

/**
 * Unified profile hook — pulls /me for the signed-in user, /users/{id}/profile
 * for anyone else. Returns a narrowed shape usable by hero/stats UI regardless
 * of which endpoint fired.
 */
export interface NormalizedProfile {
  userId: number | string;
  userName: string;
  displayName: string | null;
  groupId: number | string | null;
  groupName: string | null;
  rankName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  updateChecksum: string | null;
  lastVisitedDate: string | null;
  joinDate: string | null;
  commentCount: number | string | null;
  postCount: number | string | null;
  statusMessage: string | null;
  forumSignature: string | null;
  countryCode: string | null;
  isOwnProfile: boolean;
  // Raw payload if a consumer needs fields we didn't promote
  raw: MyProfileResponseDto | UserProfileResponseDto;
  // Only set when fetched via /users/{id}/profile
  buddyDetails?: UserProfileResponseDto['buddyDetails'];
  // First page of wall activities (only for non-self via /users/{id}/profile)
  activities?: UserProfileResponseDto['activities'];
}

function fromMe(p: MyProfileResponseDto): NormalizedProfile {
  return {
    userId: p.userId,
    userName: p.userName,
    displayName: p.displayName,
    groupId: p.groupId ?? null,
    groupName: p.groupName ?? null,
    rankName: p.rankName ?? p.groupName ?? null,
    avatarUrl: p.thumbnailUrl,
    bannerUrl: p.bannerUrl,
    thumbnailUrl: p.thumbnailUrl,
    updateChecksum: p.updateChecksum,
    lastVisitedDate: p.lastVisitedDate,
    joinDate: p.joinDate ?? null,
    commentCount: p.commentCount ?? null,
    postCount: p.postCount ?? null,
    statusMessage: p.statusMessage,
    forumSignature: p.forumSignature,
    countryCode: p.countryCode,
    isOwnProfile: true,
    raw: p,
  };
}

function fromOther(p: UserProfileResponseDto): NormalizedProfile {
  const u = (p.user ?? {}) as UserProfileDto;
  return {
    userId: u.userId ?? '',
    userName: u.userName ?? '',
    displayName: u.displayName ?? null,
    groupId: u.groupId ?? null,
    groupName: u.groupName ?? null,
    rankName: u.rankName ?? u.groupName ?? null,
    avatarUrl: u.thumbnailUrl ?? null,
    bannerUrl: u.bannerUrl ?? null,
    thumbnailUrl: u.thumbnailUrl ?? null,
    updateChecksum: u.updateChecksum ?? null,
    lastVisitedDate: u.lastVisitedDate ?? null,
    joinDate: u.joinDate ?? null,
    commentCount: u.commentCount ?? null,
    postCount: u.postCount ?? null,
    statusMessage: u.statusMessage ?? null,
    forumSignature: u.forumSignature ?? null,
    countryCode: null,
    isOwnProfile: false,
    raw: p,
    buddyDetails: p.buddyDetails,
    activities: p.activities,
  };
}

/**
 * @param viewedUserId  the user whose profile is being viewed. Pass undefined
 *                      or the authenticated user's own id to pull /me.
 */
export function useProfile(viewedUserId?: number | string) {
  const authUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const selfId = authUser?.userId;
  const isOwn = !viewedUserId || String(viewedUserId) === String(selfId);

  const query = useQuery<NormalizedProfile, Error>({
    queryKey: isOwn ? ['profile', 'me', selfId] : ['profile', 'user', String(viewedUserId)],
    queryFn: async () => {
      if (isOwn) {
        if (!isAuthenticated) throw new Error('Not signed in');
        const p = await getMyProfile();
        return fromMe(p);
      }
      const p = await getUserProfile(viewedUserId!);
      return fromOther(p);
    },
    enabled: isOwn ? !!selfId && isAuthenticated : !!viewedUserId,
    staleTime: 2 * 60 * 1000,
  });

  // Keep authStore's cached flags in sync with /me so the dashboard banner
  // reflects server truth without requiring a re-login.
  useEffect(() => {
    if (!query.data?.isOwnProfile) return;
    const raw = query.data.raw as MyProfileResponseDto;
    const serverVerified =
      typeof raw.isEmailConfirmed === 'boolean' ? raw.isEmailConfirmed : undefined;
    if (serverVerified != null && authUser?.emailVerified !== serverVerified) {
      updateAuthUser({ emailVerified: serverVerified });
    }
  }, [query.data, authUser?.emailVerified, updateAuthUser]);

  return query;
}
