# Mobile Messages — design refresh (2026-05-11)

The mobile `messages` feature has scaffolding (types, API wrappers, hooks, and four wired screens) from the big April batch commit (`5fdf580`). The types match the live OpenAPI spec accurately, but the UI follows a generic forum-card pattern and two endpoints aren't wrapped yet. This spec replaces the current UI with a chat-style thread + inline composer while preserving the forum-native power features (Outbox/Drafts/Folders/bulk actions).

API ground-truth: `https://api2.indiaforums.com/openapi/v1.json` (Scalar). Endpoints touched: `GET /messages/overview`, `GET /messages/folders`, `POST /messages/folders`, `DELETE /messages/folders/{id}`, `GET /messages`, `POST /messages`, `GET /messages/drafts`, `GET /messages/thread/{id}`, `POST /messages/thread/{id}/opt-out`, `POST /messages/actions`, `POST /messages/move-to-folder`, plus new wrappers for `GET /messages/new` and `GET /messages/{id}`.

## Approach

**Hybrid** — keep the inbox tab/folder/drafts structure (forum users rely on it) and redesign the thread surface to feel like WhatsApp/Instagram DM/Telegram. Inline composer in the thread eliminates the round-trip to Compose for replies. Compose remains as a separate screen only for new messages and continuing drafts.

## Surfaces

### Inbox (`MessagesInboxScreen`)

Row redesign — image-led, three-line:

```
┌────────────────────────────────────────────┐
│ ▏[ AV ]  Sender Name              2h ago   │
│         Subject of the conversation        │
│         📁 Personal   ⭐                    │
└────────────────────────────────────────────┘
```

- Avatar 48 (was 42). Sender name bold + slightly larger when unread.
- Left accent bar (3px primary) when unread — same signature pattern used on home cards (per memory).
- Subject single line, truncated.
- Bottom strip shows folder badge + star/like icon only when present.
- Drop the trailing pill-dot indicator.

Top chrome:

