import { apiClient } from '../../../services/api';
import type { UserActivitiesResponseDto } from '../../profile/types';
import type {
  CreateActivityRequestDto,
  CreateActivityResponseDto,
  DeleteActivityResponseDto,
  PostOnUserWallRequestDto,
  PostOnUserWallResponseDto,
  ReactToContentRequestDto,
  ReactToContentResponseDto,
  UpdateActivityRequestDto,
  UpdateActivityResponseDto,
} from '../types';

type Id = number | string;

// Mode discriminator for /user-activities (own + other-user).
// Spec: "Retrieves activities for the authenticated user based on mode:
// all, wall, scrapbook, slambook, testimonial, or feed (timeline)."
export type ActivityMode = 'all' | 'wall' | 'scrapbook' | 'slambook' | 'testimonial' | 'feed';

interface ListParams {
  mode?: ActivityMode | string;
  cursor?: string | number;
  pageSize?: number;
  yearWeekNum?: string;
}

/**
 * /user-activities without a path id returns the authenticated user's own
 * activities (their own wall feed). Mode is required by the API.
 */
export function getMyActivities(params?: ListParams) {
  return apiClient
    .get<UserActivitiesResponseDto>('/user-activities', {
      params: { mode: 'all', ...params },
    })
    .then((r) => r.data);
}

export function createActivity(body: CreateActivityRequestDto) {
  return apiClient
    .post<CreateActivityResponseDto>('/user-activities', body)
    .then((r) => r.data);
}

export function updateActivity(activityId: Id, body: UpdateActivityRequestDto) {
  return apiClient
    .put<UpdateActivityResponseDto>(`/user-activities/${activityId}`, body)
    .then((r) => r.data);
}

export function deleteActivity(activityId: Id) {
  return apiClient
    .delete<DeleteActivityResponseDto>(`/user-activities/${activityId}`)
    .then((r) => r.data);
}

/** Post on another user's wall (scrapbook / slambook / testimonial). */
export function postOnWall(body: PostOnUserWallRequestDto) {
  return apiClient
    .post<PostOnUserWallResponseDto>('/user-activities/post-on-wall', body)
    .then((r) => r.data);
}

// Reaction code — "Loved" is the closest analogue to a Facebook-style "like"
// for the activity feed. Server enum: 1=Awesome 2=Nice 3=Loved 4=Lol 5=Funny
// 6=Fail 7=Omg 8=Cry. We use Loved for the heart-icon toggle in ActivityCard.
export const REACTION_LOVED = 3;

/**
 * Toggle a reaction on any content with a (contentType, contentId) pair —
 * used here for activity items, but the endpoint is generic. Returns the
 * canonical reaction counts so callers can replace optimistic state.
 */
export function reactToContent(body: ReactToContentRequestDto) {
  return apiClient
    .post<ReactToContentResponseDto>('/content/reactions', body)
    .then((r) => r.data);
}
