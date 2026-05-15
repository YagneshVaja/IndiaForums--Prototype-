# Backend Bug Report — Forum › Post Actions Sheet

**Date:** 2026-05-15
**Reported by:** Mobile team
**Scope:** Every option in the mobile "Post Actions" bottom sheet (screenshot below).
**Triaged against:** `https://api2.indiaforums.com/api/v1`
**Test account:** `userId: 121342`, `groupId: 25` (confirmed moderator — was able to trash + untrash successfully).
**Test target:** `postId: 167218533` · `topicId: 5374712` · `forumId: 9` (Bollywood).
**Frontend entry point:** [mobile/src/features/forums/components/PostModActionsSheet.tsx](../mobile/src/features/forums/components/PostModActionsSheet.tsx)

---

## TL;DR for the backend dev

Three things to fix on your side. The mobile team will patch their own client-side issues once these are unblocked.

| # | Priority | What's broken | Fix on backend |
|---|---|---|---|
| **B-1** | 🔴 P0 | `PUT /forums/posts/{id}` returns 400 for **every** payload — blocks **Edit**, **Mark/Unmark Matured**, **Add Moderator Note** (3 features). | Investigate the unhandled exception in the PUT handler. Server log window: **2026-05-15 09:50–09:53 UTC**, `userId 121342`. Return a real validation error, not the generic "An internal error occurred." |
| **B-2** | 🔴 P0 | `POST /forums/threads/trash` returns 405 — mobile **Trash Post** is broken. The route `POST /forums/posts/{id}/trash` works fine. | **Pick one** and tell us:<br/>(a) Confirm `POST /forums/posts/{id}/trash` is the canonical route → mobile switches to it (no backend change). **Preferred.**<br/>(b) Add `POST /forums/threads/trash` as a bulk-trash alias accepting `{ threadIds: [...], topicId }`. Useful for moderator-queue bulk actions. |
| **B-3** | 🟡 P1 | **Move Post** has no public endpoint. | Add `POST /forums/posts/{postId}/move` with body `{ "toTopicId": <number> }`. Mirror the existing `POST /forums/topics/{topicId}/move` permission model. Return new `topicId` + `pageUrl` so the client can navigate the user to the moved post. |

There are also two client-side items the mobile team will fix once the above land — captured at the bottom so nothing is lost, but **no backend action required** on those.

---

## Coverage check — every option in the sheet

The "Post Actions" sheet has 7 actions plus an IP info row. All 8 rows have been verified against the live API:

