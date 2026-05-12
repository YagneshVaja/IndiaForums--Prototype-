# Backend Bug Report

**Date:** 2026-04-07 | **Updated:** 2026-05-11 | **Reported by:** Frontend Team

---

## Summary

| Class | Count | HTTP Status | Root Cause | Action |
|-------|-------|-------------|------------|--------|
| **A** | 9 | 500 | Unhandled exception (catch-all) | Check server logs for stack trace |
| **B** | 3 | 400 | MediatR handler not in DI container | Add handler to `RegisterServicesFromAssembly` |
| **C** | 2 | 200 / 404 | Silent data bugs | Fix projection / ID space mismatch |
| **D** | 5 | 500 | EF Core `FromSql` missing column | Add missing column to SQL `SELECT` list |
| **E** | 2 | 500 / 400 | FanFictions handler errors | Check server logs; fix empty 400 body |
| **F** | 3 | various | Mobile Messages module bugs (see below) | See "Mobile Messages module" section |

**Total broken: 22 endpoints** | **Recently fixed: 2** (`check-username`, `check-email`)

---

## Class A — Generic 500 (9 endpoints)

**Every endpoint returns this identical body — check server logs for the real stack trace:**

```json
{ "type": "...rfc7231#section-6.6.1", "title": "Internal Server Error", "status": 500,
  "detail": "An unexpected error occurred. Please try again later." }
```

| # | Endpoint | Method | Frontend feature blocked |
|---|----------|--------|--------------------------|
| 1 | `/api/v1/me` | GET | Edit Profile — load profile |
| 2 | `/api/v1/me` | PUT | Edit Profile — save changes |
| 3 | `/api/v1/me/username` | PUT | Username Management |
| 4 | `/api/v1/auth/external-login` | POST | Google / Facebook / Microsoft login |
| 5 | `/api/v1/comments` | POST | Comment composer (all content types) |
| 6 | `/api/v1/reports` | POST | Report Content modal |
| 7 | `/api/v1/messages?mode=Inbox` | GET | Mobile Messages — **Inbox tab** (mode-specific: Inbox + Unread return 500; Read + Outbox return 200) |
| 8 | `/api/v1/messages?mode=Unread` | GET | Mobile Messages — **Unread tab** |
| 9 | `/api/v1/messages` | POST | Mobile Messages — **Send / Save Draft / Reply** (all three postType values return 500) |

**Useful pattern** — these `/me` sub-routes all work; only the base + username are broken:

| Endpoint | Status |
|----------|--------|
| `GET /me` | ❌ 500 |
| `GET /me/preferences`, `PUT /me/preferences` | ✅ |
| `GET /me/status`, `PUT /me/status` | ✅ |
| `GET /me/username/history` | ✅ |
| `PUT /me` | ❌ 500 |
| `PUT /me/username` | ❌ 500 |

**Frontend already corrected request shapes** — these still 500 after the fix, so the bug is server-side:
- `PUT /me` — now sends `userId` always; includes `groupId` / `updateChecksum` only when loaded from `getProfile`
- `PUT /me/username` — now sends `{"newUsername":"..."}` (not `{"userName":"..."}`) per `ChangeUsernameRequestDto`

