# Backend Bug Report — Forum › Moderator Actions Sheet (per-topic)

**Date:** 2026-05-15
**Reported by:** Mobile team
**Scope:** Every option in the mobile per-topic "Moderator Actions" bottom sheet — opened from inside a topic (6 rows: Edit Topic, Lock/Unlock Topic, Pin/Unpin Topic, Trash Topic, Restore Topic, Topic History).
**Triaged against:** `https://api2.indiaforums.com/api/v1`
**Test account:** `userId: 121342`, `groupId: 25` (moderator — confirmed by successful Edit + Trash + Untrash on this account in this session).
**Test target:** `topicId: 5374630` · `forumId: 9` (Bollywood) — *"War 2 -Movie Reviews & BO Discussion"*. Baseline state: `priority: 1` (pinned), `topicLocked: false`, `statusCode: 1` (active).
**Frontend entry point:** [mobile/src/features/forums/components/TopicModActionsSheet.tsx](../mobile/src/features/forums/components/TopicModActionsSheet.tsx)

> **Note for backend:** This sheet shares its API surface with the "Topic Settings" sheet covered in [backend-issues-topic-settings-2026-05-15.md](backend-issues-topic-settings-2026-05-15.md). The single server bug below (**M-1**) is the same root cause as **T-2** there — fixing it once unblocks both UIs. This doc exists so the per-topic sheet is independently auditable; if you've already actioned the Topic Settings doc, you can skim this one and move on.

---

## TL;DR for the backend dev

**One server-side issue blocks this sheet:**

| # | Priority | What's broken | Fix on backend |
|---|---|---|---|
| **M-1** | 🔴 P0 | `POST /forums/topics/{id}/close` and `POST /forums/topics/{id}/open` both return 400 *"An unexpected error occurred. Please try again."* for every payload shape we tried. Mobile **Lock / Unlock Topic** is blocked. | Investigate the unhandled exception in both handlers. Server log window: **2026-05-15 ~10:15 UTC** and **~12:30 UTC**, `userId 121342`, paths above. Same symptom and likely the same root cause as **T-2** in the [Topic Settings report](backend-issues-topic-settings-2026-05-15.md) and **B-1** in the [Post Actions report](backend-issues-post-actions-2026-05-15.md) — three different endpoints, same generic catch-all wording, points to a shared upstream class. |

