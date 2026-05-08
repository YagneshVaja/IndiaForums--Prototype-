# Backend Issue — Quiz question & option media is empty for every quiz

**Date:** 2026-05-07
**Reported by:** Mobile team
**Endpoint:** `GET /api/v1/quizzes/{quizId}/details`
**Severity:** UX gap — mobile player & web rich-media render path show only text

---

## Summary

The mobile quiz player ([`QuizPlayerScreen.tsx`](../mobile/src/features/quizzes/screens/QuizPlayerScreen.tsx))
already renders question images, option-image grids, inline option thumbnails,
and reveal-panel images. None of it surfaces in production because the
`/quizzes/{id}/details` response returns `null` for **every** image field on
**every** question and **every** option, across **every** quiz currently in the
database.

We need the backend to start populating these fields (or set
`hasThumbnail: true` and host the assets at a deterministic CDN path the
mobile app can build the URL from).

---

## Evidence

Sampled 9 published quizzes (#23, 24, 25, 26, 30, 31, 32, 33, 34, 36) on
**2026-05-07**. Across **88 questions** and **381 options**, the result is the
same for every single record:

```json
{
  "imageUrl":      null,
  "thumbnailUrl":  null,
  "hasThumbnail":  false,
  "mediaId":       0,
  "imageCredits":  null
}
```

Quiz-level cover thumbnails *are* populated correctly
(e.g. `https://img.indiaforums.com/quiz/320x240/0/024.webp?c=6rI9F4`) — only
question/option media is missing.

---

## Fields the mobile app reads

The mobile transformer in
[`mobile/src/services/api.ts`](../mobile/src/services/api.ts) (around L4910–L4925)
checks several casings for each field. The backend only needs to populate
**one** consistent name; the listed alternates are fallbacks the mobile app
already accepts.

### Per question (in `quiz_questions[]`)

| Mobile reads | Renders |
|---|---|
| `questionImageUrl` / `QuestionImageUrl` / `imageUrl` / `ImageUrl` / `gifUrl` / `GifUrl` | Question hero image (16:9, sits above options) |
| `questionImageCredits.{provider\|uploader\|uploaderName\|source}` | "via Giphy / Pexels" credit overlay |
| `revealImageUrl` / `revealThumbnailUrl` | Reveal-panel image shown after answer |
| `revealTitle`, `revealDescription` | Reveal-panel text |

### Per option (in `quiz_questions[*].options[]` or top-level `options[]`)

| Mobile reads | Renders |
|---|---|
| `thumbnailUrl` / `ThumbnailUrl` / `imageUrl` / `ImageUrl` | Option image — used in two layouts (see below) |
| `imageCredits` / `ImageCredits` / `uploaderName` | Per-option credit (currently consumed but not yet shown) |

**Option layout selection (already implemented client-side):**
- If **all** four options have an image AND there are ≤4 options AND the quiz
  is trivia → render as a 2-column **image grid** (image-on-top cards).
- If **some** options have an image → inline 52×52 thumbnail beside the option
  text on each row.
- If **no** options have images → text-only rows (current production state).

So all the backend has to do to enable the rich grid view is populate
`thumbnailUrl` (or `imageUrl`) on the options.

---

## URL pattern (preferred — saves payload)

The cleanest fix is the same approach the backend uses for forum avatars and
the quiz cover: ship `hasThumbnail: true` + `updateChecksum`, and let the
client build the CDN URL.

The cover-thumbnail pattern, observed today:

```
https://img.indiaforums.com/quiz/320x240/0/{paddedQuizId-3-digits}.webp?c={updateChecksum}
```

If the backend can publish the analogous paths for question / option assets
(e.g. `/quizquestion/...` and `/quizoption/...` with a documented padding
rule), the mobile transformer will add the URL builder and stop relying on
`imageUrl`/`thumbnailUrl` being inlined.

If a deterministic path is not on the table, **inlining the absolute URL** as
the `imageUrl` / `thumbnailUrl` field is fully supported and will Just Work.

---

## Acceptance criteria

- [ ] At least one quiz exists where every option of at least one question has
  a non-null `imageUrl` (or `thumbnailUrl`) — confirms the grid-image layout
  renders end-to-end.
- [ ] At least one quiz exists where the question itself has a non-null
  `imageUrl` — confirms the question-hero image renders.
- [ ] At least one personality quiz has populated `revealImageUrl` /
  `revealTitle` / `revealDescription` — confirms the reveal panel.
- [ ] If the deterministic-URL approach is chosen: a short note documenting
  the CDN path scheme (segment name, size buckets, padding rule, checksum
  field) so the mobile transformer can be updated in one commit.

No mobile-side code changes are required to render any of the above; the
player picks them up automatically once the response shape contains them.

---

## Reproduction (so the backend team can verify the fix on their end)

```bash
curl -s https://api2.indiaforums.com/api/v1/quizzes/24/details \
  | jq '.data | { questions_with_image: (.questions  | map(select(.imageUrl    != null)) | length),
                  options_with_image:   (.options    | map(select(.imageUrl    != null)) | length),
                  questions_with_thumb: (.questions  | map(select(.thumbnailUrl != null)) | length),
                  options_with_thumb:   (.options    | map(select(.thumbnailUrl != null)) | length) }'
```

A successful fix turns at least one of those counters above zero.

---

# Addendum — Profile photos missing on creator & player APIs

**Endpoints:**
- `GET /api/v1/quizzes/creators`
- `GET /api/v1/quizzes/{quizId}/players`

## Problem

These endpoints return enough data to *identify* a user (`userId`,
`updateChecksum`, `realName`, `userName`, `privacy`) but **not enough to
display their avatar**. Specifically, they're missing the `avatarType` (or
`thumbnailUrl`) field that the rest of the API uses to indicate whether a
user has uploaded a profile photo.

