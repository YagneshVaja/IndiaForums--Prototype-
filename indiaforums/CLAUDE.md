# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test runner is configured.

---

## Architecture

**Runtime**: React 19 + Vite 8 (Oxc transform). Pure JavaScript/JSX — no TypeScript. No routing library, no state management library, no UI framework.

**Entry**: `src/main.jsx` → `src/App.jsx`

### Navigation Model

Navigation is state-driven via a `useReducer` hook in [src/hooks/useAppNavigation.js](src/hooks/useAppNavigation.js). There is no React Router. `App.jsx` calls `const nav = useAppNavigation()` and renders screens in a priority order — detail/overlay screens take precedence over tab screens.

```
Overlay/detail screens (NotificationsScreen, WebStoryPlayer, ComposeScreen, …)
  → Drilled detail screens (GalleryDetailScreen, CelebrityDetailScreen,
    VideoDetailScreen, TopicDetailScreen, TagDetailScreen, ProfileScreen,
    fanfiction/* sub-screens, quiz sub-screens, …)
    → Story-type screens (CelebritiesScreen, VideoScreen, FanFictionScreen,
      ShortsScreen, WebStoriesScreen, quizzes/QuizzesScreen, GalleryScreen)
      → ArticleScreen
        → Bottom tab screens (ExploreScreen, NewsScreen, ForumScreen,
          SearchScreen, MySpaceScreen)
```

The reducer in `useAppNavigation` owns all navigation state (~20 fields: `activeTab`, `selectedArticle`, `selectedVideo`, `selectedGallery`, `activeStory`, `selectedTopic`, `selectedCeleb`, `selectedTag`, `drilledForum`, fan-fiction selection set, `selectedWebStory`, `showNotifications`, `composeReply`, `drawerOpen`, …). Read the reducer for the full list before adding a new screen — prefer adding a new action there over a new local `useState` in `App.jsx`.

### Component Structure

```
src/components/
  cards/     — ArticleCard, FeaturedCard, NewsHorizontalCard, NewsVerticalCard, ThreadCard, TopicCard
  layout/    — PhoneShell (iPhone frame wrapper), DynamicIsland, StatusBar, TopNav, BottomNav
  sections/  — PhotoGallerySection, QuizSection, VideoSection, VisualStoriesSection
  strips/    — StoriesStrip, FeaturedCarousel, ChipsRow, CategoryBar, LanguageBar
  ui/        — SectionHeader, CarouselDots, StoryItem
```

All screens live in `src/screens/`. Static seed/fixture data lives in `src/data/`.

### Data Layer

The app talks to a real backend (`api2.indiaforums.com`). Data fetching is split across:

- `src/services/` — axios-backed API wrappers (`api.js`, `searchApi.js`, `webStoriesApi.js`, `fanFictionsApi.js`, `commentsApi.js`)
- `src/hooks/` — query-style hooks (`useApiQuery`, `useWebStories`, `useFanFictions`)
- `src/contexts/` — cross-screen providers
- `src/components/ui/RateLimitNotice` — surfaces 429s; respect rate limits when adding new fetches

### Styling

- CSS Modules (`.module.css`) per component for scoped styles
- Design tokens in `src/styles/tokens.css` — always import this for brand colors, spacing, and typography
- `src/styles/global.css` — app-wide resets and base styles
- Brand blue: `#3558F0`, background: `#F5F6F7`, text: `#1A1A1A`
- Design references Indian news apps (TOI, HT, Inshorts, Google News)

### Project Context

This is a **web prototype** that renders inside a `PhoneShell` component mimicking an iPhone. It is a community + entertainment platform combining news, forums, fan fiction, galleries, videos, quizzes, and celebrity content. Some screens still use static data in `src/data/`; newer screens hit the live backend via `src/services/`.

---

## Global UI/UX Consistency Rules

These rules are **mandatory** for every screen, component, and feature in this project. They are not suggestions — they define the design system and must be followed without exception.

### 1. Single Design System

The entire application must follow one consistent design system. Do not introduce new visual patterns, color schemes, font sizes, or spacing values that do not exist in `src/styles/tokens.css` or already-established screens.

Before writing any new UI code, always check `src/styles/tokens.css` for the correct token to use.

### 2. Analyze Before Creating

Before creating any new component or UI pattern, always:

1. Read the existing screens in `src/screens/` to understand the established layout and patterns.
2. Browse `src/components/` to find a reusable component that already solves the problem.
3. Only create a new component if no existing one can serve the purpose. When in doubt, extend an existing component rather than build a new one.

### 3. Standard Screen Layout

Every screen must follow this exact three-layer layout:

```
┌─────────────────────┐
│       TopNav        │  ← always fixed at top
├─────────────────────┤
│                     │
│  Scrollable Content │  ← main content area, vertically scrollable
│                     │
├─────────────────────┤
│      BottomNav      │  ← always fixed at bottom
└─────────────────────┘
```

- `TopNav` is always rendered at the top of every screen.
- `BottomNav` is always rendered at the bottom of every screen.
- Content between them is a scrollable area. Never skip this structure.

