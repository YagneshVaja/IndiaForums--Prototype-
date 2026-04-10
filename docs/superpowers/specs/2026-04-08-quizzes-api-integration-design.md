# Quizzes API Integration — Design Spec

**Date:** 2026-04-08
**Author:** Frontend Team
**Status:** Approved

---

## 1. Context

`QuizzesScreen.jsx` currently reads from a hardcoded mock file (`src/data/quizzes.js`). This spec covers replacing all mock data with live API calls, splitting the 573-line monolith into focused files, and adding the submit flow as a new capability.

**Endpoints to wire:**

| # | Endpoint | Method | Purpose |
|---|---|---|---|
| 1 | `/api/v{version}/quizzes` | GET | Quiz listing |
| 2 | `/api/v{version}/quizzes/{quizId}/details` | GET | Quiz questions + metadata |
| 3 | `/api/v{version}/quizzes/{quizId}/players` | GET | Leaderboard |
| 4 | `/api/v{version}/quizzes/creators` | GET | Top creators strip |
| 5 | `/api/v{version}/quizzes/{quizId}/response` | POST | Submit answers |

The axios instance with auth interceptors is in `src/services/api.js` (default export). The API version is set via `API_VERSION = 1` in that file — all routes automatically resolve to `/api/v1/...`.

---

## 2. Decisions

| Topic | Decision | Reason |
|---|---|---|
| Category filtering | Client-side on API-returned field, fallback to "All" | Endpoint has no documented category filter param |
| File structure | Split into `src/screens/quizzes/` | Matches forum refactor in commit `78ef656` |
| Creators section | Include with graceful degradation (hides on error) | Low-cost, matches fan-fictions pattern |
| Submit response | Assumed shape — document & adjust when backend confirms | Shape not in spec |

---

## 3. File Structure

```
src/services/
  quizzesApi.js                      ← NEW

src/hooks/
  useQuizzes.js                      ← NEW (4 data hooks + 1 mutation)

src/screens/quizzes/                 ← NEW folder
  QuizzesScreen.jsx                  ← MOVED + refactored (thin orchestrator)
  QuizzesScreen.module.css           ← MOVED (unchanged)
  QuizDetailSheet.jsx                ← EXTRACTED from QuizzesScreen
  QuizDetailSheet.module.css         ← EXTRACTED styles
  QuizPlayer.jsx                     ← EXTRACTED from QuizzesScreen
  QuizPlayer.module.css              ← EXTRACTED styles
  QuizResult.jsx                     ← NEW (replaces inline finished-state block)
  QuizResult.module.css              ← NEW
  QuizLeaderboard.jsx                ← EXTRACTED leaderboard tab content
  QuizLeaderboard.module.css         ← EXTRACTED styles

src/data/quizzes.js                  ← KEPT (dev seed / fallback, not deleted)
```

`App.jsx` import path updates from `./screens/QuizzesScreen` → `./screens/quizzes/QuizzesScreen`.

---

## 4. Service Layer — `quizzesApi.js`

Follows the `fanFictionsApi.js` pattern exactly: imports default `api`, no transforms, raw axios responses passed to hooks.

```js
getQuizzes({ page = 1, pageSize = 20 } = {})
  → api.get('/quizzes', { params: { page, pageSize } })

getQuizDetails(quizId)
  → api.get(`/quizzes/${quizId}/details`)

getQuizPlayers(quizId, { page = 1, pageSize = 20 } = {})
  → api.get(`/quizzes/${quizId}/players`, { params: { page, pageSize } })

getQuizCreators({ page = 1, pageSize = 20 } = {})
  → api.get('/quizzes/creators', { params: { page, pageSize } })

submitQuizResponse(quizId, answers)
  → api.post(`/quizzes/${quizId}/response`, { answers })
```

---

## 5. Hooks Layer — `useQuizzes.js`

All hooks follow the `useFanFictions.js` pattern: `useState` + `useCallback` + `useEffect`, `extractApiError` from `api.js` for error messages.

### `useQuizzes(params)`
```
returns: { quizzes, pagination, loading, error, loadMore, refresh, params, setParams }
```
- Calls `getQuizzes()`, unwraps list via `unwrapList(data, 'quizzes', 'items')`
- Client-side category filter: if `params.category` is set, filters `quiz.category === params.category` after fetch
- Supports `loadMore` / `refresh` with `loadingRef` guard (no double-fetch)

### `useQuizDetails(quizId)`
```
returns: { quiz, loading, error, refetch }
```
- Skips fetch if `quizId` is falsy
- Unwraps via `unwrapObject(data, 'quiz', 'quizDetails')`
- `quiz.questions` assumed field name for question array (see §7 Assumptions)

### `useQuizPlayers(quizId)`
```
returns: { players, loading, error, refetch }
```
- Skips fetch if `quizId` is falsy
- Unwraps via `unwrapList(data, 'players', 'leaderboard')`

