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
  MessageDraftsResponseDto,
  MessageListResponseDto,
  MessageOverviewResponseDto,
  MessageThreadResponseDto,
  MoveMessagesToFolderRequestDto,
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

export function optOutOfThread(rootId: Id) {
  return apiClient
    .post<OptOutOfThreadResponseDto>(`${M}/thread/${rootId}/opt-out`)
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
