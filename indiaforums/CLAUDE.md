# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

No test runner is configured.

## Architecture

**Runtime**: React 19 + Vite 8 (Oxc transform). Pure JavaScript/JSX — no TypeScript. No routing library, no state management library, no UI framework.

**Entry**: `src/main.jsx` → `src/App.jsx`

### Navigation Model

Navigation is entirely state-driven in `App.jsx` using `useState`. There is no React Router. The render tree uses a priority-based conditional rendering pattern:

```
GalleryDetailScreen (highest priority)
  → GalleryScreen
    → Story screens (CelebritiesScreen | VideoScreen | FanFictionScreen | QuizzesScreen)
      → ArticleScreen
        → Bottom tab screens (ExploreScreen | NewsScreen | ForumScreen | SearchScreen | MySpaceScreen)
```

State variables controlling navigation:
- `activeTab` — which bottom nav tab is selected
- `selectedArticle` — triggers ArticleScreen detail view
- `showGalleries` / `selectedGallery` — gallery listing and detail views
- `activeStory` — which story-type screen to show (`'celebrities'`, `'videos'`, `'fanFictions'`, `'quizzes'`, `'galleries'`)

### Component Structure

```
src/components/
  cards/     — ArticleCard, FeaturedCard, NewsHorizontalCard, NewsVerticalCard, ThreadCard, TopicCard
  layout/    — PhoneShell (iPhone frame wrapper), DynamicIsland, StatusBar, TopNav, BottomNav
  sections/  — PhotoGallerySection, QuizSection, VideoSection, VisualStoriesSection
  strips/    — StoriesStrip, FeaturedCarousel, ChipsRow, CategoryBar, LanguageBar
  ui/        — SectionHeader, CarouselDots, StoryItem
```

All screens live in `src/screens/`. All mock data lives in `src/data/` (no backend — everything is static JS objects).

### Styling

- CSS Modules (`.module.css`) per component for scoped styles
- Design tokens in `src/styles/tokens.css` — import this for brand colors/spacing
- `src/styles/global.css` — app-wide resets and base styles
- Brand blue: `#3558F0`, background: `#F5F6F7`, text: `#1A1A1A`
- Design references Indian news apps (TOI, HT, Inshorts, Google News)

### Project Context

This is a **web prototype** that renders inside a `PhoneShell` component mimicking an iPhone. It is a community + entertainment platform combining news, forums, fan fiction, galleries, videos, quizzes, and celebrity content. All data is mocked — no API calls, no persistence.