### 4. Standard Content Section Pattern

Every content section inside a screen must follow this pattern:

```
SectionHeader  (title + optional "See All" / action link)
  └── Horizontal scroll row  OR  vertical card list
```

- Use `SectionHeader` from `src/components/ui/` for every section title. Do not use raw `<h2>`, `<h3>`, or plain text headings for section labels.
- Horizontal content uses a single-row scroll strip (e.g. `StoriesStrip`, `ChipsRow`, `FeaturedCarousel`).
- Vertical content uses stacked cards from the card library.

### 5. Component Library — Reuse First

Always prefer these existing components over custom HTML or new components:

| Purpose | Component |
|---|---|
| Standard article preview | `ArticleCard` |
| Hero / featured story | `FeaturedCard` |
| Horizontal news item | `NewsHorizontalCard` |
| Vertical news item | `NewsVerticalCard` |
| Forum thread preview | `ThreadCard` |
| Topic/tag pill | `TopicCard` |
| Section heading + action | `SectionHeader` |
| Story avatar in strip | `StoryItem` |
| Full-width hero carousel | `FeaturedCarousel` |
| Stories avatar strip | `StoriesStrip` |
| Horizontal filter chips | `ChipsRow` |
| Category tab bar | `CategoryBar` |
| Language selector strip | `LanguageBar` |

Never recreate these with raw JSX when the component already exists.

### 6. Design Tokens — Always Use Tokens

All colors, spacing, border-radius, font sizes, and shadows must use CSS variables from `src/styles/tokens.css`.

**Core brand values:**

| Token | Value | Use for |
|---|---|---|
| `--color-primary` | `#3558F0` | Primary actions, active states, links |
| `--color-background` | `#F5F6F7` | Screen and section backgrounds |
| `--color-text` | `#1A1A1A` | Primary body text |

Never hardcode hex values, pixel values for spacing, or font sizes that are already defined as tokens. If a token does not exist for a value you need, add it to `tokens.css` first rather than hardcoding it inline.

### 7. Indian News App Design Reference

The UI must follow the visual language of modern Indian news and community apps:

- **Times of India** — dense content hierarchy, category tabs, red/blue accent system
- **Hindustan Times** — card-based layout, strong typography hierarchy
- **Google News** — clean grouped feed, topic clusters, horizontal story strips
- **Inshorts** — bold cards, minimal text, strong imagery

Apply these principles:
- Content density is high — pack meaningful content into each screen without feeling cluttered.
- Cards always have a thumbnail image, headline, and metadata (source, time, category).
- Typography hierarchy is clear: headline > subheadline > meta text > label.
- Category/filter tabs appear near the top of content-heavy screens.
- Story strips and carousels are used to break vertical scroll monotony.

### 8. PhoneShell — Always Required

The entire application renders inside the `PhoneShell` component from `src/components/layout/PhoneShell`. This component simulates an iPhone frame in the browser.

- Never render screens outside of `PhoneShell`.
- All layout decisions (widths, safe areas, scroll behavior) must account for the phone shell's constrained viewport — treat it like a real 390px-wide mobile screen.
- Do not use viewport units (`100vw`, `100vh`) inside screens. Use the shell's inner content dimensions.

### 9. Prohibited Patterns

Never introduce any of the following:

| Prohibited | Reason |
|---|---|
| React Router or any routing library | Navigation is state-driven in `App.jsx` |
| Redux, Zustand, Jotai, or any state library | State is local `useState` only |
| Tailwind, MUI, Chakra, Ant Design, or any UI framework | CSS Modules + tokens only |
| TypeScript or `.ts`/`.tsx` files | Project is pure JavaScript/JSX |
| Hardcoded hex colors or pixel values | Use design tokens |
| Raw heading tags (`<h2>`, `<h3>`) as section titles | Use `SectionHeader` component |
| `100vw` / `100vh` inside screen components | Use shell-relative sizing |
| New navigation state without extending `useAppNavigation` | All nav state lives in [src/hooks/useAppNavigation.js](src/hooks/useAppNavigation.js) |

### 10. Workflow for New Screens and Components

Follow this exact workflow whenever creating a new screen or component:

1. **Read existing screens** — open 2–3 screens from `src/screens/` that are closest to what you are building. Note their layout, component usage, and CSS class patterns.
2. **Check the component library** — scan `src/components/` for anything reusable.
3. **Check tokens** — open `src/styles/tokens.css` and identify the tokens you will use.
4. **Replicate the layout structure** — TopNav → scrollable content → BottomNav.
5. **Use section pattern** — `SectionHeader` + card list or scroll strip for every content section.
6. **Use existing cards** — pick the right card component from the library table above.
7. **Write CSS in a new `.module.css` file** — scoped to the component, using only token variables.
8. **Add mock data in `src/data/`** — follow the structure of existing data files.
9. **Wire navigation in `App.jsx`** — add new state if needed, following the existing conditional render pattern.

The goal is that every new screen feels like it was designed and built alongside the existing ones — not like it came from a different project.