**Curl repros (no auth needed for #4):**

```bash
# #1 GET /me
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/me"

# #3 PUT /me/username
curl -i -X PUT -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" -d '{"newUsername":"newusername"}' \
  "https://api2.indiaforums.com/api/v1/me/username"

# #4 POST /auth/external-login
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Content-Type: application/json" \
  -d '{"provider":"google","providerKey":"test123","email":"user@example.com","displayName":"Test User"}' \
  "https://api2.indiaforums.com/api/v1/auth/external-login"

# #5 POST /comments
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Content-Type: application/json" \
  -d '{"contentTypeId":7,"contentTypeValue":1,"parentCommentId":0,"contents":"hello","guestName":"test","guestEmail":"test@example.com"}' \
  "https://api2.indiaforums.com/api/v1/comments"

# #6 POST /reports
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Content-Type: application/json" \
  -d '{"contentType":7,"contentId":1,"reason":"Spam","remark":"test","authorName":"test","authorEmail":"test@example.com"}' \
  "https://api2.indiaforums.com/api/v1/reports"

# #7 GET /messages (any mode)
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/messages?mode=Inbox&pageNumber=1&pageSize=24"
# Reproduced on the mobile app 2026-05-11 with a fresh user token. Returns the
# Class A envelope (status 500, detail = "An unexpected error occurred...").
# Related endpoints to check while you're in there:
#   GET /api/v1/messages/overview
#   GET /api/v1/messages/folders
#   GET /api/v1/messages/drafts
#   GET /api/v1/messages/thread/{id}
```

---

## Class B — MediatR DI 400 (3 endpoints)

**Every endpoint returns this body — handler class is missing from MediatR DI scan:**

```json
{ "status": 400, "title": "Invalid Operation",
  "detail": "Error constructing handler for request of type MediatR.IRequestHandler`2[<CommandType>,<ResponseType>]. Register your handlers with the container." }
```

| # | Endpoint | Method | Missing handler class | Frontend feature blocked |
|---|----------|--------|-----------------------|--------------------------|
| 7 | `/api/v1/upload/user-thumbnail` | POST | `Features.ImageUpload.Commands.UploadUserThumbnailCommandHandler` | Profile picture upload/remove |
| 8 | `/api/v1/upload/user-banner` | POST | `Features.ImageUpload.Commands.UploadUserBannerCommandHandler` | Profile banner upload/remove |
| 9 | `/api/v1/auth/register` | POST | `Features.Authentication.Commands.RegisterCommandHandler` | New user signup |

**Likely fix:** In `Program.cs` / `DependencyInjection.cs`, confirm the assembly containing these handlers is included:
```csharp
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(SomeMarker).Assembly));
```
Check: Are the handler classes `public`, concrete, and implementing `IRequestHandler<TCommand, TResponse>` (not the void variant)?

Note: `POST /auth/login` and `POST /auth/forgot-password` from the same `Authentication` feature folder work fine — so it's specifically `RegisterCommandHandler` that's missing, not the whole assembly.

**Curl repros:**
```bash
# #7 upload/user-thumbnail (also works for /user-banner)
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" -d '{"imageData":""}' \
  "https://api2.indiaforums.com/api/v1/upload/user-thumbnail"

# #9 auth/register
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Content-Type: application/json" \
  -d '{"userName":"newuser123","email":"newuser123@example.com","password":"TestPm1234!","displayName":"New User","captchaToken":"test"}' \
  "https://api2.indiaforums.com/api/v1/auth/register"
```

**Untested (same DI fix may apply):** `POST /upload/cropped-image`, `POST /upload/post-image`

---

## Class C — Silent Data Bugs (2 endpoints)

### C-1: `GET /api/v1/shows` — empty `shows` array despite `totalCount: 46`

```bash
curl -s "https://api2.indiaforums.com/api/v1/shows?pageSize=12" -H "api-key: Api2IndiaForums@2026"
# HTTP 200: {"shows":[],"totalCount":46,"pageNumber":1,"pageSize":12,"totalPages":4}
```

Count query works, projection/select is broken or filtered out. Tried all `pageSize` and `categoryId` values — always empty.

**Workaround available:** `GET /shows/chaskameter` returns real titles (ranked by buzz). No plain browse list until fixed.

### C-2: `GET /api/v1/shows/{id}/about|cast|fanclub` — 404 for valid IDs

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://api2.indiaforums.com/api/v1/shows/5755/about" -H "api-key: Api2IndiaForums@2026"
# 404  (5755 = "Yeh Rishta Kya Kehlata Hai", a live ID from /shows/chaskameter)
```

Either `chaskameter.titleId` and `shows/{id}` use different ID spaces, or the handler is querying the wrong table.

Note: `POST /shows/{id}/rate` returns clean 401 — the write path is healthy. Show detail screen + ChaskaMeter rating slider are deferred until C-1 or C-2 is fixed.

---

## Class D — EF Core `FromSql` Column-Mapping Errors (6 endpoints)

**Root cause:** Raw SQL `SELECT` list is out of sync with the C# projection type. One fix likely clears all.

| Endpoint | Missing column | Error |
|----------|---------------|-------|
| `GET /search/suggestions?query=shah` | `ContentTypeId` | 500 with FromSql detail |
| `GET /search/trending` | `ContentTypeId` | 500 with FromSql detail |
| `GET /search?contentType=1` (Article) | `ArticleAttribute` | 500 with FromSql detail |
| `GET /search?contentType=2` (Movie) | `AlternateForumId` | 500 with FromSql detail |
| `GET /search?contentType=3` (Show) | `AlternateForumId` | 500 with FromSql detail |
| `POST /quizzes/{quizId}/response` | `FinalResultForUser` | 400 with FromSql detail |

### D-6 (NEW 2026-04-08): `POST /api/v1/quizzes/{quizId}/response` — 400

Found during Quizzes API integration (Phase 11). The submit endpoint accepts the request (route resolves, auth passes, body binds) but fails inside the SQL handler.

**Confirmed payload shape** (tested against live API):
```json
{ "answers": [{ "questionId": 443, "optionId": 1808 }] }
```