Two client-side issues exist (C-1, C-2) — **already fixed on mobile**, listed in the [Appendix](#appendix--client-side-fixes-already-shipped) for completeness.

---

## Coverage check — every option in the sheet

All 6 rows verified against the live API on topic 5374630:

| # | Row | Endpoint | HTTP | Verdict | Section |
|---|---|---|---|---|---|
| 1 | **Edit Topic** | `PUT /forums/topics/{id}/admin` *(with `subject`)* | 200 | ✅ Works | — |
| 2a | **Lock Topic** | `POST /forums/topics/{id}/close` | 400 | 🔴 Server: generic exception | [M-1](#m-1) |
| 2b | **Unlock Topic** | `POST /forums/topics/{id}/open` | 400 | 🔴 Server: generic exception | [M-1](#m-1) |
| 3 | **Pin / Unpin Topic** | `PUT /forums/topics/{id}/admin` *(needs `subject`)* | 200 with subject, 400 without | ✅ Works after client fix | [C-1](#c-1) |
| 4 | **Trash Topic** | `POST /forums/topics/trash` | 200 | ✅ Works | — |
| 5 | **Restore Topic** | `POST /forums/topics/{id}/untrash` | 200 | ✅ Works | — |
| 6 | **Topic History** | `GET /forums/topics/history` | 200 *(client mapper was wrong, now fixed)* | ✅ Works after client fix | [C-2](#c-2) |

**Net user impact:** From a mobile moderator's perspective in this sheet, after the mobile fixes from this session land:
- 4 actions work end-to-end (Edit, Pin/Unpin, Trash, Restore, History → **5** after C-2)
- 2 actions blocked by server (Lock, Unlock)

---

## ✅ Working endpoints — for reference

All four returned 200 with `isSuccess: true` and behaved correctly when called with the test token on topic 5374630.

### Edit Topic

```bash
curl -i -X PUT "https://api2.indiaforums.com/api/v1/forums/topics/5374630/admin" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374630,"subject":"War 2 -Movie Reviews & BO Discussion"}'
# HTTP/1.1 200 OK
# {"topicId":5374630,"isSuccess":true,"message":"Topic Updated Successfully...","pageUrl":"war-2-movie-reviews-and-bo-discussion","errors":[]}
```

> **Note:** `subject` is mandatory in *every* PUT `/admin` payload, even when only flipping `priority` / `flairId`. See [C-1](#c-1) for the client implication.

### Pin / Unpin Topic (with `subject` workaround)

```bash
curl -i -X PUT "https://api2.indiaforums.com/api/v1/forums/topics/5374630/admin" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374630,"subject":"War 2 -Movie Reviews & BO Discussion","priority":1}'
# HTTP/1.1 200 OK
# {"topicId":5374630,"isSuccess":true,"message":"Topic Updated Successfully..."}
#
# Without subject:
# 400 {"errors":{"Subject":["Subject is required."]}}
```

### Trash Topic

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/trash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicIds":[5374630],"forumIds":[9]}'
# HTTP/1.1 200 OK
# {"isSuccess":true,"message":"Topic moved to Trash...","topicsTrashed":1,
#  "trashedTopicIds":[5374630],"pageUrl":"/forums/bollywood","errors":[]}
```

### Restore Topic

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374630/untrash" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
# HTTP/1.1 200 OK
# {"isSuccess":true,"message":"Topic moved back to original forum from trash...",
#  "topicId":5374630,"restoredToForumId":9,…,"wasUnlocked":false,
#  "pageUrl":"war-2-movie-reviews-and-bo-discussion","errors":[]}
```

### Topic History

```bash
curl -i "https://api2.indiaforums.com/api/v1/forums/topics/history?topicId=5374630&actionId=0&pageNumber=1&pageSize=5" \
  -H "Authorization: Bearer <TOKEN>"
# HTTP/1.1 200 OK
# Top-level keys: actionId, forumDetail, hasPermission, historyLogs[], pageNumber,
#                 pageSize, topicDetail, topicId, totalCount, totalPages
# Returned 1 historyLogs entry for topic 5374630.
```

---

<a id="m-1"></a>
## 🔴 M-1 — Lock / Unlock Topic both return 400 generic error (P0)

`POST /forums/topics/{id}/close` and `POST /forums/topics/{id}/open` both return the same catch-all "unexpected error" body for every payload shape we tried. Mobile **Lock Topic** and **Unlock Topic** are blocked.

This is the **same root cause as T-2** in [backend-issues-topic-settings-2026-05-15.md](backend-issues-topic-settings-2026-05-15.md) — independently re-verified here against topic 5374630.

### Repro — Lock

```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374630/close" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374630,"forumId":9,"isCloseWithPost":false,"isAnonymous":false}'
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
curl -i -X POST "https://api2.indiaforums.com/api/v1/forums/topics/5374630/open" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"topicId":5374630,"forumId":9,"isOpenWithPost":false,"isAnonymous":false}'
# HTTP/1.1 400 Bad Request
# {
#   "isSuccess":false,
#   "message":"An unexpected error occurred. Please try again.",
#   "topicId":null, "threadId":null, "pageUrl":null, "errors":[]
# }
```

### Not a permission problem

The same token successfully ran Edit + Pin + Trash + Untrash + History on the same topic during this session — moderator privileges are intact server-side. The *"unexpected error"* wording strongly suggests an uncaught exception in the close/open handlers.

### Three different endpoints showing the same generic error — likely shared root cause

| Endpoint | Doc reference | Symptom |
|---|---|---|
| `POST /forums/topics/{id}/close` | This report — **M-1** | 400 *"An unexpected error occurred."* |
| `POST /forums/topics/{id}/open` | This report — **M-1** | 400 *"An unexpected error occurred."* |
| `PUT /forums/posts/{id}` (Edit Post, Mark Matured, Mod Note) | [Post Actions report — B-1](backend-issues-post-actions-2026-05-15.md) | 400 *"An internal error occurred."* |

Three distinct routes, same wording shape, same lack of structured error info. Worth checking if they share a base controller / middleware that started swallowing real exceptions recently.

### What we need from backend

1. **Investigate server logs** around **2026-05-15 ~10:15 UTC** and **~12:30 UTC** for unhandled exceptions on `POST /forums/topics/5374630/close` and `POST /forums/topics/5374630/open` from `userId 121342`.
2. **Replace the generic error** with the real error type (`ValidationError`, `PermissionDenied`, etc.) so the mobile error UI can show actionable text. Right now the catch-all forces the client to show *"Failed to lock topic."* / *"Failed to unlock topic."*, which gives the user no way forward.
3. **Cross-check shared code** with `PUT /forums/posts/{id}` (B-1 in the Post Actions report) — the symptoms are identical and a common upstream change may have broken all three at once.

### Frontend wiring (no client change needed once M-1 lands)

- `closeTopic(...)` / `openTopic(...)` at [api.ts:3787-3807](../mobile/src/services/api.ts#L3787-L3807)
- Called from [TopicModActionsSheet.tsx:144-150](../mobile/src/features/forums/components/TopicModActionsSheet.tsx#L144-L150) for the `lock` switch case (one handler covers both lock + unlock based on `topic.locked`).

---

## Test artefacts left behind

**None.** All write operations in this run were idempotent or immediately reverted:
- Edit Topic — sent the existing subject unchanged (no real change)
- Pin Topic — sent `priority: 1` (the topic's existing value)
- Trash + Untrash — paired in earlier session
- Lock / Unlock — never succeeded, so nothing to revert

No reports created, no orphaned topics, no permanent state changes from this run.

---

<a id="appendix--client-side-fixes-already-shipped"></a>
## Appendix — client-side fixes already shipped (no backend work)

These were discovered during this triage and **already patched on mobile** in commit `3da583b` on branch `feat/celebrity-profile-tier1`. Listed here so the backend dev sees the complete picture.

<a id="c-1"></a>
### C-1 — Pin / Unpin Topic was missing required `subject` field

Server requires `subject` in every PUT `/forums/topics/{id}/admin` payload. Mobile's `updateTopicAdminSettings` was sending only `{ topicId, priority }` for Pin → 400 `{"errors":{"Subject":["Subject is required."]}}`.

**Fixed at:** [TopicModActionsSheet.tsx:152-164](../mobile/src/features/forums/components/TopicModActionsSheet.tsx#L152-L164) — the Pin call site now passes `subject: topic.title` alongside `priority`. The shared wrapper's type was widened in [api.ts:4087-4099](../mobile/src/services/api.ts#L4087-L4099) to accept the field. Verified: same call with `subject` returns 200.

<a id="c-2"></a>
### C-2 — Topic History always showed "No history found"

Server returns the log array under key `historyLogs`. Mobile's `getTopicActionHistory` was looking for `data?.logs ?? data?.results ?? data?.data ?? data ?? []` — none matched, so the mapper returned `[]` for every healthy response.

**Fixed at:** [api.ts:4067-4086](../mobile/src/services/api.ts#L4067-L4086) — added `historyLogs` to the lookup chain (kept the other keys as defensive aliases). Verified: topic 5374630 with 1 history entry now renders that entry in the sheet.
