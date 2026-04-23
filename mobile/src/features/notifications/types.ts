// DTOs mirror api2.indiaforums.com OpenAPI spec (v1) for /user-notifications.

export interface NotificationTemplateDto {
  templateId: number | string;
  templateDesc: string;
  notificationCount: number | string;
}

export interface NotificationDto {
  notificationId: number | string;
  userId: number | string;
  templateId: number | string;
  contentTypeId: number | string;
  contentTypeValue: number | string;
  message: string | null;
  createdBy: number | string;
  publishedWhen: string;
  jsonData: string | null;
  // read: 1 = read, 0 = unread. API sometimes sends as string.
  read: number | string;
  title: string | null;
  user: unknown;
  displayUserName: string | null;
}

export interface UserNotificationsResponseDto {
  notificationTemplates: NotificationTemplateDto[];
  notifications: NotificationDto[];
  totalNotificationCount: number | string;
  totalRecordCount: number | string;
  totalPages: number | string;
  currentPage: number | string;
  pageSize: number | string;
  nextUrl: string | null;
  previousUrl: string | null;
  firstUrl: string | null;
  lastUrl: string | null;
}

export interface InboxCountsResponseDto {
  unreadNotifications: number | string;
  unreadMessages: number | string;
}

// API expects a comma-separated string of IDs (or empty string to mark all).
export interface ReadNotificationsRequestDto {
  ids: string | null;
}

export interface ReadNotificationsResponseDto {
  success: boolean;
  message: string;
  readCount: number | string;
  unreadCount: number | string;
}

export interface UnreadNotificationCountResponseDto {
  unreadCount: number | string;
}
