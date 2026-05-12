# Backend Bug Report — My Space › Messages

**Date:** 2026-05-12
**Reported by:** Frontend Team (Mobile)
**Scope:** `/api/v1/messages/*` — the My Space "Messages" feature on the mobile app
**Source of triage:** Live calls with a real user token (`userId: 121342`) against `https://api2.indiaforums.com/api/v1`. Originally captured in [backend-issues-2026-04-07.md](backend-issues-2026-04-07.md) (Class F). This doc extracts and re-prioritises the Messages-only items.

---

## Summary

| Severity | Count | Endpoints |
|---|---|---|
| 🔴 Critical (feature broken) | 4 | Inbox 500, Unread 500, Send POST 500, Overview 400 |
| 🟡 Unclear (undocumented behaviour) | 1 | `GET /messages/{id}` 404 |
| ⚠️ Cosmetic (works, but wrong response) | 3 | Affected-count `-1` on actions + move-to-folder; opt-out requires body |

**Net user impact:** Inbox + Unread tabs crash, sending any message (new / reply / draft) crashes, and the unread-count badge on the My Space dashboard never loads. Outbox, Read, Drafts, folder management, and thread viewing all work.

---

## Endpoint matrix

| Endpoint | Method | Status | Verdict | Notes |
|---|---|---|---|---|
| `/messages/overview` | GET | **400** | 🔴 Bug | `"Invalid Operation"` — handler rejects empty params; spec says no params required. |
| `/messages/folders` | GET | 200 | ✅ Works | Returns `{ folders: [...], userId }` |
| `/messages/folders` | POST | 200 | ✅ Works | `{folderId:0, folderName:"X"}` → creates folder |
| `/messages/folders/{id}` | DELETE | 200 | ✅ Works | |
| `/messages?mode=Inbox` | GET | **500** | 🔴 Bug | Class A envelope. Inbox tab unusable. |
| `/messages?mode=Unread` | GET | **500** | 🔴 Bug | Class A envelope. Unread tab unusable. |
| `/messages?mode=Outbox` | GET | 200 | ✅ Works | |
| `/messages?mode=Read` | GET | 200 | ✅ Works | |
| `/messages` | POST | **500** | 🔴 Bug | All three `postType` values (`New`, `Reply`, `Draft`) return Class A 500. **Sending / replying / saving drafts is completely broken.** |
| `/messages/drafts` | GET | 200 | ✅ Works | Paginated drafts list |
| `/messages/new?mode=PM[&did=…&tunm=…]` | GET | 200 | ✅ Works | Returns compose-form init |
| `/messages/thread/{id}` | GET | 200 | ✅ Works | Thread + messages |
| `/messages/thread/{id}/opt-out` | POST | 200 ⚠️ | ✅ Works (caveat) | Requires a request body — sending nothing returns IIS 411 "Length Required". Mobile now sends `{}`. |
| `/messages/{id}` | GET | **404** | 🟡 Unclear | Returned 404 for both `pmId` and `pmlId` of a known message. ID space accepted by this route is undocumented. |
| `/messages/actions` | POST | 200 ⚠️ | ✅ Works (cosmetic) | Always returns `affectedCount: -1` with text `"-1 message(s) marked as read."`. |
| `/messages/move-to-folder` | POST | 200 ⚠️ | ✅ Works (cosmetic) | Same `-1` count issue. |

---

## 🔴 Critical bugs

### F-1: `GET /messages?mode=Inbox` and `mode=Unread` return 500

The same controller returns 200 for `mode=Read` and `mode=Outbox` but 500 for `mode=Inbox` and `mode=Unread`. Suggests the per-mode query branch is bad — probably a NULL / JOIN difference in the SELECT for the unread / inbox path where the read-state row hasn't been created yet.

**Repro:**

```bash
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/messages?mode=Inbox&pageNumber=1&pageSize=24"
# HTTP/1.1 500 — Class A envelope

# Same call with mode=Read or mode=Outbox returns 200 with real data.
```

**Response body (both modes):**

```json
{
  "type": "...rfc7231#section-6.6.1",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again later."
}
```

