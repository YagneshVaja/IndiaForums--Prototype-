# Notifications — Backend Issues for Review

**Date:** 2026-05-12
**Surfaced from:** mobile app QA on `feat/celebrity-profile-tier1` build #8
**Affected endpoints:**
- `GET  /api/v1/user-notifications`
- `GET  /api/v1/user-notifications/unread-count`
- `GET  /api/v1/user-notifications/inbox-counts`
- `POST /api/v1/user-notifications/read`
- `POST /api/v1/devices/register`
- `GET  /api/v1/devices`
- `DELETE /api/v1/devices/{id}`
- `PUT  /api/v1/devices/{id}/preferences`
- `GET  /api/v1/me/preferences`

The list is grouped by severity. Items marked **Critical** block the feature from working end-to-end; **Important** cause user-visible bugs we've had to work around client-side; **Nice to have** are gaps in the API surface that limit polish.

---

## Critical — blocks end-to-end push notifications

### 1. Confirm push delivery method (Expo Push vs raw FCM/APNs)
**Endpoint:** `POST /devices/register`

The mobile app currently sends an Expo push token in the `deviceToken` field:
```json
{
  "deviceToken": "ExponentPushToken[xxxxx]",
  "platform": "android"
}
```

The backend stores this and (presumably) uses it to send pushes. **We need confirmation:**
- Does the backend send via Expo's Push API (`https://exp.host/--/api/v2/push/send`)?
- Or does it call FCM (Android) and APNs (iOS) directly?

If raw FCM/APNs, the Expo push token format is wrong — we should send `getDevicePushTokenAsync()` results instead, and the request DTO needs a `tokenType` discriminator.

**Action:** confirm the delivery path and document it on the `/devices/register` endpoint.

### 2. `/user-notifications` vs `/user-notifications/unread-count` data mismatch
**Endpoints:** `GET /user-notifications`, `GET /user-notifications/unread-count`

Observed in production on 2026-05-11 for user `pareshif`:
```
GET /user-notifications/unread-count
→ { "unreadCount": 5 }

GET /user-notifications?pn=1&ps=30&pr=10
→ { "notifications": [9 items],
    "totalRecordCount": 9, "totalPages": 1,
    "notificationTemplates": [5 templates totaling 9 items] }
→ all 9 items had `"read": 1`
```

The unread-count endpoint says 5 unread; the list endpoint returns all items as read; there are no more pages to load. The two endpoints disagree by ~5 items.

**Hypothesis:** the unread-count endpoint reads from a different source/cache than the list endpoint. Or there are unread items that the list endpoint filters out (deleted? soft-archived?).

**Impact:** the in-app badge shows "5 unread" but the user can't find those 5 unread items anywhere. We had to add an "All caught up — refreshing count" path in the UI to handle this.

**Action:** ensure both endpoints read from the same source of truth.

### 3. Document `contentTypeId` enum values
**Schema:** `NotificationDto`, `CommentsResponseDto`, several others

Only two values are documented anywhere in the OpenAPI spec (in the `/comments` endpoint description):
- `contentTypeId = 6` → media/photo
- `contentTypeId = 7` → article

The notification payloads also use `contentTypeId` to identify the target object, but values like post, topic, forum, badge, user, slambook, testimonial entry, etc. are not enumerated.

**Action:** add an enum schema for `ContentType` and reference it in every DTO that uses `contentTypeId`. We need the integer → object-type mapping.

### 4. Document the `templateId` → payload-shape contract
**Schema:** `NotificationDto`, `NotificationTemplateDto`

Real template IDs observed in production:

| templateId | templateDesc (raw)                        |
|------------|-------------------------------------------|
| 23         | `" tagged you in a post "`                |
| 37         | `" invited you to join their forum "`     |
| 38         | `" made you a Moderator of the forum "`   |
| 4          | `" posted a question on your slambook."`  |
| 5          | `" posted on your testimonial."`          |

For each `templateId`, the mobile app needs to know:
- What does `contentTypeValue` represent? (post id? topic id? user id? forum id?)
- What's the shape of `jsonData`? (currently a stringified JSON blob with no documented schema)
- How does the user expect to be deep-linked? (e.g., template 23 — tap should open the *topic* containing the post they were tagged in, or the specific post?)

**Action:** publish a table mapping templateId → screen + payload contract. Without this, in-app tap-to-deep-link only works for template 23 (and only because we guessed contentTypeValue = topicId).

### 5. Document the push notification `data` payload contract
**Endpoint:** outbound push notification (no API endpoint, but governed by backend)

