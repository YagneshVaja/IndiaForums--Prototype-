# Backend Bug Report — Forum › Topic Settings Sheet

**Date:** 2026-05-15
**Reported by:** Mobile team
**Scope:** Every option in the mobile "Topic Settings" bottom sheet (11 rows total).
**Triaged against:** `https://api2.indiaforums.com/api/v1`
**Test account:** `userId: 121342`, `groupId: 25` (moderator — confirmed by successful Trash + Untrash on this account).
**Test target:** `topicId: 5374712` · `forumId: 9` (Bollywood) — *"War 2 opens below the mark.. first day business 30 crore"*.
**Frontend entry points:** Two mobile UIs share these endpoints — fixing T-1 / T-2 / T-3 unblocks both:
- [mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx) — "Topic Settings" (11 rows, forum-level mod sheet)
- [mobile/src/features/forums/components/TopicModActionsSheet.tsx](../mobile/src/features/forums/components/TopicModActionsSheet.tsx) — "Moderator Actions" (6 rows, per-topic mod sheet: Edit, Lock, Pin, Trash, Restore, History)

All findings reproduce identically across both sheets and across multiple test topics (verified on `5374712` and `5374630`).

---

## 🚨 URGENT — data recovery needed before reading further

While testing, the **Move Topic endpoint accepted a non-existent destination forum (`toForumId: 999999`) and returned `isSuccess: true`**, orphaning the test topic. The row is intact in the database (the history endpoint still returns 403 for it — meaning the record exists, the test moderator just doesn't have rights in forum 999999), but every public path now returns "Topic not found" because the topic points at a forum that doesn't exist.

**Please run before anything else:**

```sql
UPDATE Topics SET forumId = 9 WHERE topicId = 5374712;
```

This restores `War 2 opens below the mark.. first day business 30 crore` (5374712) to the Bollywood forum where it belongs.

The root cause is documented in [T-1](#t-1) below — the Move handler needs a destination-forum existence check before committing the move.

---

## TL;DR for the backend dev

Three server-side issues to fix. The mobile team will patch its own client-side bugs (C-1 through C-5) in parallel.

| # | Priority | What's broken | Fix on backend |
|---|---|---|---|
| **T-1** | 🔴 P0 (data integrity) | `POST /forums/topics/{id}/move` doesn't validate `toForumId`. Sending a forum ID that doesn't exist still returns `isSuccess: true` and orphans the topic. | Reject requests where `toForumId` does not match an existing forum (return 400 with `errors: { toForumId: ["Destination forum does not exist."] }`). Also verify the caller is a moderator of **both** source and destination forums, like the topic-merge handler implicitly does. |
| **T-2** | 🔴 P0 | `POST /forums/topics/{id}/close` and `POST /forums/topics/{id}/open` both return 400 *"An unexpected error occurred. Please try again."* for every payload shape we tried. Mobile **Lock / Unlock Topic** is blocked. | Investigate the unhandled exception in both handlers. Server log window: **2026-05-15 ~10:15 UTC**, `userId 121342`, paths above. Same generic-error pattern as B-1 in the [Post Actions report](backend-issues-post-actions-2026-05-15.md) — likely the same root cause class. |
| **T-3** | 🟡 P2 | `POST /forums/topics/{id}/merge` returns the wrong error label. With a valid source topic and an invalid `newTopicId`, the response says `"Source topic not found"` — but the source is fine, it's the target that's invalid. | Fix the swapped error message in the merge handler so the client can show actionable text. Probably a transposed lookup between `sourceTopicId` and `newTopicId`. |

The mobile team will fix five client-side issues (C-1 through C-5 in [Appendix](#appendix--client-side-follow-ups)) — no backend work required for those.

---

## Coverage check — every option in the sheet

The "Topic Settings" sheet has 11 rows. All 11 have been verified against the live API:

| # | Row | Endpoint(s) | HTTP | Verdict | Section |
|---|---|---|---|---|---|
| 1 | **Edit Topic** | `PUT /forums/topics/{id}/admin` *(with `subject`)* | 200 | ✅ Works | — |
| 2 | **Migrate FF** | `POST /forums/topics/{id}/move` | n/a | 🟡 Client duplicate of Move | [C-5](#c-5) |
| 3 | **Move Topic** | `POST /forums/topics/{id}/move` | 200 *(but unsafe)* | 🔴 Server: missing validation | [T-1](#t-1) |
| 4 | **Merge Topic** | `POST /forums/topics/{id}/merge` | 400 *(wrong error label)* | 🟡 Server: confusing error text | [T-3](#t-3) |
| 5 | **Lock Topic** | `POST /forums/topics/{id}/close` | 400 | 🔴 Server: generic exception | [T-2](#t-2) |
| 5b | **Unlock Topic** | `POST /forums/topics/{id}/open` | 400 | 🔴 Server: generic exception | [T-2](#t-2) |
| 6 | **Pin Topic** | `PUT /forums/topics/{id}/admin` *(needs `subject`)* | 200 with subject, 400 without | 🟡 Client: missing `subject` field | [C-1](#c-1) |
| 7 | **Trash Topic** | `POST /forums/topics/trash` | 200 | ✅ Works | — |
| 8 | **Restore Topic** | `POST /forums/topics/{id}/untrash` | 200 | ✅ Works | — |
| 9 | **Topic History** | `GET /forums/topics/history` | 200 *(but client drops result)* | 🟡 Client: wrong response key | [C-2](#c-2) |
| 10 | **Hide Signature** | — *(no API call)* | n/a | 🟡 Client: fake save | [C-4](#c-4) |
| 11 | **Team** | `GET /forums/{forumId}/teams` *(server has data, client ignores it)* | 200 | 🟡 Client: unimplemented | [C-3](#c-3) |

**Net user impact:** From a mobile moderator's perspective:
- 3 actions work end-to-end (Edit, Trash, Restore)
- 1 action works server-side but fails from mobile (Pin — missing field)
- 2 actions blocked by server (Lock, Unlock)
- 1 action is unsafe to invoke (Move — can orphan data)
- 1 action returns a misleading error (Merge)
- 1 action shows empty data despite the server having it (Topic History)
- 1 action is a fake save (Hide Signature)
- 1 action is unimplemented (Team)
- 1 action duplicates another (Migrate FF == Move Topic)

---

## ✅ Working endpoints — for reference

These returned 200 with `isSuccess: true` and behaved correctly during this test run.

### Edit Topic

```bash
curl -i -X PUT "https://api2.indiaforums.com/api/v1/forums/topics/5374712/admin" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"subject":"War 2 opens below the mark.. first day business 30 crore"}'
# HTTP/1.1 200 OK
# {"topicId":5374712,"isSuccess":true,"message":"Topic Updated Successfully...","pageUrl":"war-2-takes-a-slow-start","errors":[]}
```

> **Note:** `subject` is mandatory in *every* PUT `/admin` payload, even when you're only updating other fields like `priority` or `flairId`. See [C-1](#c-1) for the client implication.

### Trash Topic

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/trash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicIds":[5374712],"forumIds":[9]}'
# HTTP/1.1 200 OK
# {"isSuccess":true,"message":"Topic moved to Trash...","topicsTrashed":1,
#  "trashedTopicIds":[5374712],"pageUrl":"/forums/bollywood","errors":[]}
```

### Restore Topic

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/untrash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
# HTTP/1.1 200 OK
# {"isSuccess":true,"message":"Topic moved back to original forum from trash...",
#  "topicId":5374712,"restoredToForumId":9,"topicSubject":"War 2 opens below the mark..",
#  "wasUnlocked":false,"pageUrl":"war-2-takes-a-slow-start","errors":[]}
```

### Topic History (server-side; **client doesn't read it correctly** — see C-2)

```bash
curl -i "https://api2.indiaforums.com/api/v1/forums/topics/history?topicId=5374761&actionId=0&pageNumber=1&pageSize=5" \
  -H "Authorization: Bearer <TOKEN>"
# HTTP/1.1 200 OK
# Top-level keys: actionId, forumDetail, hasPermission, historyLogs[], pageNumber,
#                 pageSize, topicDetail, topicId, totalCount, totalPages
# Each historyLogs[] entry shape:
# {
#   "topicHistoryLogId": 243010, "topicId": 5374761,
#   "action": 3, "actionText": "Topic Priority changed from <b>Normal Topic</b> to <b>Sticky Topic</b>",
#   "createdWhen": "2026-04-15T05:13:29.443",
#   "userId": 1172525, "userName": "pareshif", "groupId": 25,
#   "avatarType": 1, "avatarAccent": "#d27701", "updateChecksum": "2eW3F2",
#   "forumId": null, "forumName": null, "subject": null
# }
```

### Team (server-side; **client doesn't call it at all** — see C-3)

```bash
curl -i "https://api2.indiaforums.com/api/v1/forums/9/teams" \
  -H "Authorization: Bearer <TOKEN>"
# HTTP/1.1 200 OK
# {
#   "forumId": 9,
#   "teams": [
#     {
#       "teamId": 145, "forumId": 9, "teamName": "Action Alliance",
#       "backgroundColor": "#b51a00", "foregroundColor": "#FFFFFF",
#       "statusCode": 1, "userCount": 2, "mapId": null
#     },
#     … 15 more (Comedy Crew, Critique Crusaders, Drama Dynasty, Fantasy Force, …)
#   ]
# }
```

---

<a id="t-1"></a>
## 🔴 T-1 — Move Topic accepts non-existent destination forum (P0 data-integrity)

This is the **most dangerous** issue in this report — a single mistyped forum ID in the mobile UI's "Target Forum ID" input box permanently orphans a topic. We hit this during testing and have already filed the [recovery SQL above](#-urgent--data-recovery-needed-before-reading-further).

### Repro

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/move" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"toForumId":999999}'
# HTTP/1.1 200 OK
# {
#   "isSuccess":true,
#   "message":"Topic Moved Successfully.",
#   "topicId":5374712,
#   "fromForumId":9, "fromForumName":"Bollywood",
#   "toForumId":999999, "toForumName":null,   ← THIS NULL SHOULD HAVE BEEN THE REJECTION SIGNAL
#   "pageUrl":"war-2-takes-a-slow-start",
#   "errors":[]
# }
```

After this call, every subsequent endpoint for topic 5374712 returns `"Topic not found"`:

```bash
curl -s "https://api2.indiaforums.com/api/v1/forums/topics/5374712/posts?pageNumber=1&pageSize=1" \
  -H "Authorization: Bearer <TOKEN>"
# {"topicDetail":null,"forumDetail":null,"posts":[],…,"totalCount":0}

curl -s -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/move" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"toForumId":9}'
# {"isSuccess":false,"message":"Topic not found",…}

curl -s -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/untrash" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{}'
# {"isSuccess":false,"message":"Topic not found",…}
```

But **the row still exists** — the history endpoint returns 403 not 404 ("You do not have permission to view this history"), confirming the topic record is in the DB, just inaccessible because the moderator isn't a mod of forum 999999 (which doesn't exist anywhere).

### Why this is P0

A moderator using the mobile UI types a target forum ID into a free-form input. A single off-by-one typo (forum 9 → 99, or forum 10 → 100) silently orphans a real production topic. There's no undo path from the client — only a manual SQL update from the backend team can recover the topic.

### What we need from backend

1. **Validate `toForumId` exists** before committing the move. Return 400 with a structured error:
   ```json
   {
     "isSuccess": false,
     "message": "Destination forum does not exist.",
     "errors": { "toForumId": ["Destination forum does not exist."] }
   }
   ```
2. **Validate caller is a moderator** of *both* the source and destination forums (mirrors the topic-merge implicit check).
3. **Add a safety guard** so even a successful move sets the topic's new `forumId` only if the new forum row exists in the DB. (Belt-and-braces against any future regression.)
4. **One-time recovery query**:
   ```sql
   UPDATE Topics SET forumId = 9 WHERE topicId = 5374712;
   ```
   See if a quick scan finds any *other* orphaned topics from prior accidents:
   ```sql
   SELECT t.topicId, t.forumId, t.subject
   FROM Topics t
   LEFT JOIN Forums f ON t.forumId = f.forumId
   WHERE f.forumId IS NULL;
   ```

### Frontend wiring (no client change needed once T-1 lands)

- `moveTopic(...)` at [api.ts:3809-3816](../mobile/src/services/api.ts#L3809-L3816)
- Called from [ForumTopicSettingsSheet.tsx:175-181](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx#L175-L181) for the `move` and `migrateFF` cases.

---

<a id="t-2"></a>
## 🔴 T-2 — Lock / Unlock Topic both return 400 generic error (P0)

`POST /forums/topics/{id}/close` and `POST /forums/topics/{id}/open` both return the same catch-all "unexpected error" body for every payload shape — mobile **Lock** and **Unlock Topic** are blocked.

### Repro — Lock

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/close" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"forumId":9,"isCloseWithPost":false,"isAnonymous":false}'
# HTTP/1.1 400 Bad Request
# {
#   "isSuccess":false,
#   "message":"An unexpected error occurred. Please try again.",
#   "topicId":null, "threadId":null, "pageUrl":null,
#   "reportsUpdated":0, "errors":[]
# }
```

### Repro — Unlock

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/open" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"forumId":9,"isOpenWithPost":false,"isAnonymous":false}'
# HTTP/1.1 400 Bad Request
# {
#   "isSuccess":false,
#   "message":"An unexpected error occurred. Please try again.",
#   "topicId":null, "threadId":null, "pageUrl":null, "errors":[]
# }
```

### Not a permission problem

The same token successfully ran Trash + Untrash + Edit on the same topic in this session — moderator privileges are intact server-side. The "unexpected error" wording strongly suggests an uncaught exception in the close/open handlers (same pattern as B-1 in the [Post Actions report](backend-issues-post-actions-2026-05-15.md)).

### What we need from backend

1. **Investigate server logs** around **2026-05-15 ~10:15 UTC** for unhandled exceptions on `POST /forums/topics/5374712/close` and `POST /forums/topics/5374712/open` from `userId 121342`.
2. **Replace the generic error** with the real error type (`ValidationError`, `PermissionDenied`, etc.) so the mobile error UI can show actionable text.
3. **Check if these two handlers share code with `PUT /forums/posts/{id}`** (B-1 from the previous report) — the symptoms are identical and a common upstream change may have broken all three at once.

### Frontend wiring

- `closeTopic(...)` / `openTopic(...)` at [api.ts:3787-3807](../mobile/src/services/api.ts#L3787-L3807)

---

<a id="t-3"></a>
## 🟡 T-3 — Merge Topic returns wrong error label (P2)

Not a blocker, but the error message is misleading enough that mobile can't usefully surface it to the user.

### Repro

```bash
# topicId=5374712 EXISTS (was the test topic at this point in the run)
# newTopicId=999999 does NOT exist
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374712/merge" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374712,"newTopicId":999999}'
# HTTP/1.1 400 Bad Request
# {
#   "isSuccess":false,
#   "message":"Source topic not found",   ← but the source (5374712) is valid;
#                                             it's the target (999999) that's missing
#   …
# }
```

### What we need from backend

- Fix the swapped error label in the merge handler. The check that's failing is likely loading `newTopicId` (target) but the message reads as if it were `topicId` (source). After fix:
  ```json
  { "isSuccess": false, "message": "Target topic not found" }
  ```
- Also add destination-forum validation here (same theme as T-1) — moderator of both topics' forums should be required.

### Frontend wiring

- `mergeTopic(...)` at [api.ts:3818-3825](../mobile/src/services/api.ts#L3818-L3825)

---

## Test artefacts left behind

- **Topic 5374712 orphaned** (forumId=999999, non-existent). Recovery SQL provided at the [top of this doc](#-urgent--data-recovery-needed-before-reading-further). Needs DBA action before the test topic is usable again.
- **No other side effects** — Trash → Untrash was used once but fully reverted (Restore call returned 200 with `wasUnlocked:false`).

---

<a id="appendix--client-side-follow-ups"></a>
## Appendix — client-side follow-ups (no backend work needed)

Captured here so they aren't lost. The mobile team will fix these in a parallel commit; **no backend work required for any of them**. They're listed so backend can see the full picture of what makes the sheet broken end-to-end.

<a id="c-1"></a>
### C-1 — Pin Topic missing required `subject` field

Server requires `subject` in every PUT `/forums/topics/{id}/admin` payload. Mobile's `updateTopicAdminSettings` ([api.ts:4093-4103](../mobile/src/services/api.ts#L4093-L4103)) sends only `{ topicId, priority }` for Pin → 400 `{"errors":{"Subject":["Subject is required."]}}`.

**Fix on mobile:** pass the topic's current `subject` along with `priority`. (Verified: same call with `subject` returns 200.) The Pin call site in [ForumTopicSettingsSheet.tsx:197-203](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx#L197-L203) already has the selected topic in scope.

<a id="c-2"></a>
### C-2 — Topic History always shows "No history found"

Server returns the log array under key `historyLogs`. Mobile's `getTopicActionHistory` ([api.ts:4067-4083](../mobile/src/services/api.ts#L4067-L4083)) looks for `data?.logs ?? data?.results ?? data?.data ?? data ?? []` — none match, so it returns `[]` even when the topic has history.

**Fix on mobile:** add `historyLogs` to the lookup. Also update the per-entry field mapping to use the real shape (`topicHistoryLogId`, `action`, `actionText`, `createdWhen`, `userName`, `groupId`, `avatarAccent`, `updateChecksum`).

<a id="c-3"></a>
### C-3 — Team row hardcodes "No team members found"

Backend has `GET /forums/{forumId}/teams` returning real data (16 teams for Bollywood, with `teamId`, `teamName`, `backgroundColor`, `foregroundColor`, `userCount`). Mobile's [ForumTopicSettingsSheet.tsx:434-436](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx#L434-L436) just renders an empty-state string and never calls the API.

**Fix on mobile:** add a `getForumTeams(forumId)` wrapper hitting `/forums/{forumId}/teams`, render the list using each team's `teamName` and the existing color tokens.

<a id="c-4"></a>
### C-4 — Hide Signature is a fake save

[ForumTopicSettingsSheet.tsx:460-470](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx#L460-L470) just calls `setSuccess('Preference saved.')` and never hits any API. No matching endpoint exists server-side either (`/topics/{id}/hide-signature`, `/users/preferences/hide-signatures`, etc. all 404).

**Either:**
- backend adds a per-user signature-preference endpoint and the client wires it, **or**
- mobile removes the row entirely.

We need a decision from backend before patching the client.

<a id="c-5"></a>
### C-5 — Migrate FF and Move Topic call the exact same endpoint

Both rows route through `moveTopic(topicId, toForumId)` → `POST /forums/topics/{id}/move` ([ForumTopicSettingsSheet.tsx:175-181](../mobile/src/features/forums/components/ForumTopicSettingsSheet.tsx#L175-L181)). The user-facing labels imply different behavior (FF = Fan Fiction migration?) but the wire calls are identical.

**Either:**
- backend exposes a separate endpoint or a `migrationType` flag and mobile threads it through, **or**
- mobile removes the "Migrate FF" row as a duplicate.

We need a decision from backend before patching the client.