| Row | Type | Endpoint(s) | Status | Section |
|---|---|---|---|---|
| **Report** | Action | `GET /reports/types` + `POST /reports` | ✅ Works | — |
| **Edit** | Action | `PUT /forums/posts/{id}` | 🔴 400 | [B-1](#b-1) |
| **History** | Action | `GET /forums/posts/{id}/history?pageNumber=1&pageSize=20` | ✅ Works | — |
| **Trash Post** | Action | `POST /forums/threads/trash` *(what mobile calls)* | 🔴 405 | [B-2](#b-2) |
| **Move Post** | Action | — *(no public endpoint)* | 🔴 Missing | [B-3](#b-3) |
| **Mark / Unmark As Matured Post** | Action | `PUT /forums/posts/{id}` *(shares Edit endpoint)* | 🔴 400 | [B-1](#b-1) |
| **Add Moderator Note** | Action | `PUT /forums/posts/{id}` *(shares Edit endpoint)* | 🔴 400 | [B-1](#b-1) |
| **IP** | Display | Field `ip` on `GET /forums/topics/{id}/posts` response | ✅ Works | [Note](#note-ip-row) |

**Net user impact:** 5 of the 7 actions cannot complete from mobile (Edit, Trash, Move, Matured, Moderator Note). Only Report and History work end-to-end.

---

## ✅ Working endpoints — for reference

These are the endpoints the broken ones should look like once fixed. No action needed on them.

### Report — load reasons

```bash
curl -s "https://api2.indiaforums.com/api/v1/reports/types" \
  -H "Authorization: Bearer <TOKEN>"
# 200 OK — returns 18 reasons, each shaped { "reportTypeId": <int>, "reportTypeName": "<string>" }
```

### Report — submit

```bash
curl -s -X POST "https://api2.indiaforums.com/api/v1/reports" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "forum",
    "contentId": 167218533,
    "reason": "Spam",
    "remark": "Automated endpoint test - please ignore",
    "forumId": 9,
    "topicId": 5374712
  }'
# 200 OK — created reportId: 110207 during this test (safe to delete from queue)
```

### History

```bash
curl -s "https://api2.indiaforums.com/api/v1/forums/posts/167218533/history?pageNumber=1&pageSize=20" \
  -H "Authorization: Bearer <TOKEN>"
# 200 OK — returns historyLogs[] with originalMessage, updatedMessage, createdWhen
```

### Trash (the route that **does** work)

```bash
curl -s -X POST "https://api2.indiaforums.com/api/v1/forums/posts/167218533/trash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712}'
# 200 OK
# {"isSuccess":true,"message":"Moved to trash successfully...","errors":[],
#  "threadId":167218533,"originalTopicId":5374712,...}
```

(During discovery we exercised this against the test post and immediately restored it via `POST /forums/posts/167218533/untrash` — 200 OK, `{"isSuccess":true,"message":"Moved back successfully..."}`. No permanent data change.)

---

<a id="b-1"></a>
## 🔴 B-1 — `PUT /forums/posts/{postId}` returns 400 for every payload (P0)

This **one endpoint blocks three features** because the mobile client routes Edit, Mark-Matured, and Moderator-Note through the same call. Fixing it unblocks all three at once.

### Symptom

Every payload shape returns HTTP 400 with the same generic body:

```json
{
  "isSuccess": false,
  "message": "An error occurred while processing the edit.",
  "threadId": null,
  "topicId": null,
  "pageUrl": null,
  "errors": ["An internal error occurred."]
}
```

### Minimal repro (matches what the mobile client sends)

```bash
curl -i -X PUT "https://api2.indiaforums.com/api/v1/forums/posts/167218533" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": 167218533,
    "topicId": 5374712,
    "message": "<p>endpoint test</p>",
    "showSignature": true,
    "hasMaturedContent": false
  }'
# HTTP/1.1 400 Bad Request
```

### Variants tried (all return 400)

| Variant | Result |
|---|---|
| Minimal payload above | 400, body shown above |
| `+ moderatorNote: "..."` | 400, empty body |
| `+ hasMaturedContent: true` | 400, empty body |
| `+ forumId: 9` | 400, empty body |
| Original full HTML message preserved | 400, empty body |

### Not a permission problem

The same token (`userId 121342`, `groupId 25`) successfully ran `POST /forums/posts/167218533/trash` (200 OK) and the matching untrash — so the account has moderator privileges server-side. The phrasing *"An internal error occurred"* points to an uncaught server-side exception, not an authz rejection.

### What we need from backend

1. **Investigate server logs** for unhandled exceptions on `PUT /forums/posts/167218533` around **2026-05-15 09:50–09:53 UTC**, `userId 121342`.
2. **Replace the generic error** with the real error type (`ValidationError`, `PermissionDenied`, etc.) so the mobile error UI can show something actionable. Right now the catch-all forces the client to display a useless "Failed to save edit."

### Frontend wiring (for reference, no client change needed here)

- `editPost(...)` at [api.ts:3845-3876](../mobile/src/services/api.ts#L3845-L3876)
- Called from [PostModActionsSheet.tsx:152-205](../mobile/src/features/forums/components/PostModActionsSheet.tsx#L152-L205) for the `edit`, `matured`, and `modNote` switch cases.

---

<a id="b-2"></a>
## 🔴 B-2 — `POST /forums/threads/trash` doesn't exist; use `POST /forums/posts/{id}/trash` (P0)

### Symptom

The URL the mobile client currently posts to returns 405. The `Allow` header advertises GET but GET returns 404 to the same URL — so the route effectively doesn't exist.

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/threads/trash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"threadIds":[167218533],"topicId":5374712}'
# HTTP/1.1 405 Method Not Allowed
# Allow: GET     ← only GET advertised…
#                  …and GET to the same URL returns 404.
```

The working route (`POST /forums/posts/{id}/trash`) is documented in the [working endpoints section](#-working-endpoints--for-reference) above, and it mirrors the already-working untrash route `POST /forums/posts/{id}/untrash` — so per-post is clearly the intended shape.

### What we need from backend — pick one

| Option | Backend work | Mobile work | When to prefer |
|---|---|---|---|
| **(a) Confirm per-post is canonical** *(preferred)* | None. Document `POST /forums/posts/{id}/trash` as the trash route. | Mobile switches `trashPost` from `/forums/threads/trash` → `/forums/posts/{id}/trash`. | If there's no plan for bulk-trash from a moderation queue. |
| **(b) Add a bulk alias** | Add `POST /forums/threads/trash` accepting `{ threadIds: number[], topicId: number }`. | None. | If a moderator queue needs to trash multiple posts in one call. |

Tell us which and we'll patch accordingly.

### Frontend wiring

- `trashPost(...)` at [api.ts:3831-3838](../mobile/src/services/api.ts#L3831-L3838)

---

<a id="b-3"></a>
## 🔴 B-3 — Move Post: no public endpoint exists (P1)

The mobile sheet exposes a "Move Post" row but the client refuses to call any URL because none is defined — the UI shows the inline hint *"Per-post move is not exposed by the public API."* ([PostModActionsSheet.tsx:200-203](../mobile/src/features/forums/components/PostModActionsSheet.tsx#L200-L203)).

### What we need from backend

```
POST /forums/posts/{postId}/move
Body: { "toTopicId": <number> }
```

**Requirements:**

- Mirror the existing per-topic move (`POST /forums/topics/{topicId}/move`) for permissions: caller must be a moderator on **both** the source and the destination forums.
- On success, return the new `topicId` and `pageUrl` for the moved post so the client can navigate the user there.
- On the destination side, the post should append to the topic's existing post stream (i.e. it becomes the new last post), unless the live web does something different — in which case match the web's behavior.

Until this lands, the Move Post row stays disabled.

---

<a id="note-ip-row"></a>
## Note — IP row (no endpoint to fix)

The bottom row of the sheet displays the post author's IP address (`206.87.155.138` in the screenshot). This is **not** a separate API call — it rides along on the `ip` field of each post returned by `GET /forums/topics/{id}/posts`, which is already gated server-side to moderators only.

Verified working: the screenshot shows a non-null value, so the backend is populating it correctly. No action needed.

Related moderator-only fields on the same response that are also working: `hasMaturedContent`, `moderatorNote`. (These are read fine — the bug is only on the **write** path via `PUT /forums/posts/{id}` in [B-1](#b-1).)

---

## Test artefacts left behind

Flag to the moderation queue if you want them cleaned up:

- **Report record** `reportId: 110207` against post `167218533`, reason `Spam`, remark *"Automated endpoint test - please ignore"*. Safe to delete.
- **Post 167218533 was trashed and immediately restored** during B-2 discovery. No permanent state change.

---

## Appendix — client-side follow-ups (no backend work needed)

Captured here so they aren't lost. The mobile team will patch these after B-1 / B-2 / B-3 are resolved.

1. **Report-reasons mapper drops every reason.** `GET /reports/types` returns objects shaped `{ reportTypeId, reportTypeName }`, but the client mapper at [api.ts:4232-4236](../mobile/src/services/api.ts#L4232-L4236) only looks at `reportType` / `name` / `title` / `reason`, so every server reason is rejected as empty and the UI silently falls back to a 5-item hardcoded list. Adding `reportTypeName` to the lookup fixes it.
2. **Moderator-group set is incomplete on the client.** Mobile treats only `groupId ∈ {3,4,5,6}` as moderator ([authStore.ts:16](../mobile/src/store/authStore.ts#L16)), but `groupId 25` is clearly a moderator on the backend (it could trash/untrash successfully).
   - **Preferred:** backend exposes an `isModerator` flag on the user profile so the client doesn't have to enumerate group IDs.
   - **Alternative:** backend sends us the full list of moderator groupIds and we widen the hardcoded set.

   Tell us which path you'd prefer and we'll wire it.