**Frontend wiring:** [messagesApi.ts:61](../mobile/src/features/messages/services/messagesApi.ts#L61) → `getMessages({ mode, … })`. Used by every tab in [MessagesInboxScreen.tsx](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx) except Outbox / Read / Drafts.

**Action:** check server logs for the actual stack trace; suspected bad SQL on the unread-row join.

---

### F-2: `POST /messages` returns 500 for every `postType`

Sending a new PM, replying inside a thread, and saving as draft all return Class A 500. Tried with and without `userGroupList`, with and without `parentId`/`rootMessageId`. Send is **completely broken** for the mobile client (and presumably the web prototype too).

**Repro:**

```bash
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"probe","message":"hello","userList":"vijay","userGroupList":null,"bcc":false,"parentId":null,"rootMessageId":0,"emailNotify":false,"draftId":null,"postType":"New"}' \
  "https://api2.indiaforums.com/api/v1/messages"
# HTTP/1.1 500 — Class A envelope
```

**Frontend wiring:** [messagesApi.ts:107](../mobile/src/features/messages/services/messagesApi.ts#L107) → `sendMessage(body)`. Called from the inline composer in [MessageThreadScreen.tsx:152](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L152) and the compose / save-draft flow in [MessageComposeScreen.tsx:120](../mobile/src/features/messages/screens/MessageComposeScreen.tsx#L120).

**Action:** check server logs. All three `postType` branches (`New`, `Reply`, `Draft`) fail identically — strongly suggests the failure is before the postType switch (validator, persistence layer, or message-DTO mapping).

---

### F-3: `GET /messages/overview` returns 400 "Invalid Operation"

OpenAPI spec says this endpoint takes no params. Authenticated GET still returns 400 with the generic `Invalid Operation` envelope. The same user can hit `/folders`, `/thread/{id}`, `/new`, etc. fine — so the bug is specific to the overview handler.

**Repro:**

```bash
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/messages/overview"
# HTTP/1.1 400 — "The requested operation could not be completed."
```

**Frontend wiring:** [messagesApi.ts:27](../mobile/src/features/messages/services/messagesApi.ts#L27) → `getOverview()`. Used by `useMessagesOverview` ([useMessages.ts:42](../mobile/src/features/messages/hooks/useMessages.ts#L42)) to badge the Messages row on the My Space dashboard with the unread count.

**Action:** check whether the handler is registered in DI (this is the same failure mode as Class B in the parent doc). If it expects implicit params, please document them in the OpenAPI spec.

---

## 🟡 Unclear

### F-4: `GET /messages/{id}` returns 404 for both `pmId` and `pmlId`

Tested with both `pmId` (`26199342`) and `pmlId` (`62271385`) of a real message returned from `/messages/thread/{id}` — both return `404 "Message with ID … not found."`.

**Not blocking mobile** (no screen calls this endpoint yet — the wrapper exists at [messagesApi.ts:93](../mobile/src/features/messages/services/messagesApi.ts#L93) for future use), but the route either has a bug or expects a third ID space we haven't found documented.

**Action:** confirm which ID this route accepts and document it in the OpenAPI spec, or fix the lookup.

---

## ⚠️ Cosmetic — works, but response is wrong

### F-5: `affectedCount: -1` on `/messages/actions` and `/messages/move-to-folder`

Both endpoints return:

```json
{
  "isSuccess": true,
  "affectedCount": -1,
  "message": "-1 message(s) marked as read."
}
```

Looks like a SQL `@@ROWCOUNT` is being returned without checking for the "no count" sentinel (`SET NOCOUNT ON` was probably set somewhere in the proc). The action still succeeds — the row is actually marked read / moved — but the count and the user-facing message string are wrong.

The mobile UI ignores the count and never surfaces this `message` field, so users don't see it. But the BE message would be confusing if any other client showed it, and the count makes server logs misleading.

**Frontend wiring:** [messagesApi.ts:113](../mobile/src/features/messages/services/messagesApi.ts#L113) (`bulkAction`), [messagesApi.ts:119](../mobile/src/features/messages/services/messagesApi.ts#L119) (`moveToFolder`).

**Action:** capture the real affected row count, and templatise the success message with the correct number.

---

### F-6: `POST /messages/thread/{id}/opt-out` requires a request body

Sending no body returns IIS 411 "Length Required" — IIS/Cloudflare reject POSTs without a `Content-Length` header. Mobile client now sends `{}` to satisfy this, see [messagesApi.ts:97-103](../mobile/src/features/messages/services/messagesApi.ts#L97-L103):

```ts
// IIS/Cloudflare rejects POSTs without a body as 411 "Length Required" —
// pass an empty object so axios sets Content-Type + Content-Length.
return apiClient
  .post<OptOutOfThreadResponseDto>(`${M}/thread/${rootId}/opt-out`, {})
  .then((r) => r.data);
```

**Action:** the endpoint takes no parameters by design — please accept an empty body (or no body) without 411-ing. Either set the controller to ignore the request body, or configure IIS to not require `Content-Length` on this route.

---

## What unblocks when each is fixed

Frontend is already wired to all of these endpoints — no client changes needed.

| Fix | Feature unblocked in mobile |
|---|---|
| F-1 (Inbox / Unread 500) | Inbox tab, Unread tab |
| F-2 (POST 500) | Send new message, Reply (inline composer), Save as Draft, Continue Draft |
| F-3 (Overview 400) | Unread badge on the My Space › Messages row |
| F-4 (`/messages/{id}` 404) | Nothing today; unblocks future direct-message-detail flows |
| F-5 (`-1` count) | Cleaner logs; nothing user-visible |
| F-6 (opt-out 411) | Removes a hard-to-debug client workaround |

---

## Test user / token

- User: `121342`
- API key header: `api-key: Api2IndiaForums@2026`
- Bearer token: ask the mobile team for a fresh one when re-running these curls.

---

## See also

- [backend-issues-2026-04-07.md](backend-issues-2026-04-07.md) — full backend triage across all features. Messages issues are Class F there.
- [frontend-issues-mobile-2026-05-12.md](frontend-issues-mobile-2026-05-12.md) — companion doc covering mobile-side tech debt.
- [superpowers/specs/2026-05-11-mobile-messages-design.md](superpowers/specs/2026-05-11-mobile-messages-design.md) — design spec for the Messages feature on mobile.
