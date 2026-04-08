import api, { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './api';

// ── Private Messages API ─────────────────────────────────────────────────────
// Routes (all authenticated):
//   GET    /messages/folders                — list folders                  → FolderListResponseDto
//   POST   /messages/folders                — create or update folder        → CreateOrUpdateFolderResponseDto
//   DELETE /messages/folders/{id}           — delete folder                  → DeleteFolderResponseDto
//   GET    /messages?mode=&pn=&ps=&...      — paginated list of messages     → MessageListResponseDto
//   POST   /messages                        — send a new private message     → CreateMessageResponseDto
//   GET    /messages/thread/{rootId}        — full conversation thread       → MessageThreadResponseDto
//   GET    /messages/{pmlId}                — single message detail          → MessageDetailResponseDto
//   GET    /messages/drafts                 — drafts list                    → MessageDraftsResponseDto
//   GET    /messages/new                    — form init for new/reply/draft  → NewMessageFormDto
//   POST   /messages/actions                — bulk read/unread/delete/star   → MessageBulkActionResponseDto
//   POST   /messages/move-to-folder         — move messages into a folder    → MessageBulkActionResponseDto
//
// Folder constraints (per spec): max 10 folders, folder name max 10 chars.
// To remove a message from any folder, move it to folderId=0.

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
 * @param {object} args
 * @param {number|string} [args.folderId=0]
 * @param {string} args.folderName  max 10 chars
 */
export function createOrUpdateFolder({ folderId = 0, folderName }) {
  return api.post(`${MESSAGES}/folders`, { folderId, folderName });
}

export function deleteFolder(folderId) {
  return api.delete(`${MESSAGES}/folders/${folderId}`);
}

/* ── Message list ────────────────────────────────────────────────────────── */

/**
 * Fetch a paginated message list for the given mode.
 * @param {object} args
 * @param {string} args.mode    one of MESSAGE_MODES.* (Inbox / Outbox / Read / Unread)
 * @param {number} [args.pn=1]
 * @param {number} [args.ps=24]
 * @param {string} [args.filter]        free-text search on subject/body/recipients
 * @param {number} [args.searchUserId]  filter by a specific other user
 * @param {number} [args.priority]      filter by priority (uint8)
 * @param {number} [args.folderId]      filter by folder
 * @param {number} [args.cursor]        cursor pagination (alternative to pn)
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
} = {}) {
  const params = { mode, pn, ps };
  if (filter !== undefined && filter !== '') params.filter = filter;
  if (searchUserId !== undefined && searchUserId !== null) params.searchUserId = searchUserId;
  if (priority !== undefined && priority !== null) params.priority = priority;
  if (folderId !== undefined && folderId !== null) params.folderId = folderId;
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  return api.get(MESSAGES, { params });
}

/* ── Message detail / thread / drafts / new form ─────────────────────────── */

export function getMessageThread(rootId, { pn = DEFAULT_PAGE, ps = DEFAULT_PAGE_SIZE, cursor, fetchBackward } = {}) {
  const params = { pn, ps };
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  if (fetchBackward !== undefined) params.fetchBackward = fetchBackward;
  return api.get(`${MESSAGES}/thread/${rootId}`, { params });
}

export function getMessageDetail(pmlId, { mode } = {}) {
  return api.get(`${MESSAGES}/${pmlId}`, mode ? { params: { mode } } : undefined);
}

export function getDrafts({ pn = DEFAULT_PAGE, ps = DEFAULT_PAGE_SIZE, cursor, fetchBackward } = {}) {
  const params = { pn, ps };
  if (cursor !== undefined && cursor !== null) params.cursor = cursor;
  if (fetchBackward !== undefined) params.fetchBackward = fetchBackward;
  return api.get(`${MESSAGES}/drafts`, { params });
}

/**
 * Get the new-message form initialization payload.
 * @param {object} [args]
 * @param {string} [args.mode]            'new' | 'reply' | 'forward' | 'draft'
 * @param {number} [args.pmId]            for reply / forward
 * @param {number} [args.parentId]        for reply
 * @param {number} [args.draftId]         when continuing a draft
 * @param {number} [args.toUserId]        when starting a new PM to a known user
 * @param {string} [args.toUsername]      when starting a new PM by username
 */
export function getNewMessageForm(args = {}) {
  const params = {};
  for (const k of ['mode', 'pmId', 'parentId', 'draftId', 'toUserId', 'toUsername']) {
    if (args[k] !== undefined && args[k] !== null && args[k] !== '') params[k] = args[k];
  }
  return api.get(`${MESSAGES}/new`, { params });
}

/* ── Send / mutate ───────────────────────────────────────────────────────── */

/**
 * Send a new private message.
 * @param {object} args
 * @param {string} args.subject
 * @param {string} args.message
 * @param {string} [args.userList]        comma-separated usernames or IDs
 * @param {string} [args.userGroupList]
 * @param {boolean} [args.bcc=false]
 * @param {number} [args.parentId]        when this is a reply
 * @param {number} [args.rootMessageId=0]
 * @param {boolean} [args.emailNotify=false]
 * @param {number} [args.draftId]
 * @param {string} [args.postType]        usually 'Default'
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
}) {
  const body = {
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
 * @param {string|number[]} pmlIds  array or comma-joined string of pmlIds
 * @param {string} mode             one of BULK_ACTIONS.*
 */
export function bulkAction(pmlIds, mode) {
  const ids = Array.isArray(pmlIds) ? pmlIds.join(',') : String(pmlIds);
  return api.post(`${MESSAGES}/actions`, { pmlIds: ids, mode });
}

/**
 * Move messages into a folder. Pass folderId=0 to remove from any folder.
 * @param {string|number[]} pmlIds
 * @param {number} folderId
 */
export function moveToFolder(pmlIds, folderId) {
  const ids = Array.isArray(pmlIds) ? pmlIds.join(',') : String(pmlIds);
  return api.post(`${MESSAGES}/move-to-folder`, { pmlIds: ids, folderId });
}