**Error response:**
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Invalid Operation",
  "status": 400,
  "detail": "The required column 'FinalResultForUser' was not present in the results of a 'FromSql' operation."
}
```

**Reproduce:**
```bash
curl -i -X POST "https://api2.indiaforums.com/api/v1/quizzes/36/response" \
  -H "api-key: Api2IndiaForums@2026" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionId":443,"optionId":1808}]}'
```

**Impact:** Quiz score cannot be saved to the leaderboard. The frontend handles this gracefully — `QuizResult` shows the locally computed score. The leaderboard (`GET /quizzes/{id}/players`) and all read endpoints are unaffected.

`GET /search?contentType=0` (Google CSE) works — it's an external API call, not a DB query.

Bonus: `GET /helpcenter/questions?categoryId=1` also returns a **generic** 500 (no FromSql detail). May share the same root cause or be separate — check logs.

**Curl repro:**
```bash
curl -s "https://api2.indiaforums.com/api/v1/search/suggestions?query=shah" -H "api-key: Api2IndiaForums@2026"
# {"detail":"The required column 'ContentTypeId' was not present in the results of a 'FromSql' operation.","traceId":"00-86be1d..."}
```

**Impact:** Search autocomplete, trending pills, and per-type search filters (Articles/Movies/Shows) all show empty states. Only Google CSE results (`contentType=0`) work.

---

## Class E — FanFictions Handler Errors (2 endpoints)

The other 3 fan-fiction endpoints (`GET /fan-fictions`, `GET /fan-fictions/{id}`, `GET /fan-fictions/chapter/{chapterId}`) return clean 200 — so it's handler-specific, not a DI or routing issue.

### E-1: `GET /api/v1/fan-fictions/authors` — 500

Same generic catch-all body as Class A. Check server logs for the real exception.

```bash
curl -i "https://api2.indiaforums.com/api/v1/fan-fictions/authors" -H "api-key: Api2IndiaForums@2026"
# HTTP 500 — same generic body as Class A
```

### E-2: `GET /api/v1/fan-fictions/author/{authorId}/followers` — 400 (empty body)

Returns 400 with **no response body at all** — no validation message, no MediatR error. Impossible to debug from the client.

```bash
curl -i "https://api2.indiaforums.com/api/v1/fan-fictions/author/856064/followers" \
  -H "api-key: Api2IndiaForums@2026"
