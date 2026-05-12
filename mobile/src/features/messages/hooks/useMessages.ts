import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getDrafts,
  getFolders,
  getMessageDetail,
  getMessageThread,
  getMessages,
  getNewMessageForm,
  getOverview,
  moveToFolder,
  sendMessage,
  createOrUpdateFolder,
  deleteFolder,
} from '../services/messagesApi';
import type { NewMessageFormParams } from '../services/messagesApi';
import { useAuthStore } from '../../../store/authStore';
import type {
  BulkAction,
  CreateMessageRequestDto,
  CreateOrUpdateFolderRequestDto,
  MessageDraftsResponseDto,
  MessageListResponseDto,
  MessageMode,
  MessageThreadItemDto,
  MessageThreadResponseDto,
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
    queryKey: ['messages', 'thread', rootId == null ? null : String(rootId)],
    queryFn: () => getMessageThread(rootId!),
    enabled: !!rootId,
    staleTime: 15_000,
  });
}

export function useNewMessageForm(params: NewMessageFormParams, enabled = true) {
  return useQuery({
    queryKey: ['messages', 'new', params],
    queryFn: () => getNewMessageForm(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useMessageDetail(id: number | string | null) {
  return useQuery({
    queryKey: ['messages', 'detail', id],
    queryFn: () => getMessageDetail(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ── Send ────────────────────────────────────────────────────────────────────
// Replies optimistically append a temp bubble into the open thread cache.
// On error we roll back; on success we invalidate so the real pmId replaces
// the temp one. New/Draft posts don't touch the thread cache.

function buildTempReply(body: CreateMessageRequestDto): MessageThreadItemDto {
  const user = useAuthStore.getState().user;
  return {
    pmId: `temp-${Date.now()}`,
    fromUserId: user?.userId ?? 0,
    subject: body.subject,
    message: body.message,
    messageDate: new Date().toISOString(),
    parentId: body.parentId ?? null,
    toIds: null,
    hide: false,
    likeJsonData: null,
    likeCount: 0,
    reactedEmojis: [],
    userName: user?.userName ?? '',
    displayName: user?.displayName ?? user?.userName ?? '',
    groupId: 0,
    groupName: '',
    userLevel: 0,
    avatarType: null,
    avatarAccent: null,
    updateChecksum: null,
    lastVisitedDate: null,
    privacy: 0,
    showCountry: 0,
    countryCode: null,
    statusCode: 0,
    visitStreakCount: 0,
    signatureJson: null,
    forumSignatureText: null,
    badgeJson: null,
  };
}

interface SendMutationContext {
  threadKey: readonly [string, string, string] | null;
  prevThread: MessageThreadResponseDto | undefined;
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof sendMessage>>,
    Error,
    CreateMessageRequestDto,
    SendMutationContext
  >({
    mutationFn: (body) => sendMessage(body),
    onMutate: async (body) => {
      if (body.postType !== 'Reply' || !body.rootMessageId) {
        return { threadKey: null, prevThread: undefined };
      }
      const threadKey = ['messages', 'thread', String(body.rootMessageId)] as const;
      await qc.cancelQueries({ queryKey: threadKey });
      const prevThread = qc.getQueryData<MessageThreadResponseDto>(threadKey);
      if (prevThread) {
        const temp = buildTempReply(body);
        qc.setQueryData<MessageThreadResponseDto>(threadKey, {
          ...prevThread,
          messages: [...prevThread.messages, temp],
          totalCount: Number(prevThread.totalCount || 0) + 1,
        });
      }
      return { threadKey, prevThread };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.threadKey && ctx.prevThread !== undefined) {
        qc.setQueryData(ctx.threadKey, ctx.prevThread);
      }
    },
    onSettled: (_data, _err, body) => {
      // Narrow invalidations: only the affected slices.
      if (body.postType === 'Reply' && body.rootMessageId) {
        qc.invalidateQueries({
          queryKey: ['messages', 'thread', String(body.rootMessageId)],
        });
      }
      qc.invalidateQueries({ queryKey: ['messages', 'list'] });
      qc.invalidateQueries({ queryKey: ['messages', 'overview'] });
      if (body.postType === 'Draft' || body.draftId) {
        qc.invalidateQueries({ queryKey: ['messages', 'list', 'Drafts'] });
      }
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

// ── Bulk actions ────────────────────────────────────────────────────────────
// Optimistically reflect read/unread/star/unstar/delete across every cached
// inbox list before the server responds; roll back on failure.

interface BulkMutationContext {
  snapshots: Array<[readonly unknown[], MessagesListResult | undefined]>;
}

export function useBulkMessageAction() {
  const qc = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof bulkAction>>,
    Error,
    { pmlIds: Array<string | number>; mode: BulkAction },
    BulkMutationContext
  >({
    mutationFn: (args) => bulkAction({ pmlIds: args.pmlIds.join(','), mode: args.mode }),
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ['messages', 'list'] });
      const ids = new Set(args.pmlIds.map(String));
      const snapshots = qc.getQueriesData<MessagesListResult>({
        queryKey: ['messages', 'list'],
      });
      qc.setQueriesData<MessagesListResult>(
        { queryKey: ['messages', 'list'] },
        (prev) => {
          if (!prev || prev.kind !== 'messages') return prev;
          const data = prev.data;
          let messages = data.messages;
          if (args.mode === 'delete') {
            messages = messages.filter((m) => !ids.has(String(m.pmlId)));
          } else if (args.mode === 'read' || args.mode === 'unread') {
            const readPost = args.mode === 'read';
            messages = messages.map((m) =>
              ids.has(String(m.pmlId)) ? { ...m, readPost } : m,
            );
          } else if (args.mode === 'star' || args.mode === 'unstar') {
            const likeType = args.mode === 'star' ? 1 : 0;
            messages = messages.map((m) =>
              ids.has(String(m.pmlId)) ? { ...m, likeType } : m,
            );
          }
          return { kind: 'messages', data: { ...data, messages } };
        },
      );
      return { snapshots };
    },
    onError: (_err, _args, ctx) => {
      ctx?.snapshots.forEach(([key, val]) => qc.setQueryData(key, val));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'list'] });
      qc.invalidateQueries({ queryKey: ['messages', 'overview'] });
    },
  });
}

export function useMoveMessagesToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { pmlIds: Array<string | number>; folderId: number | string }) =>
      moveToFolder({ pmlIds: args.pmlIds.join(','), folderId: args.folderId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', 'list'] });
      qc.invalidateQueries({ queryKey: ['messages', 'folders'] });
    },
  });
}
