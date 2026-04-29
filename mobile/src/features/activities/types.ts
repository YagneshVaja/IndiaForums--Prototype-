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

// ── /content/reactions ───────────────────────────────────────────────────────
// Generic emoji-reaction endpoint used by activities, articles, media, etc.
// Reaction types from the API summary: Awesome, Nice, Loved, Lol, Funny, Fail, Omg, Cry.
// We expose the simplest "like" intent (Loved=3) for the activity feed and let
// the server manage the actual count returned in `reactions`.
export interface ReactToContentRequestDto {
  contentType: number | string;
  contentId: number | string;
  reactionType: number | string;
  // 1 = add, 0 = remove. Server-validated.
  operationType: number | string;
}

export interface ReactToContentResponseDto {
  success: boolean;
  message: string | null;
  contentTypeId: number | string;
  contentId: number | string;
  // Map of { reactionType -> count }. The endpoint returns the canonical
  // post-update totals so callers can replace local state without recounting.
  reactions: Record<string, number | string> | null;
  skipLocalStorage: boolean;
  showCancel: boolean;
}