When the backend sends a push notification to a device, what does it set in `data`? Possibilities we've seen referenced in other apps:
- Just the `NotificationDto` shape (`{ templateId, contentTypeId, contentTypeValue, jsonData, notificationId }`)
- Domain-specific keys (`{ topicId, postId, articleId, userId, badgeId }`)
- A `deepLink` URL string

The mobile router handles all three patterns as a fallback chain, but if the backend has a specific convention we should adapt to it instead.

**Action:** publish the push payload contract and include `notificationId` so the mobile app can mark-as-read on tap.

### 6. `publishedWhen` timestamp format and timezone undocumented
**Schema:** `NotificationDto.publishedWhen` (also affects other DTOs)

```json
"publishedWhen": { "type": "string" }
```

No `format: "date-time"`, no timezone specifier, no example. We render with a relative-time helper (`"1MO AGO"`) but the helper has to guess:
- Is it ISO 8601 (`2026-05-09T11:48:00Z`)?
- Local time without TZ?
- Unix epoch (would be unusual as a string but possible)?
- Server's local timezone?

If different endpoints use different formats, time displays will be inconsistent.

**Action:** standardize on ISO 8601 with explicit `Z` (UTC). Mark the field `format: "date-time"` in the OpenAPI spec.

### 7. `/user-notifications` query parameters have zero documentation
**Endpoint:** `GET /user-notifications`

All five query parameters are declared but **none have a description**:
```
t   (query): (no description)
pc  (query): (no description)
pn  (query): (no description)
ps  (query): (no description)
pr  (query): (no description)
```

We reverse-engineered:
- `pn` = page number (1-indexed?)
- `ps` = page size
- `t` = template filter — accepts a string, presumably comma-separated IDs?
- `pr` and `pc` — meaning still unknown

**Action:** add descriptions to every parameter on every endpoint, especially the abbreviated names. Document expected values, defaults, and any constraints. `t` should specify whether it's a single ID, comma-separated list, or pipe-delimited.

---

## Important — causes user-visible bugs the client has to paper over

### 8. `templateDesc` has leading/trailing whitespace
**Schema:** `NotificationTemplateDto.templateDesc`

Example value: `" tagged you in a post "` (note leading + trailing spaces).

We trim client-side in `TemplateChip`, but other UIs (web, third-party clients) will need the same workaround.

**Action:** trim `templateDesc` server-side before returning.

### 9. `NotificationDto.message` contains HTML
**Schema:** `NotificationDto.message`

The `message` field contains HTML markup that the client must strip before rendering as plain text. Currently fine because we have a `stripHtml` helper, but:
- Mixing presentational HTML into a "message" field couples client rendering to server templating.
- No separate plain-text / rich-text channels.

**Action:** either (a) deliver pure plain text in `message` and use a separate `messageHtml` field for HTML, or (b) document that `message` is HTML and what tags are allowed.

### 10. No server-side `read` filter on `/user-notifications`
**Endpoint:** `GET /user-notifications`

There's no query parameter to ask for only read or only unread items. To find unread items the client has to paginate through all pages and filter locally — which only works if the unread items are in the first few pages.

**Action:** add a `read=0|1|all` query param (or `unreadOnly=true`).

### 11. `RegisterDeviceResponseDto.deviceTokenId` is `string | number | null`
**Schema:** `RegisterDeviceResponseDto`

```json
"deviceTokenId": { "type": ["integer", "string"], "nullable": true }
```

Three possible shapes is two too many. On success this should never be null. The client needs to coerce to a string anyway for the subsequent `DELETE /devices/{deviceTokenId}` call.

**Action:** return `"deviceTokenId": "12345"` (always a string, never null on `success: true`).

### 12. Pagination param naming is inconsistent across endpoints
**Endpoints:** `/user-notifications` uses `pn`, `ps`, `pr`. Most other endpoints (e.g., `/forums/topics/{id}/posts`) use `pageNumber`, `pageSize`.

Two different naming schemes in the same API surface. Forces clients to remember which convention applies where.

**Action:** standardize on `pageNumber` / `pageSize`. Keep the short names as aliases if you don't want to break v1 clients.

### 13. `notificationCount` per template is the *total* count, not unread
**Schema:** `NotificationTemplateDto.notificationCount`

Observed: a user had 5 unread total (per `/unread-count`), but the template chips show `"tagged you in a post · 5"` and `"invited you to a forum · 1"`, etc., totaling 9 — which matches the *total* notifications of each type, not the unread count.

**Impact:** users can't tell from the chip how many of "tagged you in a post" are *new* (unread). Currently the chip might say 5 even if all 5 are already read.