Without `avatarType`, we cannot safely construct the CDN avatar URL —
guessing leads to 404s for the majority of users who never uploaded a photo.
Today the mobile app shows the gradient + initials fallback for every user,
even those with photos.

## Sample (2026-05-07)

`/quizzes/creators` returns:

```json
{
  "createdBy": 3,
  "quizCount": 25,
  "userId": 3,
  "userName": "vijay",
  "updateChecksum": "7iXCF3",
  "realName": "Vijay Bhatter",
  "privacy": 0,
  "lastVisitedDate": "2026-04-10T19:53:44.64"
}
```

`/quizzes/{id}/players` returns:

```json
{
  "totalScore": 15,
  "userId": 283357,
  "userName": "",
  "updateChecksum": null,
  "realName": "BIDESH",
  "privacy": 1,
  "lastVisitedDate": "2025-07-04T11:07:41.523",
  "totalRank": 1
}
```

Compare with the `/me` response and the `ThreadLikeDto` used in forums, both
of which return `avatarType` and let the client decide whether to render an
image or initials.

## Fields the mobile app reads (in priority order)

1. **`thumbnailUrl`** — absolute URL to the photo. If present, used directly.
2. **`avatarType`** + **`updateChecksum`** + **`userId`** — used to build:

   ```
   https://img.indiaforums.com/member/100x100/{Math.floor(userId / 10000)}/{userId}.webp?uc={updateChecksum}
   ```

   Only built when `avatarType > 0`. (`avatarType === 0` means "no photo —
   render initials".)

The frontend prefers (1); (2) is the existing fallback used by other
features. **At least one** of these needs to ship on each user record.

## Acceptance criteria

- [ ] `/quizzes/creators` returns `avatarType` (or `thumbnailUrl`) for every
  creator.
- [ ] `/quizzes/{id}/players` returns `avatarType` (or `thumbnailUrl`) for
  every player.
- [ ] At least one returned creator and one returned player has a non-zero
  `avatarType` so we can verify the image renders end-to-end.

No mobile-side changes required — the transformers + `MemberAvatar`
component (added 2026-05-07) already consume both shapes and gracefully fall
back to initials when neither is present.

