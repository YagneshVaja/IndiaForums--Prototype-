import { apiClient } from '../../../services/api';
import type {
  CreateMessageRequestDto,
  CreateMessageResponseDto,
  CreateOrUpdateFolderRequestDto,
  CreateOrUpdateFolderResponseDto,
  DeleteFolderResponseDto,
  FolderListResponseDto,
  MessageBulkActionRequestDto,
  MessageBulkActionResponseDto,
  MessageDetailResponseDto,
  MessageDraftsResponseDto,
  MessageListResponseDto,
  MessageOverviewResponseDto,
  MessageThreadResponseDto,
  MoveMessagesToFolderRequestDto,
  NewMessageFormDto,
  OptOutOfThreadResponseDto,
} from '../types';

type Id = number | string;

const M = '/messages';

// ── Overview + folders ──────────────────────────────────────────────────────

export function getOverview() {
  return apiClient.get<MessageOverviewResponseDto>(`${M}/overview`).then((r) => r.data);
}

export function getFolders() {
  return apiClient.get<FolderListResponseDto>(`${M}/folders`).then((r) => r.data);
}

export function createOrUpdateFolder(body: CreateOrUpdateFolderRequestDto) {
  return apiClient
    .post<CreateOrUpdateFolderResponseDto>(`${M}/folders`, body)
    .then((r) => r.data);
}

export function deleteFolder(folderId: Id) {
  return apiClient
    .delete<DeleteFolderResponseDto>(`${M}/folders/${folderId}`)
    .then((r) => r.data);
}

// ── List / drafts / thread / detail ─────────────────────────────────────────

interface ListParams {
  mode: string;
  pageNumber?: number;
  pageSize?: number;
  filter?: string;
  uid?: number;
  priority?: number;
  folderId?: number;
  cursor?: number;
  fetchBackward?: boolean;
}

export function getMessages(params: ListParams) {
  return apiClient.get<MessageListResponseDto>(M, { params }).then((r) => r.data);
}

export function getDrafts(params?: { pageNumber?: number; pageSize?: number }) {
  return apiClient.get<MessageDraftsResponseDto>(`${M}/drafts`, { params }).then((r) => r.data);
}

export function getMessageThread(
  rootId: Id,
  params?: { pageNumber?: number; pageSize?: number; cursor?: number; fetchBackward?: boolean },
) {
  return apiClient
    .get<MessageThreadResponseDto>(`${M}/thread/${rootId}`, { params })
    .then((r) => r.data);
}

// ── Compose initialization + single-message detail ──────────────────────────

export interface NewMessageFormParams {
  mode?: string;
  id?: number | string;     // pmId for replies
  did?: number | string;    // draftId for hydration
  tuid?: number | string;   // target userId
  tunm?: string;            // target username
  prtid?: number | string;  // parentId
}

export function getNewMessageForm(params: NewMessageFormParams) {
  return apiClient.get<NewMessageFormDto>(`${M}/new`, { params }).then((r) => r.data);
}

export function getMessageDetail(id: Id) {
  return apiClient.get<MessageDetailResponseDto>(`${M}/${id}`).then((r) => r.data);
}

export function optOutOfThread(rootId: Id) {
  // IIS/Cloudflare rejects POSTs without a body as 411 "Length Required" —
  // pass an empty object so axios sets Content-Type + Content-Length.
  return apiClient
    .post<OptOutOfThreadResponseDto>(`${M}/thread/${rootId}/opt-out`, {})
    .then((r) => r.data);
}

// ── Compose ─────────────────────────────────────────────────────────────────

export function sendMessage(body: CreateMessageRequestDto) {
  return apiClient.post<CreateMessageResponseDto>(M, body).then((r) => r.data);
}

// ── Bulk actions + move to folder ───────────────────────────────────────────

export function bulkAction(body: MessageBulkActionRequestDto) {
  return apiClient
    .post<MessageBulkActionResponseDto>(`${M}/actions`, body)
    .then((r) => r.data);
}

export function moveToFolder(body: MoveMessagesToFolderRequestDto) {
  return apiClient
    .post<MessageBulkActionResponseDto>(`${M}/move-to-folder`, body)
    .then((r) => r.data);
}