- Tab pill row unchanged (Inbox / Unread / Read / Sent / Drafts).
- Search bar always visible on tabs where it applies (everything except Drafts).
- Folder chip row visible only on Inbox/Unread/Read (folders don't apply to Outbox/Drafts).
- "Manage folders" link replaced by a folder icon in the TopNavBar's left/right slot to reclaim vertical space.

Selection mode, action bar, pagination, error/empty/loading — unchanged.

### Thread (`MessageThreadScreen`)

Replace the stacked-card layout with chat bubbles + inline composer.

- **Header:** TopNavBack title = subject. Subtitle = participant names joined ("you, Rahul, Priya"); tap subtitle to open a small participants sheet for big threads.
- **Bubble alignment:** `fromUserId === currentUserId` → right-aligned, primary-soft background, primary-text. Others → left-aligned, surface background.
- **Avatar grouping:** show avatar only on the first message of a consecutive run by the same sender (WhatsApp pattern). Subsequent messages in the same run get an indented bubble with no avatar.
- **Time:** small, beneath the bubble (`hh:mm` for today, `DD MMM hh:mm` otherwise).
- **Date dividers:** between messages crossing a day boundary, render a small centered chip: "Today" / "Yesterday" / "DD MMM YYYY".
- **Body rendering:** `stripHtml` v1 (existing helper). Rich rendering deferred.
- **Header menu:** ellipsis opens an action sheet — Opt out (existing), Mark unread (call bulk `unread` for `lastPmlId`), Refresh.
- **Inline composer:** sticky at the bottom; growable single-line input (max 6 lines) + send button. Submitting calls `sendMessage`:
  - `subject` = `Re: <root.subject>` (skip prefix if already starts with "Re:")
  - `message` = composer text
  - `userList` = participant userNames except current user, comma-joined
  - `bcc` = false
  - `parentId` = `messages[messages.length - 1].pmId`
  - `rootMessageId` = `root.rootId`
  - `emailNotify` = false
  - `draftId` = null
  - `postType` = `"Reply"`
- **Optimistic update:** on submit, append a temporary message to the React Query cache for `['messages','thread', rootId]`, clear the composer; on success invalidate, on error roll back and surface an inline error toast.
- **Scroll behaviour:** auto-scroll to the latest message on first load and after sending; preserve position on background refetch.
- **KeyboardAvoidingView:** wrap on iOS with `behavior="padding"`.

### Compose (`MessageComposeScreen`)

Compose loses the reply path; it is entered only for:

1. New message (from Inbox compose icon, optionally with `recipientId`).
2. Continue draft (from a Drafts row, with `draftId`).

Changes:

- On mount with `draftId`, call `GET /messages/new?did={draftId}` and hydrate `subject`, `body`, and `to` from `NewMessageFormDto.draft`.
- On mount with `recipientId` only, call `GET /messages/new?mode=PM&tunm={recipientId}` to pull `pmUserTagLimit` and basic context (we don't surface limit UI yet but the call validates the recipient exists).
- Add a secondary action "Save as draft" next to Send. Calls `sendMessage` with `postType: 'Draft'` (and `draftId` if continuing one), then `navigation.goBack()`. If the server rejects `'Draft'` as a `postType` value at runtime (the OpenAPI spec types `postType` as a free-form string and doesn't enumerate values), fall back to the prototype's value — verify against the web prototype's request payload during implementation and adjust.
- Existing fields (To/Subject/Body, BCC, Email-notify) unchanged.
- Existing error/success banners unchanged.

Param-passing cleanup:

- `MySpaceStackParamList.Compose` is currently typed `{ recipientId?: string }` but the codebase passes extras (`mode`, `parentId`, `rootMessageId`, `prefillSubject`, `prefillTo`) via `as never`. Now that Reply moves inline, the only extras Compose still needs are `draftId` and `recipientId`. Update the param type to `{ recipientId?: string; draftId?: string }` and remove the casts.

### Folders (`MessageFoldersScreen`)

No design changes — current screen is correct and aligns with the API. Verified against `GET/POST/DELETE /messages/folders`.

## API + types additions

`mobile/src/features/messages/types.ts` — add:

```ts
// Defined permissively (number | string for ids, allow nulls) like the other
// PM DTOs in this file. Only fields the mobile UI reads are listed; widen later
// if the screens need more.
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

// Slim — we only need it for unread peers in thread context; expand when used.
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
```

`mobile/src/features/messages/services/messagesApi.ts` — add:

```ts
interface NewParams {
  mode?: string;
  id?: number | string;     // pmId for replies
  did?: number | string;    // draftId for hydration
  tuid?: number | string;   // target userId
  tunm?: string;            // target username
  prtid?: number | string;  // parentId
}

export function getNewMessageForm(params: NewParams) {
  return apiClient.get<NewMessageFormDto>(`${M}/new`, { params }).then((r) => r.data);
}

export function getMessageDetail(id: Id) {
  return apiClient.get<MessageDetailResponseDto>(`${M}/${id}`).then((r) => r.data);
}
```

`mobile/src/features/messages/hooks/useMessages.ts` — add:

```ts
export function useNewMessageForm(params: NewParams, enabled = true) {
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
```

## New components

- `mobile/src/features/messages/components/MessageBubble.tsx` — props `{ message, isMine, showAvatar, styles, colors }`. Renders avatar (when `showAvatar`), bubble with body, time below.
- `mobile/src/features/messages/components/ThreadDateDivider.tsx` — props `{ label }`. Small centered chip.
- `mobile/src/features/messages/components/ThreadComposer.tsx` — props `{ value, onChange, onSend, isPending, disabled }`. Sticky bottom input + send button.

## Identity — who am I?

Bubble alignment needs `currentUserId`. The auth store already holds this:

- Source: `useAuthStore((s) => s.user?.userId)` — confirm field name when implementing.
- Compare to `MessageThreadItemDto.fromUserId` after coercing both to `Number`.

## Edge cases

- Empty thread (server returned 0 messages) — show existing EmptyState, hide composer.
- Send failure — keep composer text, surface inline error toast above the composer (3s autohide), do not navigate away.
- Send returns `isSuccess: false` (validation, e.g. blocked user) — show the server message in the same toast.
- Long composer input — cap at 5000 chars to match server limits (mirror the existing forum post composer).
- Day-boundary divider when first message of a page crosses midnight — render at the top.
- Draft hydration failure — keep Compose usable with empty fields; surface a small banner "Couldn't load draft."

## Out of scope

- Rich HTML/BBCode rendering in bubbles (stays as `stripHtml`).
- Reactions UI on `reactedEmojis` (data is present but UI deferred).
- Push notifications for new PMs (already covered by `notificationRouter.ts`).
- Recipient autocomplete / user search in Compose (no API surfaced).
- Bulk-select inside the thread.
- Realtime updates / websockets (poll-on-focus is sufficient; React Query handles this).

## Files touched

| File | Change |
|---|---|
| `mobile/src/features/messages/types.ts` | Add NewMessageFormDto, MessageDetailResponseDto + child DTOs |
| `mobile/src/features/messages/services/messagesApi.ts` | Add `getNewMessageForm`, `getMessageDetail` |
| `mobile/src/features/messages/hooks/useMessages.ts` | Add `useNewMessageForm`, `useMessageDetail` |
| `mobile/src/features/messages/screens/MessagesInboxScreen.tsx` | Row redesign, toolbar trim, folder icon to header |
| `mobile/src/features/messages/screens/MessageThreadScreen.tsx` | Bubble layout + date dividers + inline composer |
| `mobile/src/features/messages/screens/MessageComposeScreen.tsx` | Drop reply mode, draft hydration, save-as-draft |
| `mobile/src/features/messages/components/MessageBubble.tsx` | New |
| `mobile/src/features/messages/components/ThreadDateDivider.tsx` | New |
| `mobile/src/features/messages/components/ThreadComposer.tsx` | New |
| `mobile/src/navigation/types.ts` | Compose params: add `draftId`, drop unused extras |
| `docs/tracking/mobile-development-progress.md` | Bump Messages from 0/4 to 4/4 |
| `docs/tracking/screen-checklist.json` | Same |

## Verification

- `cd mobile && npm run tsc` — must pass before declaring done (mobile CLAUDE.md gate).
- `cd mobile && npm run lint` — must pass.
- Manual: open the Messages tab, switch tabs, search, open a thread, send a reply, save a draft, continue a draft, manage folders. Toggle dark mode mid-flow.
