import { apiClient } from '../../../services/api';
import type {
  InboxCountsResponseDto,
  ReadNotificationsRequestDto,
  ReadNotificationsResponseDto,
  UnreadNotificationCountResponseDto,
  UserNotificationsResponseDto,
} from '../types';

interface ListParams {
  // Required pagination per spec: pn=page number, ps=page size, pr=page range.
  pn: number;
  ps: number;
  pr: number;
  // Template filter (comma-separated template IDs).
  t?: string;
}

export function getNotifications(params: ListParams) {
  return apiClient
    .get<UserNotificationsResponseDto>('/user-notifications', { params })
    .then((r) => r.data);
}

export function getInboxCounts() {
  return apiClient
    .get<InboxCountsResponseDto>('/user-notifications/inbox-counts')
    .then((r) => r.data);
}

export function getUnreadCount() {
  return apiClient
    .get<UnreadNotificationCountResponseDto>('/user-notifications/unread-count')
    .then((r) => r.data);
}

/**
 * Mark one or more notifications read. Passing `null` or an empty string
 * marks ALL unread notifications read (server-side behavior).
 */
export function markAsRead(body: ReadNotificationsRequestDto) {
  return apiClient
    .post<ReadNotificationsResponseDto>('/user-notifications/read', body)
    .then((r) => r.data);
}