# HTTP/1.1 400 Bad Request  (empty body)
```

`856064` is a real `userId` from the working `GET /fan-fictions` list. Tried `page`, `pageSize`, `pageNumber` — all 400.

**Please add a `application/problem+json` body to this 400** so we can see the actual reason. Possible causes: required query param we haven't guessed, FluentValidation throwing before controller model binding completes.

---

## Class F — Mobile Messages Module (added 2026-05-11)

Live triage of every `/api/v1/messages/*` endpoint, executed with a real user token (`userId: 121342`). Includes both bugs and working endpoints for reference.

| Endpoint | Method | Status | Verdict | Notes |
|---|---|---|---|---|
| `/messages/overview` | GET | **400** | 🔴 Bug | `"Invalid Operation"` — handler rejects the empty params. Spec says no params required. The matching response shape suggests this should always work. |
| `/messages/folders` | GET | 200 | ✅ Works | Returns `{ folders: [...], userId }` |
| `/messages/folders` | POST | 200 | ✅ Works | `{folderId:0, folderName:"X"}` → creates folder, returns new id |
| `/messages/folders/{id}` | DELETE | 200 | ✅ Works | |
| `/messages?mode=Inbox` | GET | **500** | 🔴 Bug | Class A envelope. Inbox tab unusable. |
| `/messages?mode=Unread` | GET | **500** | 🔴 Bug | Class A envelope. Unread tab unusable. |
| `/messages?mode=Outbox` | GET | 200 | ✅ Works | Returns full list |
| `/messages?mode=Read` | GET | 200 | ✅ Works | Returns full list |
| `/messages` | POST | **500** | 🔴 Bug | All three `postType` values (`New`, `Reply`, `Draft`) return Class A 500. **Sending PMs / replies / saving drafts is completely broken.** |
| `/messages/drafts` | GET | 200 | ✅ Works | Returns drafts (paginated) |
| `/messages/new?mode=PM[&did=…&tunm=…]` | GET | 200 | ✅ Works | Returns compose-form init |
| `/messages/thread/{id}` | GET | 200 | ✅ Works | Returns thread + messages |
| `/messages/thread/{id}/opt-out` | POST | 200 ⚠️ | ✅ Works (with caveat) | Requires a request body; sending nothing returns IIS 411 "Length Required". Mobile client now sends `{}` to satisfy this — but the BE should accept an empty body too. |
| `/messages/{id}` | GET | **404** | 🟡 Unclear | Returned 404 for both `pmId` (26199342) and `pmlId` (62271385) of a known message. ID space the route accepts is undocumented and could not be inferred from the spec. |
| `/messages/actions` | POST | 200 ⚠️ | ✅ Works (cosmetic bug) | Always returns `affectedCount: -1` with message `"-1 message(s) marked as read."` — looks like a SQL `@@ROWCOUNT` not being captured. UI ignores the count, but the BE message would be confusing if shown. |
| `/messages/move-to-folder` | POST | 200 ⚠️ | ✅ Works (cosmetic bug) | Same `-1` count issue. |

### F-1: Inbox + Unread modes 500 while Read + Outbox work — mode-specific SQL bug

The same controller returns 200 for `mode=Read` and `mode=Outbox` but 500 for `mode=Inbox` and `mode=Unread`. Suggests the per-mode query branch is bad (probably a NULL/JOIN difference in the SELECT for unread/inbox where the row hasn't been read yet).

```bash
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/messages?mode=Inbox&pageNumber=1&pageSize=24"
# HTTP/1.1 500 — Class A envelope

# Same call with mode=Read or mode=Outbox returns 200 with real data.
```

### F-2: `POST /messages` 500 on all postType values

Sending a new PM, replying inside a thread, and saving as draft all return Class A 500. Tried with and without `userGroupList`, with and without `parentId`/`rootMessageId`. Send is **completely broken** for the mobile client (and presumably the web prototype too).

```bash
curl -i -X POST -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"probe","message":"hello","userList":"vijay","userGroupList":null,"bcc":false,"parentId":null,"rootMessageId":0,"emailNotify":false,"draftId":null,"postType":"New"}' \
  "https://api2.indiaforums.com/api/v1/messages"
# HTTP/1.1 500 — Class A envelope
```

### F-3: `GET /messages/overview` 400 "Invalid Operation"

Takes no params per the OpenAPI spec. Authenticated GET still returns 400 with the generic `Invalid Operation` envelope. The same user can hit `/folders`, `/thread/{id}`, `/new`, etc. fine — so the bug is specific to the overview handler.

```bash
curl -i -H "api-key: Api2IndiaForums@2026" -H "Authorization: Bearer <TOKEN>" \
  "https://api2.indiaforums.com/api/v1/messages/overview"
# HTTP/1.1 400 — "The requested operation could not be completed."
```

### F-4: `GET /messages/{id}` 404 — unclear ID space

Tested with both `pmId` (e.g. `26199342`) and `pmlId` (e.g. `62271385`) of a real message returned from `/messages/thread/{id}` — both return `404 "Message with ID … not found."`. Not blocking mobile (no screen calls this endpoint yet), but the route either has a bug or expects a third ID space we haven't found documented.

### F-5: Affected-count returns -1 (cosmetic)

Both `POST /messages/actions` and `POST /messages/move-to-folder` return `isSuccess: true, affectedCount: -1` with a message like `"-1 message(s) marked as read."` — looks like SQL `@@ROWCOUNT` is being returned without checking for the "no count" sentinel. Mobile UI works because it ignores the count; just clean up the message text and resolve the count properly so logs aren't misleading.

---

## Recently Fixed

| Endpoint | Method | Verified Response |
|----------|--------|-------------------|
| `/api/v1/auth/check-username` | GET | `{"available":false,"username":"test","message":"Username is already taken.","suggestions":[...]}` |
| `/api/v1/auth/check-email` | GET | `{"available":true,"email":"...","message":null,"hint":null}` |

Both `?userName=` and `?username=` spellings work for check-username.

---

## Frontend Auto-Wire Status

Frontend is already wired to all broken endpoints. **No coordination needed** — fix the backend and these features go live automatically:

| Fix | Feature unblocked |
|-----|-------------------|
| Class A: `/me` GET+PUT | Edit Profile screen |
| Class A: `/me/username` PUT | Username Management |
| Class A: `/auth/external-login` | Social login (Google/Facebook/Microsoft) |
| Class A: `/comments` POST | Comment composer on all content |
| Class A: `/reports` POST | Report Content modal |
| Class B: `/upload/user-thumbnail` + `/user-banner` | Profile picture & banner upload |
| Class B: `/auth/register` | New user signup |
| Class C: shows endpoints | Shows browse + detail screens |
| Class D: search/helpcenter | Search autocomplete, trending, per-type search, help category filter |
| Class E: fan-fictions/authors + followers | Top Authors leaderboard + Followers view |

---

## Questions?

Need a test JWT, screen-share to reproduce, or frontend code reference for any endpoint? Reach out to the frontend team.