### `useQuizCreators(params)`
```
returns: { creators, loading, error }
```
- Unwraps via `unwrapList(data, 'creators', 'users')`
- Non-blocking: error silently suppressed in QuizzesScreen (strip just doesn't render)

### `useSubmitQuiz()`
```
returns: { submit(quizId, answers), submitting, result, error, reset }
```
- `submit()` calls `submitQuizResponse(quizId, answers)`
- `result` holds server response: `{ score, totalQuestions, rank }` (see §7)
- Does not throw on error — surfaces via `error` state so QuizResult can fall back to local score

---

## 6. Screen Architecture

### `QuizzesScreen.jsx` (orchestrator)

State: `{ activeCat, selectedQuizId, activeQuiz }`

- `useQuizzes({ category: activeCat })` for the quiz list
- `useQuizCreators()` for the creators strip
- Renders: category chips → creators strip (if data) → podium cards → rank cards
- Passes `onPress={quiz => setSelectedQuizId(quiz.id)}` to quiz cards
- Shows `<QuizDetailSheet>` when `selectedQuizId` is set
- Shows `<QuizPlayer>` when `activeQuiz` is set (full quiz object passed in from detail sheet)

Card components (`TopQuizCard`, `PodiumQuizCard`, `RankQuizCard`, `DiffBadge`, `ScoreArc`) stay in `QuizzesScreen.jsx` — they are list UI tightly coupled to this screen.

### `QuizDetailSheet.jsx`

Props: `{ quizId, onClose, onStart }`

- `useQuizDetails(quizId)` — fetches on mount
- Loading state: shows skeleton hero + spinner in body
- Error state: `<ErrorState>` inside the sheet body
- 3 tabs: About / Leaderboard / Comments
  - About: description, info pills (time limit, questions, points, category), tags
  - Leaderboard: `<QuizLeaderboard quizId={quizId} />`
  - Comments: rendered from `quiz.comments` array (if API returns them in detail response; else tab hidden)
- "Start Quiz" CTA calls `onStart(quiz)` passing the full quiz object

### `QuizPlayer.jsx`

Props: `{ quiz, onClose }`

- Local state: `current`, `selected`, `answers`
- Reads questions from `quiz.questions` (from `useQuizDetails` response)
- `useSubmitQuiz()` — calls `submit()` after last answer
- On finish: renders `<QuizResult>` inline (state swap, no new overlay)

### `QuizResult.jsx`

Props: `{ localScore, total, serverResult, quizBg, onClose }`

- Uses `serverResult?.score ?? localScore` for final score
- Shows: score arc, correct/wrong/pct tiles, emoji + label (Brilliant / Good Try / Keep Practising)
- "Done" CTA calls `onClose`

### `QuizLeaderboard.jsx`

Props: `{ quizId }`

- `useQuizPlayers(quizId)` — fetches on mount
- Loading: skeleton rows
- Error: inline "Leaderboard temporarily unavailable" message (matches fan-fiction authors pattern)
- Renders player rows with rank medal, avatar initials, name, score

---

## 7. Assumptions (verify against live API)

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | `GET /quizzes` returns `{ quizzes: [...] }` or `{ data: { quizzes: [...] } }` | `unwrapList` key `'quizzes'` → adjust key in hook |
| A2 | Quiz list items have a `category` or `categoryId` field for client-side filter | Filter silently no-ops → all quizzes shown regardless of tab |
| A3 | `GET /quizzes/{id}/details` returns quiz object with `questions: [{ questionId, questionText, options: [...], correctOptionIndex }]` | QuizPlayer breaks — adjust field names |
| A4 | `POST /quizzes/{id}/response` payload: `{ answers: [{ questionId, selectedOptionIndex }] }` | Adjust payload shape in `submitQuizResponse` |
| A5 | Submit response shape: `{ score, totalQuestions, rank }` | QuizResult falls back to local score if fields absent |
| A6 | `GET /quizzes/{id}/players` returns `{ players: [...] }` | `unwrapList` key `'players'` → adjust |
| A7 | `GET /quizzes/creators` returns `{ creators: [...] }` | `unwrapList` key `'creators'` → adjust |

---

## 8. Error Handling Strategy

Consistent with existing screens:

- List load error → `<ErrorState>` replaces quiz list, with retry button calling `refresh()`
- Detail fetch error → `<ErrorState>` inside sheet body, sheet stays open
- Leaderboard error → inline "temporarily unavailable" text (non-blocking)
- Creators error → strip silently hidden (non-blocking)
- Submit error → `error` shown on QuizResult screen; local score still displayed

Rate-limit (429) check via `isRateLimitError(err)` → render `<RateLimitNotice>` instead of generic error where applicable.

---

## 9. What Is Not In Scope

- Comments tab API wiring (`GET /comments` for quiz content) — rendered from detail response if present, else tab hidden
- Quiz creation / editing
- Quiz search / filtering beyond category tabs
- Pagination on creators strip (show first page only)
- Deep-linking or shareable quiz URLs
