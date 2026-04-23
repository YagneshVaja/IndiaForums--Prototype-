// DTOs for /user-activities (wall feed). Mirrors OpenAPI spec v1.

export interface CreateActivityRequestDto {
  wallUserId: number | string;
  subject?: string | null;
  content?: string | null;
  linkUrl?: string | null;
  userTags?: string | null;
}

export interface CreateActivityResponseDto {
  isSuccess: boolean;
  message: string | null;
  activityId: number | string | null;
}

export interface UpdateActivityRequestDto {
  activityId: number | string;
  subject?: string | null;
  content?: string | null;
  linkUrl?: string | null;
}

export interface UpdateActivityResponseDto {
  isSuccess: boolean;
  message: string;
  activityId: number | string | null;
}

export interface DeleteActivityResponseDto {
  isSuccess: boolean;
  message: string;
}

export interface PostOnUserWallRequestDto {
  wallUserId: number | string;
  // 16 = Testimonial, 17 = Slambook, 18 = Scrapbook (from FEED_META on ProfileScreen)
  feedTypeId: number | string;
  content: string;
  threadId?: number | string | null;
}

export interface PostOnUserWallResponseDto {
  isSuccess: boolean;
  message: string;
  contentId: number | string | null;
}
