import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as api from '../services/profileApi';
import { getMyActivities } from '../../activities/services/activitiesApi';

export type ProfileTabKey =
  | 'activity'
  | 'posts'
  | 'comments'
  | 'buddies'
  | 'favorites'
  | 'forums'
  | 'badges'
  | 'drafts'
  | 'watching'
  | 'ff-following'
  | 'ff-followers'
  | 'warnings';

interface Args {
  tab: ProfileTabKey;
  userId: number | string;
  isOwn: boolean;
  page: number;
  pageSize?: number;
}

/**
 * One paginated loader for every tab — the queryFn switches on (tab, isOwn).
 * Every tab caches separately by queryKey and survives unmount so toggling
 * tabs is cheap.
 */
export function useProfileTab({ tab, userId, isOwn, page, pageSize = 20 }: Args) {
  return useQuery({
    queryKey: ['profile-tab', tab, String(userId), isOwn, page, pageSize],
    queryFn: () => loadTab(tab, userId, isOwn, page, pageSize),
    enabled: !!userId,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

async function loadTab(
  tab: ProfileTabKey,
  userId: number | string,
  isOwn: boolean,
  page: number,
  ps: number,
): Promise<TabResult> {
  switch (tab) {
    case 'activity': {
      // Self → /user-activities (no path id). Other → /user-activities/{userId}.
      // The "mode" param is only required on the path-id variant.
      if (isOwn) {
        const r = await getMyActivities({ pageSize: ps });
        return { kind: 'activity', items: r.activities, nextUrl: r.nextUrl };
      }
      const r = await api.getUserActivities(userId, { mode: '3', pageSize: ps });
      return { kind: 'activity', items: r.activities, nextUrl: r.nextUrl };
    }
    case 'posts': {
      const r = isOwn
        ? await api.getMyPosts({ pn: page, ps, pr: 20 })
        : await api.getUserPosts(userId, { pn: page, ps, pr: 20 });
      return {
        kind: 'posts',
        items: r.topics,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'comments': {
      const r = isOwn
        ? await api.getMyComments({ pn: page, ps })
        : await api.getUserComments(userId, { pn: page, ps });
      return {
        kind: 'comments',
        items: r.comments,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'buddies': {
      // Backend mode codes: bl=friends, pl=pending, wl=sent, bll=blocked, vl=visitors.
      const r = isOwn
        ? await api.getMyBuddies({ pn: page, ps, mode: 'bl' })
        : await api.getUserBuddies(userId, { pn: page, ps });
      return {
        kind: 'buddies',
        items: r.buddies,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'favorites': {
      // "Favorites" is the merged celebs + movies + shows view. Use
      // allSettled so one failing sub-endpoint doesn't blank the whole tab —
      // some users legitimately have zero favourites in one category.
      const results = await Promise.allSettled([
        isOwn ? api.getMyCelebs({ pn: 1, ps: 10 }) : api.getUserCelebs(userId, { pn: 1, ps: 10 }),
        isOwn ? api.getMyMovies({ pn: 1, ps: 10 }) : api.getUserMovies(userId, { pn: 1, ps: 10 }),
        isOwn ? api.getMyShows({ pn: 1, ps: 10 }) : api.getUserShows(userId, { pn: 1, ps: 10 }),
      ]);
      const [celebsR, moviesR, showsR] = results;
      return {
        kind: 'favorites',
        celebrities: celebsR.status === 'fulfilled' ? celebsR.value.celebrities : [],
        movies: moviesR.status === 'fulfilled' ? moviesR.value.movies : [],
        shows: showsR.status === 'fulfilled' ? showsR.value.shows : [],
      };
    }
    case 'forums': {
      const r = isOwn
        ? await api.getMyForums({ pn: page, ps })
        : await api.getUserForums(userId, { pn: page, ps });
      return {
        kind: 'forums',
        items: r.forums,
        invited: r.invitedForums,
        requested: r.requestedForums,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'badges': {
      const r = isOwn ? await api.getMyBadges() : await api.getUserBadges(userId);
      return { kind: 'badges', items: r.badges };
    }
    case 'drafts': {
      const r = await api.getMyDrafts({ pn: page, ps });
      return {
        kind: 'drafts',
        items: r.drafts,
        total: num(r.totalCount),
        page: num(r.pageNumber),
        totalPages: num(r.totalPages),
      };
    }
    case 'watching': {
      // pr=0 matches the web prototype — the spec requires pr but accepts 0.
      const r = await api.getMyWatchedTopics({ pn: page, ps, pr: 0 });
      return {
        kind: 'watching',
        items: r.topics,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'ff-following': {
      const r = await api.getMyFFFollowing({ pn: page, ps });
      return {
        kind: 'ff-following',
        items: r.following,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'ff-followers': {
      const r = await api.getMyFFFollowers({ pn: page, ps });
      return {
        kind: 'ff-followers',
        items: r.followers,
        total: num(r.totalRecordCount),
        page: num(r.currentPage),
        totalPages: num(r.totalPages),
      };
    }
    case 'warnings': {
      const r = await api.getMyWarnings();
      return { kind: 'warnings', items: r.warningHistory };
    }
  }
}

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'number' ? v : parseInt(v, 10) || 0;
}

// ── Discriminated union for tab results ─────────────────────────────────────

import type {
  ActivityDto,
  BuddyDto,
  CelebrityDto,
  FollowerDto,
  FollowingDto,
  ForumDraftDto,
  InvitedForumDto,
  MovieDto,
  MyCommentDto,
  MyForumDto,
  MyPostTopicDto,
  ShowDto,
  UserBadgeDto,
  WarningDto,
} from '../types';

export type TabResult =
  | { kind: 'activity'; items: ActivityDto[]; nextUrl: string | null }
  | { kind: 'posts'; items: MyPostTopicDto[]; total: number; page: number; totalPages: number }
  | { kind: 'comments'; items: MyCommentDto[]; total: number; page: number; totalPages: number }
  | { kind: 'buddies'; items: BuddyDto[]; total: number; page: number; totalPages: number }
  | { kind: 'favorites'; celebrities: CelebrityDto[]; movies: MovieDto[]; shows: ShowDto[] }
  | {
      kind: 'forums';
      items: MyForumDto[];
      invited: InvitedForumDto[];
      requested: InvitedForumDto[];
      total: number;
      page: number;
      totalPages: number;
    }
  | { kind: 'badges'; items: UserBadgeDto[] }
  | { kind: 'drafts'; items: ForumDraftDto[]; total: number; page: number; totalPages: number }
  | { kind: 'watching'; items: MyPostTopicDto[]; total: number; page: number; totalPages: number }
  | { kind: 'ff-following'; items: FollowingDto[]; total: number; page: number; totalPages: number }
  | { kind: 'ff-followers'; items: FollowerDto[]; total: number; page: number; totalPages: number }
  | { kind: 'warnings'; items: WarningDto[] };
