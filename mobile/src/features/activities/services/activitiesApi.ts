import { apiClient } from '../../../services/api';
import type { UserActivitiesResponseDto } from '../../profile/types';
import type {
  CreateActivityRequestDto,
  CreateActivityResponseDto,
  DeleteActivityResponseDto,
  PostOnUserWallRequestDto,
  PostOnUserWallResponseDto,
  UpdateActivityRequestDto,
  UpdateActivityResponseDto,
} from '../types';

type Id = number | string;

interface ListParams {
  mode?: string;
  cursor?: string;
  pageSize?: number;
  yearWeekNum?: string;
}

/**
 * /user-activities without a path id returns the authenticated user's own
 * activities (their own wall feed).
 */
export function getMyActivities(params?: ListParams) {
  return apiClient
    .get<UserActivitiesResponseDto>('/user-activities', { params })
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
