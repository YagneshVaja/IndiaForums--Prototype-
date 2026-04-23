import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getDrafts,
  getFolders,
  getMessageThread,
  getMessages,
  getOverview,
  moveToFolder,
  sendMessage,
  createOrUpdateFolder,
  deleteFolder,
} from '../services/messagesApi';
import type {
  BulkAction,
  CreateMessageRequestDto,
  CreateOrUpdateFolderRequestDto,
  MessageDraftsResponseDto,
  MessageListResponseDto,
  MessageMode,
} from '../types';
import { bulkAction } from '../services/messagesApi';

export type MessagesListResult =
  | { kind: 'messages'; data: MessageListResponseDto }
  | { kind: 'drafts'; data: MessageDraftsResponseDto };

export function useFolders() {
  return useQuery({
    queryKey: ['messages', 'folders'],
    queryFn: getFolders,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * PM overview — used by the dashboard to badge the Messages row with the
 * unread count. Low cardinality, refreshed every 2 minutes.
 */
export function useMessagesOverview(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'overview'],
    queryFn: getOverview,
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

interface ListArgs {
  mode: MessageMode | 'Drafts';
  page: number;
  pageSize?: number;
  filter?: string;
  folderId?: number;
}

export function useMessagesList({ mode, page, pageSize = 24, filter, folderId }: ListArgs) {
  return useQuery<MessagesListResult>({
    queryKey: ['messages', 'list', mode, page, pageSize, filter || '', folderId ?? null],
    queryFn: async () => {
      if (mode === 'Drafts') {
        const data = await getDrafts({ pageNumber: page, pageSize });
        return { kind: 'drafts', data };
      }
      const data = await getMessages({ mode, pageNumber: page, pageSize, filter, folderId });
      return { kind: 'messages', data };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useMessageThread(rootId: number | string | null) {
  return useQuery({
    queryKey: ['messages', 'thread', rootId],
    queryFn: () => getMessageThread(rootId!),
    enabled: !!rootId,
    staleTime: 15_000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMessageRequestDto) => sendMessage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useCreateOrUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrUpdateFolderRequestDto) => createOrUpdateFolder(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'folders'] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: number | string) => deleteFolder(folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'folders'] });
    },
  });
}

/**
 * Apply a bulk action (read/unread/star/unstar/delete) to a set of pmlIds.
 * Server expects a comma-separated string of ids.
 */
export function useBulkMessageAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { pmlIds: Array<string | number>; mode: BulkAction }) =>
      bulkAction({ pmlIds: args.pmlIds.join(','), mode: args.mode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMoveMessagesToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { pmlIds: Array<string | number>; folderId: number | string }) =>
      moveToFolder({ pmlIds: args.pmlIds.join(','), folderId: args.folderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
