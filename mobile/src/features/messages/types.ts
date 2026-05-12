// DTOs mirror api2.indiaforums.com OpenAPI spec (v1) for /messages.

export const MESSAGE_MODES = {
  INBOX: 'Inbox',
  OUTBOX: 'Outbox',
  READ: 'Read',
  UNREAD: 'Unread',
} as const;
export type MessageMode = (typeof MESSAGE_MODES)[keyof typeof MESSAGE_MODES];

export const BULK_ACTIONS = {
  READ: 'read',
  UNREAD: 'unread',
  DELETE: 'delete',
  STAR: 'star',
  UNSTAR: 'unstar',
} as const;
export type BulkAction = (typeof BULK_ACTIONS)[keyof typeof BULK_ACTIONS];

export interface PmFolderDto {
  folderId: number | string;
  folderName: string;
  createdBy: number | string;
  pmCount: number | string;
}

export interface PmThreadParticipant {
  userId: number | string;
  userName: string;
}

export interface MessageListItemDto {
  pmlId: number | string;
  pmId: number | string;
  subject: string;
  messageDate: string;
  readPost: boolean;
  priority: number | string;
  folderId: number | string | null;
  folderName: string | null;
  likeType: number | string | null;
  rootMessageId: number | string;
  userId: number | string;
  userName: string;
  displayName: string;
  groupId: number | string;
  avatarType: number | string | null;
  avatarAccent: string | null;
  lastVisitedDate: string | null;
  privacy: number | string;
  showCountry: number | string;
  countryCode: string | null;
  statusCode: number | string;
}

export interface MessageListResponseDto {
  mode: string;
  messages: MessageListItemDto[];
  totalCount: number | string;
  pageNumber: number | string;
  pageSize: number | string;
  cursor: number | string | null;
  filter: string | null;
  searchUserId: number | string | null;
  priority: number | string | null;
  folderId: number | string | null;
}

export interface MessageDraftDto {
  messageDraftId: number | string;
  pmId: number | string | null;
  createdBy: number | string;
  createdWhen: string;
  subject: string;
  message: string | null;
  toIds: string | null;
  toGroups: string | null;
  createdWhenEpoch: number | string;
}

export interface MessageDraftsResponseDto {
  drafts: MessageDraftDto[];
  totalCount: number | string;
  pageNumber: number | string;
  pageSize: number | string;
  totalPages: number | string;
  cursor: number | string | null;
  fetchBackward: boolean;
}

export interface FolderListResponseDto {
  folders: PmFolderDto[];
  userId: number | string;
}

export interface CreateOrUpdateFolderRequestDto {
  folderId: number | string;
  folderName: string;
}

export interface CreateOrUpdateFolderResponseDto {
  isSuccess: boolean;
  message: string;
  folderId: number | string | null;
}

export interface DeleteFolderResponseDto {
  isSuccess: boolean;
  message: string;
}

export interface MoveMessagesToFolderRequestDto {
  pmlIds: string;
  folderId: number | string;
}

export interface MessageBulkActionRequestDto {
  pmlIds: string;
  mode: BulkAction | string;
}

export interface MessageBulkActionResponseDto {
  isSuccess: boolean;
  message: string;
  affectedCount: number | string;
}

export interface CreateMessageRequestDto {
  subject: string;
  message: string;
  userList: string | null;
  userGroupList?: string | null;
  bcc: boolean;
  parentId?: number | string | null;
  rootMessageId: number | string;
  emailNotify: boolean;
  draftId?: number | string | null;
  postType: string;
}

export interface CreateMessageResponseDto {
  isSuccess: boolean;
  message: string;
  messageId: number | string | null;
  draftId: number | string | null;
  deliveredTo: string[];
  notDeliveredTo: string[];
  inactiveUsers: string[];
  blockedUsers: string[];
  restrictedUsers: string[];
  validUserList: string | null;
}

export interface MessageThreadItemDto {
  pmId: number | string;
  fromUserId: number | string;
  subject: string;
  message: string;
  messageDate: string;
  parentId: number | string | null;
  toIds: string | null;
  hide: boolean | null;
  likeJsonData: string | null;
  likeCount: number | string;
  reactedEmojis: string[];
  userName: string;
  displayName: string;
  groupId: number | string;
  groupName: string;
  userLevel: number | string;
  avatarType: number | string | null;
  avatarAccent: string | null;
  updateChecksum: string | null;
  lastVisitedDate: string | null;
  privacy: number | string;
  showCountry: number | string;
  countryCode: string | null;
  statusCode: number | string;
  visitStreakCount: number | string;
  signatureJson: string | null;
  forumSignatureText: string | null;
  badgeJson: string | null;
}

export interface PmRootDto {
  rootId: number | string;
  subject: string;
  pmCount: number | string;
  userJsonData: string | null;
  participants: PmThreadParticipant[];
}

export interface MessageThreadResponseDto {
  rootMessage: PmRootDto;
  messages: MessageThreadItemDto[];
  totalCount: number | string;
  pageNumber: number | string;
  pageSize: number | string;
  totalPages: number | string;
  cursor: number | string | null;
  filter: string | null;
  fetchBackward: boolean;
}

export interface OptOutOfThreadResponseDto {
  isSuccess: boolean;
  message: string;
}

export interface MessageOverviewResponseDto {
  userId: number | string;
  userName: string;
  inboxMessageCount: number | string;
  pmLimit: number | string;
  pmPercent: number | string;
  unreadMessageCount: number | string;
  starredMessageCount: number | string;
  outboxMessageCount: number | string;
  pmFolders: PmFolderDto[];
}

// ── /messages/new (compose initialization) ──────────────────────────────────
// Only the fields the mobile UI reads. Widen later if needed.

export interface UserDetailsDto {
  userId: number | string;
  userName: string;
  displayName: string;
  avatarType: number | string | null;
  avatarAccent: string | null;
}

export interface MessageDetailDto {
  pmId: number | string;
  subject: string;
  message: string;
  messageDate: string;
  fromUserId: number | string;
  userName: string;
  displayName: string;
}

export interface MessageDraftDetailDto {
  messageDraftId: number | string;
  subject: string;
  message: string | null;
  toIds: string | null;
  toGroups: string | null;
}

export interface NewMessageFormDto {
  user: UserDetailsDto;
  messageDetail: MessageDetailDto | null;
  draft: MessageDraftDetailDto | null;
  mode: string;
  pmUserTagLimit: number | string;
  rootMessageId: number | string;
  parentId: number | string | null;
  pmId: number | string;
  toUserId: number | string | null;
  toUsername: string | null;
  subject: string | null;
}

export interface RelatedMessageDto {
  pmId: number | string;
  subject: string;
  messageDate: string;
}

export interface MessageDetailResponseDto {
  message: MessageDetailDto;
  parentMessage: MessageDetailDto | null;
  relatedMessages: RelatedMessageDto[];
  recipients: PmThreadParticipant[];
  wasAlreadyRead: boolean;
  mode: string;
}
