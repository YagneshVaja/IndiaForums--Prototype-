import api, { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './api';

// ── Private Messages API ─────────────────────────────────────────────────────

export const MESSAGE_MODES = {
  INBOX:  'Inbox',
  OUTBOX: 'Outbox',
  READ:   'Read',
  UNREAD: 'Unread',
};

export const BULK_ACTIONS = {
  READ:    'read',
  UNREAD:  'unread',
  DELETE:  'delete',
  STAR:    'star',
  UNSTAR:  'unstar',
};

const MESSAGES = '/messages';

/* ── Folders ─────────────────────────────────────────────────────────────── */

export function getFolders() {
  return api.get(`${MESSAGES}/folders`);
}

/**
 * Create a new folder (folderId=0) or rename an existing one (folderId>0).
 */
export function createOrUpdateFolder({ folderId = 0, folderName }: {
  folderId?: number | string;
  folderName: string;
}) {
  return api.post(`${MESSAGES}/folders`, { folderId, folderName });
}

export function deleteFolder(folderId: number | string) {
  return api.delete(`${MESSAGES}/folders/${folderId}`);
}

/* ── Message list ────────────────────────────────────────────────────────── */

/**
 * Fetch a paginated message list for the given mode.
 */
export function getMessages({
  mode = MESSAGE_MODES.INBOX,
  pn = DEFAULT_PAGE,
  ps = DEFAULT_PAGE_SIZE,
  filter,
  searchUserId,
  priority,
  folderId,
  cursor,
}: {
  mode?: string;
  pn?: number;
  ps?: number;
  filter?: string;
  searchUserId?: number;
  priority?: number;
  folderId?: number;
  cursor?: number;
} = {}) {
  const params: any = { mode, pn, ps };
  if (filter !== undefined && filter !== '') params.filter = filter;
  if (searchUserId !== undefined && searchUserId !== null) params.searchUserId = searchUserId;
  if (priority !== undefined && priority !== null) params.priority = priority;
  if (folderId !== undefined && folderId !== null) params.folderId = folderId;
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  return api.get(MESSAGES, { params });
}

/* ── Message detail / thread / drafts / new form ─────────────────────────── */

export function getMessageThread(rootId: number | string, { pn = DEFAULT_PAGE, ps = DEFAULT_PAGE_SIZE, cursor, fetchBackward }: {
  pn?: number;
  ps?: number;
  cursor?: number;
  fetchBackward?: boolean;
} = {}) {
  const params: any = { pn, ps };
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  if (fetchBackward !== undefined) params.fetchBackward = fetchBackward;
  return api.get(`${MESSAGES}/thread/${rootId}`, { params });
}

export function getMessageDetail(pmlId: number | string, { mode }: { mode?: string } = {}) {
  return api.get(`${MESSAGES}/${pmlId}`, mode ? { params: { mode } } : undefined);
}

export function getDrafts({ pn = DEFAULT_PAGE, ps = DEFAULT_PAGE_SIZE, cursor, fetchBackward }: {
  pn?: number;
  ps?: number;
  cursor?: number;
  fetchBackward?: boolean;
} = {}) {
  const params: any = { pn, ps };
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  if (fetchBackward !== undefined) params.fetchBackward = fetchBackward;
  return api.get(`${MESSAGES}/drafts`, { params });
}

/**
 * Get the new-message form initialization payload.
 */
export function getNewMessageForm(args: Record<string, any> = {}) {
  const params: any = {};
  for (const k of ['mode', 'pmId', 'parentId', 'draftId', 'toUserId', 'toUsername']) {
    if (args[k] !== undefined && args[k] !== null && args[k] !== '') params[k] = args[k];
  }
  return api.get(`${MESSAGES}/new`, { params });
}

/* ── Send / mutate ───────────────────────────────────────────────────────── */

/**
 * Send a new private message.
 */
export function sendMessage({
  subject,
  message,
  userList,
  userGroupList,
  bcc = false,
  parentId,
  rootMessageId = 0,
  emailNotify = false,
  draftId,
  postType = 'Default',
}: {
  subject: string;
  message: string;
  userList?: string;
  userGroupList?: string;
  bcc?: boolean;
  parentId?: number;
  rootMessageId?: number;
  emailNotify?: boolean;
  draftId?: number;
  postType?: string;
}) {
  const body: any = {
    subject,
    message,
    userList: userList || null,
    userGroupList: userGroupList || null,
    bcc,
    rootMessageId,
    emailNotify,
    postType,
  };
  if (parentId !== undefined && parentId !== null) body.parentId = parentId;
  if (draftId !== undefined && draftId !== null) body.draftId = draftId;
  return api.post(MESSAGES, body);
}

/**
 * Bulk action on messages.
 */
export function bulkAction(pmlIds: number[] | string, mode: string) {
  const ids = Array.isArray(pmlIds) ? pmlIds.join(',') : String(pmlIds);
  return api.post(`${MESSAGES}/actions`, { pmlIds: ids, mode });
}

/**
 * Move messages into a folder. Pass folderId=0 to remove from any folder.
 */
export function moveToFolder(pmlIds: number[] | string, folderId: number) {
  const ids = Array.isArray(pmlIds) ? pmlIds.join(',') : String(pmlIds);
  return api.post(`${MESSAGES}/move-to-folder`, { pmlIds: ids, folderId });
}