**Action:** clarify what `notificationCount` means. Consider adding `unreadCount` alongside it per template.

### 14. `read` field type is inconsistent
**Schema:** `NotificationDto.read`

```json
"read": { "type": ["integer", "string"] }
```

We've seen both `1` (integer) and `"1"` (string) in practice. Mobile clients coerce, but the schema should pick one.

**Action:** standardize on integer `0 | 1`, or better yet a boolean.

### 15. `NotificationDto.user` is typed as `unknown`
**Schema:** `NotificationDto.user`

The `user` property is declared with no type or `$ref` in the OpenAPI spec — it ends up as `unknown` in generated clients. We know empirically that `displayUserName` exists alongside it, but the relationship is unclear:
- Is `user` a `UserDto`-shaped object?
- Is it the sender? Or the recipient?
- When is it null vs populated?

We currently ignore `user` and only use `displayUserName`.

**Action:** type `user` as a proper `$ref` (likely `UserSummaryDto`), and document whether it's the sender or recipient.

### 16. Three overlapping fields for "who" — `userId`, `createdBy`, `displayUserName`, `user`
**Schema:** `NotificationDto`

Four fields all relate to user identity:
- `userId` — presumably the recipient
- `createdBy` — presumably the sender's user ID
- `displayUserName` — presumably sender's display name
- `user` — typed as `unknown` (see #15)

Two of these (`userId` + `createdBy`) are typed `integer | string`. The relationship between them and `user`/`displayUserName` is undocumented.

**Action:** rename for clarity (`recipientUserId`, `actorUserId`, `actorDisplayName`, `actor`), or at minimum document the role of each field.

### 17. `ReadNotificationsRequestDto.ids` is `null | string` — nullable when empty-string is already the "all" sentinel
**Schema:** `ReadNotificationsRequestDto`

```json
"ids": { "type": "string", "nullable": true }
```

The semantics are:
- A comma-separated list of IDs to mark read, OR
- An empty string `""` to mark all notifications read

Why is `null` also accepted? Either `null` is treated as "all" (then it's redundant with `""`), or it returns an error. Inconsistent surface.

**Action:** pick one. Probably `ids: string` (non-nullable) with `""` as the "mark all" sentinel.

### 18. HATEOAS-style pagination URLs in response but no format documented
**Schema:** `UserNotificationsResponseDto`

```ts
nextUrl: null | string;
previousUrl: null | string;
firstUrl: null | string;
lastUrl: null | string;
```

These are useful for HATEOAS-style navigation but the format isn't documented. Are they:
- Fully qualified URLs (`https://api2.indiaforums.com/api/v1/...`)?
- Relative paths (`/api/v1/user-notifications?pn=2`)?
- Query strings only (`?pn=2`)?

The mobile client doesn't use them today (we use `pn` directly), but a web client might. Worth specifying.

**Action:** document the format and ensure consistency across pagination-bearing endpoints.

### 19. Sort order on `/user-notifications` not documented
**Endpoint:** `GET /user-notifications`

Empirically appears to be newest-first by `publishedWhen`, but no documentation and no sort query parameter. Some popular-app patterns want oldest-first too.

**Action:** document the default sort, and consider adding a `sortBy=publishedWhen.desc|asc` parameter.

### 20. HTTP error response shapes not consistently documented
**All endpoints**

The OpenAPI spec doesn't show consistent error response shapes (e.g., for 400, 401, 403, 404, 500). Some endpoints reference `ValidationProblemDetails` for 400 but most don't document 5xx or auth failures.

**Action:** define a standard `ApiError` schema and reference it from every endpoint's `4xx` and `5xx` responses.

### 21. `isNewDevice` flag on register response — semantics undocumented
**Schema:** `RegisterDeviceResponseDto.isNewDevice`

We get `isNewDevice: true | false` back from `/devices/register`. What's it for?
- First-time device permission prompts?
- Welcome notifications?
- Telemetry only?

Mobile currently ignores it.

**Action:** document the intended use case, or remove the field.

### 22. `DeviceDto.isActive` semantics unclear
**Schema:** `DeviceDto.isActive`

`/devices` returns all of the user's registered devices, including those with `isActive: false`. What does "inactive" mean?
- Token revoked / expired?
- User toggled off in preferences (different from `enableNotifications`)?
- Last delivery failed?

Mobile renders inactive devices at lowered opacity, but the user has no way to "reactivate" one.

**Action:** define and document the active/inactive lifecycle, and either expose a "reactivate" endpoint or hide inactive devices.

### 23. `markAsRead` response only returns total unread, not per-template counts
**Schema:** `ReadNotificationsResponseDto`

```json
{ "success": true, "message": "...", "readCount": 3, "unreadCount": 2 }
```

After marking as read, the template chips on screen (`"tagged you in a post · 5"`) stay at their old counts until we refetch `/user-notifications`. The mark-as-read response could include updated per-template counts to save a network round-trip.

**Action:** add `templateUnreadCounts: { templateId: number }` to the response.

---

## Nice to have — feature gaps

### 24. No `GET /user-notifications/{id}` endpoint
There's no way to fetch a single notification by ID. Useful for cold-start deep-linking when the OS hands us a `notificationId` and we want to mark it read + display its content without paginating.

### 25. No "snooze" / "mute" notification controls
Standard pattern in modern apps. The `/me/preferences` endpoint only has *email* toggles (emailPm, emailQuote, etc.) — no equivalent for push, and no per-thread or per-conversation muting.

### 26. No per-template *push* preferences
The current preferences DTO has 18 fields for email notifications:
```
emailPm, emailPmReply, emailPmRead, emailQuote, emailCommentReply,
emailScrapbook, emailSlambook, emailSlambookReply, emailTestimonial,
emailFFNotify, emailFFChapterNotify, emailBadgeAchievement,
emailNewsLetter, emailRecommendation, emailPostTag,
emailDailyWeeklyMonthlyNotifications, emailNewTopicAlert,
emailTopicDailyDigest
```

There's no equivalent set for push, just `PUT /devices/{id}/preferences` with one boolean `enableNotifications` per device.

**Action:** add per-template push prefs to `/me/preferences` so users can turn off "tagged you in a post" pushes while leaving "made you a moderator" on.

### 27. No notification grouping / threading metadata
Both iOS and Android support grouped notifications ("5 new replies from John"). The API doesn't expose grouping data — no `groupKey`, no `threadIdentifier`. Clients have to group locally if at all.

### 28. No bulk read by template or by date range
`POST /user-notifications/read` takes a comma-separated list of `ids`. Empty string marks all. There's no:
- "Mark all read for templateId=23"
- "Mark all read older than X"
- "Mark all read before notificationId N"

### 29. No "delete notification" endpoint
Read notifications stay forever. Some apps allow users to clear history.

### 30. `/inbox-counts` doesn't break out unread *by template*
Returns:
```json
{ "unreadNotifications": 5, "unreadMessages": 0 }
```

Could be more useful as:
```json
{
  "unreadMessages": 0,
  "unreadNotifications": {
    "total": 5,
    "byTemplate": { "23": 4, "37": 1 }
  }
}
```

Would let the bell icon show finer-grained badges per template chip.

### 31. No webhook or pub/sub for push delivery acks
If a push fails to deliver (token invalid, device offline), there's no way for the backend to learn the failure and invalidate the device row. We'd need either:
- A `/devices/{id}/last-delivery-status` field, or
- A push delivery webhook the backend can subscribe to (Expo provides this)

Otherwise dead tokens accumulate.

### 32. No real-time channel for badge updates (WebSocket / SSE / silent push)
The bell badge count is polled — currently every 5 minutes on the client. If a new notification arrives, the badge can lag by up to 5 minutes before showing.

Popular apps use one of:
- WebSocket connection that pushes badge deltas
- Server-Sent Events (SSE) stream
- "Silent" push notifications with `content-available: true` that trigger a background fetch

**Action:** consider adding one of these channels so the badge updates in near-real-time without burning battery on the client.

### 33. No max-devices-per-user limit documented
What happens when a user registers a 10th, 50th, 100th device? Most apps cap at ~10 active devices and prune oldest. We have no spec for this.

**Action:** document the behavior (silent prune oldest, return 4xx, etc.) and surface the cap on the registration response.

### 34. No quiet hours / do-not-disturb in device preferences
`PUT /devices/{id}/preferences` only takes `enableNotifications: boolean`. Modern push consoles support quiet-hours windows ("don't deliver between 22:00 and 07:00 local time").

**Action:** consider extending `UpdateDevicePreferencesRequestDto` with optional `quietHoursStart`/`quietHoursEnd`.

### 35. No per-thread / per-topic mute
A user can disable all PM push notifications, but not mute a specific conversation or specific forum topic. Power-user expectation in 2026.

**Action:** add `POST /messages/thread/{id}/mute` and `POST /forums/topics/{id}/mute` style endpoints, with corresponding fields returned in the relevant DTOs.

### 36. Email vs push deduplication strategy is unclear
If a user has both `emailPm = 1` AND `enableNotifications = true` on their device, do they get both an email AND a push for each PM? Most apps deduplicate (push if device active in last X minutes, email otherwise).

**Action:** document the email vs push routing logic — if there's no deduplication today, consider adding one.

### 37. No notification volume throttling
If a user gets tagged in 50 posts in 5 minutes (e.g., spam attack), the backend sends 50 individual notifications. iOS will collapse them, but Android won't unless you set a group key.

**Action:** consider server-side throttling (collapse N notifications of the same template within Y seconds into one summary).

### 38. Locale / language support for notification messages
The `title` and `message` fields appear to be English-only. No `locale` query parameter on `/user-notifications`. No `Accept-Language` header support documented.

**Action:** confirm if i18n is in scope. If so, document how the user's preferred language is determined.

### 39. `platform: string` accepts any value — no validation
**Schema:** `RegisterDeviceRequestDto.platform`

The OpenAPI spec types this as a plain string. We currently send `"ios"` or `"android"`, but the spec doesn't reject `"banana"`.

**Action:** make `platform` an enum: `"ios" | "android" | "web"` and reject everything else.

### 40. No `deviceId` (vs `deviceTokenId`) — device persistence across re-installs
When the user uninstalls + reinstalls the app, the Expo push token changes. The backend treats the new token as a new device, leaving an orphan in `/devices`. There's no stable per-physical-device identifier (Android: `Settings.Secure.ANDROID_ID`; iOS: `identifierForVendor`) the backend uses to dedupe.

**Action:** consider accepting an optional `installationId` (UUID) in the register request, and dedup on (`userId`, `installationId`) to consolidate stale rows.

### 41. No "mark unread" endpoint (reverse of mark-as-read)
Users sometimes want to flag a notification for later. The API supports mark-read but not mark-unread.

**Action:** add an `unread: boolean` flag to the existing `POST /user-notifications/read` body, or a separate endpoint.

### 42. No audit / activity log for notification interactions
Useful for analytics: which notifications get tapped vs ignored vs marked read manually. Currently we'd have to log this client-side.

**Action:** optional — a `POST /user-notifications/{id}/interaction` endpoint with action types (tapped, dismissed, expanded).

---

## Confirmed working — for reference

These behave correctly and the mobile app uses them as-is:

- `POST /devices/register` — accepts our payload, returns a `deviceTokenId`
- `DELETE /devices/{id}` — silently succeeds on logout
- `PUT /devices/{id}/preferences` — per-device push on/off toggle works
- `GET /devices` — returns the user's registered devices with `enableNotifications`, `lastActiveWhen`, etc.
- `POST /user-notifications/read` — marks ids (or all, with empty string) as read; returns the new unread count
- `GET /user-notifications/inbox-counts` — single endpoint that combines unread messages + notifications counts; mobile uses this for the bell badge

---

## Suggested priority order for backend

**Tier 1 — Ship-blockers (fix before launch)**
1. **Issue 1** (push delivery method confirmation) — until we know whether the backend forwards to Expo Push Service or calls FCM/APNs directly, we can't confirm push delivery works at all.
2. **Issue 2** (unread-count vs list mismatch) — actively wrong number on the badge.
3. **Issues 3, 4, 5** (document `contentTypeId` / `templateId` / push payload contracts) — without these, tapping any notification except "tagged in a post" opens a placeholder alert instead of the linked content.
4. **Issue 6** (`publishedWhen` format) — display correctness across all timestamp surfaces.
5. **Issue 7** (`/user-notifications` query params) — undocumented parameters block any future integration.

**Tier 2 — Fix soon (paper-overs we'd like to remove)**
6. **Issues 8, 9, 14** — strip whitespace from `templateDesc`, document/separate HTML in `message`, standardize `read` type.
7. **Issue 10** — add a `read=0|1` filter so the Unread tab doesn't have to paginate-and-pray.
8. **Issues 11, 12, 17** — clean up nullable/inconsistent request and response types.
9. **Issues 15, 16** — fully type and clarify the user-identity fields.
10. **Issue 23** — return per-template counts in the mark-as-read response.

**Tier 3 — Roadmap (polish + features)**
- Everything 24–42. None block today's feature but each one removes a future ticket.

---

## Total issue count by tier

| Severity | Count | Issues |
|---|---|---|
| Critical | 7 | #1–7 |
| Important | 16 | #8–23 |
| Nice to have | 19 | #24–42 |
| **Total** | **42** | |

If the backend team can deliver Tier 1 (5 issues) within the current sprint, the notifications feature is genuinely production-ready end-to-end. Tier 2 + 3 can be tickets across follow-up sprints.
