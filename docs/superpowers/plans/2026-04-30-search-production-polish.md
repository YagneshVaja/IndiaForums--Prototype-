# Search Tab — Production Polish Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the Search tab to a production-feel experience by adding sectioned typeahead with a top-result spotlight, bold matched-prefix highlighting, entity-aware result-card metadata, a results-count context line, skeleton loading states, a smart browse-tile empty state, and a debounced suggest pipeline.

**Architecture:** Pure utility functions for grouping + metadata, a small `HighlightedText` primitive used everywhere, a handful of new presentational components composed inside the existing two screens. The store gains a debounce timer for `/suggest` and a separate `isPullRefreshing` flag so filter-tap loads don't trigger pull-to-refresh chrome.

**Tech Stack:** React Native, Expo, TypeScript, Zustand, `@shopify/flash-list`. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-04-30-search-production-polish.md](../specs/2026-04-30-search-production-polish.md)

**Verification model:** `cd mobile && npm run tsc` after each task. `npm run lint` is broken repo-wide. Manual smoke test in the final task.

---

## File map

**New:**
- `mobile/src/features/search/utils/entityMetadata.ts` — `entityMetadataLine(entityType, summary?) → string`.
- `mobile/src/features/search/utils/groupSuggestions.ts` — group suggestions by entityType in fixed order.
- `mobile/src/features/search/components/HighlightedText.tsx` — render text with case-insensitive matched substring bolded.
- `mobile/src/features/search/components/SuggestionSkeleton.tsx` — placeholder typeahead row.
- `mobile/src/features/search/components/ResultCardSkeleton.tsx` — placeholder result card.
- `mobile/src/features/search/components/SuggestionSection.tsx` — UPPERCASE section header.
- `mobile/src/features/search/components/SuggestionSpotlight.tsx` — hero "Top result" card.
- `mobile/src/features/search/components/ResultsContextLine.tsx` — count + active filter strip.
- `mobile/src/features/search/components/BrowseTile.tsx` — category tile for the empty state.

**Modified:**
- `mobile/src/store/searchStore.ts` — debounce on `setQuery`; add `isPullRefreshing`.
- `mobile/src/features/search/components/SuggestionRow.tsx` — use `HighlightedText`, add metadata line.
- `mobile/src/features/search/components/ResultCard.tsx` — use `HighlightedText` on title, add metadata line.
- `mobile/src/features/search/screens/SearchMainScreen.tsx` — sectioned dropdown + spotlight + skeletons + browse tiles.
- `mobile/src/features/search/screens/SearchResultsScreen.tsx` — context line + skeletons + filter polish.

---

## Task 1: Pure utilities (`entityMetadata`, `groupSuggestions`)

**Files:**
- Create: `mobile/src/features/search/utils/entityMetadata.ts`
- Create: `mobile/src/features/search/utils/groupSuggestions.ts`

Both files are pure functions — no React, no store, no styles. Easy to reason about and consume from any component.

- [ ] **Step 1: Create `mobile/src/features/search/utils/entityMetadata.ts`:**

```ts
/**
 * Returns the secondary metadata line shown under a search title.
 * No backend calls — only uses the entityType + the optional summary text
 * already on the search payload.
 */
export function entityMetadataLine(
  entityType: string | null | undefined,
  summary?: string | null,
): string {
  const t = (entityType ?? '').toLowerCase();
  const yearMatch = summary ? /(19|20)\d{2}/.exec(summary) : null;
  const year = yearMatch ? yearMatch[0] : null;

  switch (t) {
    case 'movie':
      return year ? `Movie · ${year}` : 'Movie';
    case 'show':
      return year ? `TV Show · ${year}` : 'TV Show';
    case 'person':
      return 'Celebrity';
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'gallery':
      return 'Photo Gallery';
    case 'topic':
      return 'Forum Topic';
    case 'forum':
      return 'Forum';
    default:
      return entityType ?? '';
  }
}
```

- [ ] **Step 2: Create `mobile/src/features/search/utils/groupSuggestions.ts`:**

```ts
import type { SuggestItemDto } from '../../../services/searchApi';

const ORDER = [
  'Person',
  'Movie',
  'Show',
  'Topic',
  'Forum',
  'Article',
  'Video',
  'Gallery',
];

export interface SuggestionGroup {
  entityType: string;
  items: SuggestItemDto[];
}

/**
 * Groups suggestions by entityType in a fixed order. Buckets containing zero
 * items are dropped. Within a bucket, the original order (weight) is preserved.
 * Items with a null entityType go into a final "Other" bucket.
 */
export function groupSuggestions(items: SuggestItemDto[]): SuggestionGroup[] {
  const buckets = new Map<string, SuggestItemDto[]>();
  for (const item of items) {
    const key = item.entityType ?? 'Other';
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const groups: SuggestionGroup[] = [];
  for (const t of ORDER) {
    const items = buckets.get(t);
    if (items && items.length > 0) groups.push({ entityType: t, items });
    buckets.delete(t);
  }
  // Anything left over (unknown entityType, "Other") trails alphabetically.
  const leftover = Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  for (const [entityType, items] of leftover) {
    groups.push({ entityType, items });
  }
  return groups;
}
```

- [ ] **Step 3: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 4: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/utils/entityMetadata.ts mobile/src/features/search/utils/groupSuggestions.ts
```

Suggested commit message: `feat(mobile): add entityMetadata + groupSuggestions utils for search`.

---

## Task 2: `HighlightedText` component

**Files:**
- Create: `mobile/src/features/search/components/HighlightedText.tsx`

Renders text with the matched substring bolded. Case-insensitive match, source casing preserved.

- [ ] **Step 1: Create the file:**

```tsx
import React, { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

interface Props {
  text: string;
  match: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Renders `text` with the substring matching `match` (case-insensitive)
 * rendered in `highlightStyle`. Source casing of `text` is preserved.
 *
 * If `match` is empty or not found, renders `text` plainly.
 */
export default function HighlightedText({
  text,
  match,
  style,
  highlightStyle,
  numberOfLines,
}: Props) {
  const segments = useMemo(() => splitOnMatch(text, match), [text, match]);

  if (segments.length === 1 && !segments[0].matched) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((seg, i) => (
        <Text key={i} style={seg.matched ? highlightStyle : undefined}>
          {seg.value}
        </Text>
      ))}
    </Text>
  );
}

interface Segment { value: string; matched: boolean; }

function splitOnMatch(text: string, match: string): Segment[] {
  const trimmed = match.trim();
  if (!trimmed) return [{ value: text, matched: false }];

  const lower = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const segments: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      segments.push({ value: text.slice(i), matched: false });
      break;
    }
    if (idx > i) segments.push({ value: text.slice(i, idx), matched: false });
    segments.push({ value: text.slice(idx, idx + needle.length), matched: true });
    i = idx + needle.length;
  }
  return segments;
}
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 3: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/components/HighlightedText.tsx
```

Suggested commit message: `feat(mobile): add HighlightedText component for matched-prefix bolding`.

---

## Task 3: Skeleton components

**Files:**
- Create: `mobile/src/features/search/components/SuggestionSkeleton.tsx`
- Create: `mobile/src/features/search/components/ResultCardSkeleton.tsx`

Two pure-View placeholders that match the dimensions of their real counterparts. Used while requests are in flight and there's no prior data.

- [ ] **Step 1: Create `SuggestionSkeleton.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export default function SuggestionSkeleton() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.thumb} />
      <View style={styles.body}>
        <View style={styles.linePrimary} />
        <View style={styles.lineSecondary} />
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    thumb: {
      width: 36, height: 36, borderRadius: 8,
      backgroundColor: c.surface,
    },
    body: { flex: 1, gap: 6 },
    linePrimary: { height: 12, width: '60%', borderRadius: 4, backgroundColor: c.surface },
    lineSecondary: { height: 10, width: '35%', borderRadius: 4, backgroundColor: c.surface },
  });
}
```

- [ ] **Step 2: Create `ResultCardSkeleton.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

export default function ResultCardSkeleton() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.card}>
      <View style={styles.thumb} />
      <View style={styles.body}>
        <View style={styles.pill} />
        <View style={styles.lineTitle} />
        <View style={styles.lineSummary} />
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: {
      width: 92, height: 70, borderRadius: 8,
      backgroundColor: c.surface,
    },
    body: { flex: 1, gap: 6 },
    pill: { width: 60, height: 14, borderRadius: 6, backgroundColor: c.surface },
    lineTitle: { width: '85%', height: 14, borderRadius: 4, backgroundColor: c.surface },
    lineSummary: { width: '60%', height: 10, borderRadius: 4, backgroundColor: c.surface },
  });
}
```

- [ ] **Step 3: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 4: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/components/SuggestionSkeleton.tsx mobile/src/features/search/components/ResultCardSkeleton.tsx
```

Suggested commit message: `feat(mobile): add skeleton placeholders for suggestion + result loading`.

---

## Task 4: Update `SuggestionRow` and `ResultCard` for highlight + metadata

**Files:**
- Modify: `mobile/src/features/search/components/SuggestionRow.tsx`
- Modify: `mobile/src/features/search/components/ResultCard.tsx`

Add the `query` prop so each row knows what to highlight. Replace the title `Text` with `HighlightedText`. Add a metadata line under the title using `entityMetadataLine`.

- [ ] **Step 1: Replace `SuggestionRow.tsx` content with:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SuggestItemDto;
  query: string;
  onPress: () => void;
}

export default function SuggestionRow({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = entityMetadataLine(item.entityType);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.phrase}`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="search" size={14} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <HighlightedText
          text={item.phrase}
          match={query}
          style={styles.phrase}
          highlightStyle={styles.phraseMatch}
          numberOfLines={1}
        />
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <Ionicons
        name="arrow-up-outline"
        size={16}
        color={colors.textTertiary}
        style={{ transform: [{ rotate: '-45deg' }] }}
      />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowPressed: { backgroundColor: c.surface },
    thumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    phrase: { color: c.text, fontSize: 14, fontWeight: '500' },
    phraseMatch: { fontWeight: '800', color: c.text },
    meta: { fontSize: 11, color: c.textSecondary },
  });
}
```

- [ ] **Step 2: Replace `ResultCard.tsx` content with:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SearchResultItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SearchResultItemDto;
  query: string;
  onPress: () => void;
}

export default function ResultCard({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = entityMetadataLine(item.entityType, item.summary);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.entityType}: ${item.title}`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        <HighlightedText
          text={item.title}
          match={query}
          style={styles.title}
          highlightStyle={styles.titleMatch}
          numberOfLines={2}
        />
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: { width: 92, height: 70, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    meta: { fontSize: 11, fontWeight: '700', color: c.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    titleMatch: { fontWeight: '800', color: c.text },
    summary: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
}
```

- [ ] **Step 3: Verify type-check.** (Both screens that consume these components currently call them without `query` — this will produce two type errors. We fix them in Tasks 7 and 8. For now, pass an empty string to the call sites by editing the screens minimally:)

Edit `mobile/src/features/search/screens/SearchMainScreen.tsx`. Find the `<SuggestionRow item={item} onPress={...} />` line and change to:

```tsx
<SuggestionRow item={item} query={query} onPress={() => openSuggestion(item)} />
```

Edit `mobile/src/features/search/screens/SearchResultsScreen.tsx`. Find the `<ResultCard item={item} onPress={...} />` line and change to:

```tsx
<ResultCard item={item} query={submittedQuery} onPress={() => onPressItem(item, searchLogId)} />
```

- [ ] **Step 4: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 5: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/components/SuggestionRow.tsx mobile/src/features/search/components/ResultCard.tsx mobile/src/features/search/screens/SearchMainScreen.tsx mobile/src/features/search/screens/SearchResultsScreen.tsx
```

Suggested commit message: `feat(mobile): highlighted prefix + entity metadata on search rows`.

---

## Task 5: Section header, spotlight card, results context line, browse tile

**Files:**
- Create: `mobile/src/features/search/components/SuggestionSection.tsx`
- Create: `mobile/src/features/search/components/SuggestionSpotlight.tsx`
- Create: `mobile/src/features/search/components/ResultsContextLine.tsx`
- Create: `mobile/src/features/search/components/BrowseTile.tsx`

Four small presentational components used by the screens in Tasks 7 and 8.

- [ ] **Step 1: Create `SuggestionSection.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { entityMetadataLine } from '../utils/entityMetadata';

interface Props { entityType: string; }

export default function SuggestionSection({ entityType }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{entityMetadataLine(entityType).toUpperCase()}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 4,
      backgroundColor: c.bg,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.8,
    },
  });
}
```

- [ ] **Step 2: Create `SuggestionSpotlight.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SuggestItemDto;
  query: string;
  onPress: () => void;
}

export default function SuggestionSpotlight({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = entityMetadataLine(item.entityType);
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>TOP RESULT</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open top result ${item.phrase}`}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="image-outline" size={24} color={colors.textTertiary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          <HighlightedText
            text={item.phrase}
            match={query}
            style={styles.phrase}
            highlightStyle={styles.phraseMatch}
            numberOfLines={2}
          />
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    kicker: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
      marginBottom: 6,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.85 },
    thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: c.bg },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    meta: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 0.5 },
    phrase: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 21 },
    phraseMatch: { fontWeight: '900', color: c.text },
  });
}
```

- [ ] **Step 3: Create `ResultsContextLine.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { entityMetadataLine } from '../utils/entityMetadata';

interface Props {
  count: number;
  query: string;
  activeEntityType: string | null;
}

export default function ResultsContextLine({ count, query, activeEntityType }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const noun = activeEntityType
    ? pluralize(entityMetadataLine(activeEntityType), count)
    : `result${count === 1 ? '' : 's'}`;
  return (
    <View style={styles.row}>
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.bold}>{count} {noun}</Text> for "<Text style={styles.bold}>{query}</Text>"
      </Text>
    </View>
  );
}

function pluralize(label: string, n: number): string {
  if (n === 1) return label;
  // "Movie" -> "Movies", "TV Show" -> "TV Shows", "Forum Topic" -> "Forum Topics".
  return label + 's';
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.bg,
    },
    text: { fontSize: 12, color: c.textSecondary },
    bold: { fontWeight: '700', color: c.text },
  });
}
```

- [ ] **Step 4: Create `BrowseTile.tsx`:**

```tsx
import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  label: string;
  icon: IoniconName;
  onPress: () => void;
}

export default function BrowseTile({ label, icon, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${label}`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tilePressed: { opacity: 0.7 },
    iconWrap: {
      width: 32, height: 32, borderRadius: 999,
      backgroundColor: c.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    },
    label: { fontSize: 13, fontWeight: '600', color: c.text },
  });
}
```

- [ ] **Step 5: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 6: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/components/SuggestionSection.tsx mobile/src/features/search/components/SuggestionSpotlight.tsx mobile/src/features/search/components/ResultsContextLine.tsx mobile/src/features/search/components/BrowseTile.tsx
```

Suggested commit message: `feat(mobile): add SuggestionSection, Spotlight, ResultsContextLine, BrowseTile`.

---

## Task 6: Store updates — debounce + `isPullRefreshing`

**Files:**
- Modify: `mobile/src/store/searchStore.ts`

Add a 200ms debounce inside `setQuery` before invoking `fetchSuggestions`. Add a separate `isPullRefreshing` boolean and an action that runs `refreshResults` while toggling it. The `RefreshControl` on the results screen will only show when `isPullRefreshing === true`.

- [ ] **Step 1: Find the `interface SearchState` block and add two declarations.** Locate:

```ts
interface SearchState {
  query: string;
  submittedQuery: string;
  ...
  recents: RecentSearch[];

  // Actions
  setQuery: (q: string) => void;
```

Add after `recents`:

```ts
  isPullRefreshing: boolean;
```

Add after the existing actions block (after `clearRecents`):

```ts
  pullToRefresh: () => Promise<void>;
```

- [ ] **Step 2: Find the module-level `let suggestController` declarations and add a debounce timer:**

```ts
let suggestController: AbortController | null = null;
let resultsController: AbortController | null = null;
let suggestDebounce: ReturnType<typeof setTimeout> | null = null;
```

- [ ] **Step 3: Update `setQuery` to debounce.** Find:

```ts
  setQuery: (q) => {
    set({ query: q });
    if (q.trim().length < 2) {
      // Cancel any in-flight suggest, blank the dropdown.
      suggestController?.abort();
      suggestController = null;
      set({ suggestions: [], suggestStatus: 'idle' });
      return;
    }
    void get().fetchSuggestions(q);
  },
```

Replace with:

```ts
  setQuery: (q) => {
    set({ query: q });
    if (suggestDebounce) clearTimeout(suggestDebounce);
    if (q.trim().length < 2) {
      suggestController?.abort();
      suggestController = null;
      set({ suggestions: [], suggestStatus: 'idle' });
      return;
    }
    // Show loading immediately so the skeleton renders even while we wait
    // for the debounce window. The actual fetch is delayed by 200ms.
    set({ suggestStatus: 'loading' });
    suggestDebounce = setTimeout(() => {
      void get().fetchSuggestions(q);
    }, 200);
  },
```

- [ ] **Step 4: Add `isPullRefreshing: false` to the store's initial state.** Find:

```ts
  recents: readRecents(),
```

Add immediately after:

```ts
  isPullRefreshing: false,
```

- [ ] **Step 5: Add the `pullToRefresh` action at the end of the store actions list (after `clearRecents`):**

```ts
  pullToRefresh: async () => {
    set({ isPullRefreshing: true });
    try {
      await get().refreshResults();
    } finally {
      set({ isPullRefreshing: false });
    }
  },
```

- [ ] **Step 6: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 7: Stage but do NOT commit.**

```bash
git add mobile/src/store/searchStore.ts
```

Suggested commit message: `feat(mobile): debounce suggest 200ms; add isPullRefreshing flag`.

---

## Task 7: `SearchMainScreen` — sectioned dropdown, spotlight, skeletons, browse tiles

**Files:**
- Modify: `mobile/src/features/search/screens/SearchMainScreen.tsx` (replace whole file)

Three render branches:
1. `query.trim().length < 2 && recents.length === 0` → 6 browse tiles in a 2x3 grid + the heading text.
2. `query.trim().length < 2 && recents.length > 0` → recents list with header + Clear (existing behavior).
3. `query.trim().length >= 2`:
   - If `suggestStatus === 'loading' && suggestions.length === 0` → 5 `SuggestionSkeleton` rows + the "Search for '{q}'" footer.
   - Else if `suggestions.length > 0` → spotlight (first item) + sectioned list of remaining items + footer.
   - Else (zero suggestions, not loading) → fall through to recents + footer (existing behavior).

- [ ] **Step 1: Replace the entire file with:**

```tsx
import React, { useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';

import SearchInputHeader from '../components/SearchInputHeader';
import SuggestionRow from '../components/SuggestionRow';
import RecentRow from '../components/RecentRow';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import SuggestionSection from '../components/SuggestionSection';
import SuggestionSpotlight from '../components/SuggestionSpotlight';
import SuggestionSkeleton from '../components/SuggestionSkeleton';
import BrowseTile from '../components/BrowseTile';
import { useEntityNavigator } from '../hooks/useEntityNavigator';
import { groupSuggestions } from '../utils/groupSuggestions';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchMain'>;
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Row =
  | { kind: 'spotlight'; item: SuggestItemDto }
  | { kind: 'section'; entityType: string }
  | { kind: 'suggestion'; item: SuggestItemDto }
  | { kind: 'skeleton'; key: string };

const BROWSE_TILES: { label: string; icon: IoniconName; entityType: string; seed: string }[] = [
  { label: 'Movies',      icon: 'film-outline',         entityType: 'Movie',   seed: 'latest' },
  { label: 'Shows',       icon: 'tv-outline',           entityType: 'Show',    seed: 'latest' },
  { label: 'Celebrities', icon: 'people-outline',       entityType: 'Person',  seed: 'top' },
  { label: 'Articles',    icon: 'newspaper-outline',    entityType: 'Article', seed: 'news' },
  { label: 'Forums',      icon: 'chatbubbles-outline',  entityType: 'Forum',   seed: 'discuss' },
  { label: 'Topics',      icon: 'reader-outline',       entityType: 'Topic',   seed: 'discuss' },
];

export default function SearchMainScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const submit = useSearchStore((s) => s.submit);
  const suggestions = useSearchStore((s) => s.suggestions);
  const suggestStatus = useSearchStore((s) => s.suggestStatus);
  const recents = useSearchStore((s) => s.recents);
  const removeRecent = useSearchStore((s) => s.removeRecent);
  const clearRecents = useSearchStore((s) => s.clearRecents);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);

  const { sheetRef, openSuggestion } = useEntityNavigator();

  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      void submit(trimmed);
      navigation.push('SearchResults');
    },
    [submit, navigation],
  );

  const handleBrowse = useCallback(
    (entityType: string, seed: string) => {
      void submit(seed).then(() => setEntityFilter(entityType));
      navigation.push('SearchResults');
    },
    [submit, setEntityFilter, navigation],
  );

  const isTyping = query.trim().length >= 2;
  const showSuggestionsList = isTyping && suggestions.length > 0;
  const showSuggestionSkeletons = isTyping && suggestStatus === 'loading' && suggestions.length === 0;
  const showRecentsFallback = !isTyping || (isTyping && suggestions.length === 0 && suggestStatus !== 'loading');

  // Build the heterogeneous row list for the typeahead branch.
  const suggestionRows = useMemo<Row[]>(() => {
    if (showSuggestionSkeletons) {
      return Array.from({ length: 5 }, (_, i) => ({ kind: 'skeleton', key: `sk-${i}` }));
    }
    if (!showSuggestionsList) return [];
    const [first, ...rest] = suggestions;
    const rows: Row[] = first ? [{ kind: 'spotlight', item: first }] : [];
    const groups = groupSuggestions(rest);
    for (const group of groups) {
      rows.push({ kind: 'section', entityType: group.entityType });
      for (const item of group.items) rows.push({ kind: 'suggestion', item });
    }
    return rows;
  }, [showSuggestionsList, showSuggestionSkeletons, suggestions]);

  const SearchForFooter = (
    <Pressable
      onPress={() => handleSubmit(query)}
      style={({ pressed }) => [styles.searchForRow, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Search for ${query.trim()}`}
    >
      <Ionicons name="search" size={16} color={colors.primary} />
      <Text style={styles.searchForText}>
        Search for "<Text style={styles.searchForBold}>{query.trim()}</Text>"
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQuery}
        onSubmit={handleSubmit}
        autoFocus
      />

      {showSuggestionsList || showSuggestionSkeletons ? (
        <FlatList<Row>
          data={suggestionRows}
          keyExtractor={(row, i) => {
            if (row.kind === 'spotlight') return `sp-${row.item.entityId ?? i}`;
            if (row.kind === 'section') return `sec-${row.entityType}`;
            if (row.kind === 'suggestion') return `s-${row.item.entityType ?? 'q'}-${row.item.entityId ?? i}`;
            return row.key;
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.kind === 'spotlight') {
              return (
                <SuggestionSpotlight
                  item={item.item}
                  query={query}
                  onPress={() => openSuggestion(item.item)}
                />
              );
            }
            if (item.kind === 'section') {
              return <SuggestionSection entityType={item.entityType} />;
            }
            if (item.kind === 'skeleton') return <SuggestionSkeleton />;
            return (
              <SuggestionRow
                item={item.item}
                query={query}
                onPress={() => openSuggestion(item.item)}
              />
            );
          }}
          ListFooterComponent={SearchForFooter}
        />
      ) : (
        <FlatList
          data={recents}
          keyExtractor={(r) => r.q}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            isTyping ? SearchForFooter
            : recents.length > 0 ? (
              <View style={styles.recentsHeader}>
                <Text style={styles.recentsTitle}>Recent searches</Text>
                <Pressable
                  onPress={clearRecents}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all recent searches"
                >
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            isTyping ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyHeader}>
                  <Ionicons name="search-outline" size={32} color={colors.textTertiary} />
                  <Text style={styles.emptyTitle}>Browse India Forums</Text>
                  <Text style={styles.emptyBody}>
                    Or jump into a category to start exploring.
                  </Text>
                </View>
                <View style={styles.tilesGrid}>
                  {chunk(BROWSE_TILES, 2).map((row, i) => (
                    <View key={i} style={styles.tilesRow}>
                      {row.map((t) => (
                        <BrowseTile
                          key={t.label}
                          label={t.label}
                          icon={t.icon}
                          onPress={() => handleBrowse(t.entityType, t.seed)}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )
          }
          renderItem={({ item }) => (
            <RecentRow
              q={item.q}
              onPress={() => handleSubmit(item.q)}
              onRemove={() => removeRecent(item.q)}
            />
          )}
        />
      )}

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    recentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 6,
    },
    recentsTitle: {
      fontSize: 12, fontWeight: '700', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.6,
    },
    clearText: { fontSize: 12, fontWeight: '600', color: c.primary },
    empty: { paddingTop: 36, paddingHorizontal: 14, gap: 18 },
    emptyHeader: { alignItems: 'center', gap: 6, paddingHorizontal: 18 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    emptyBody: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19 },
    tilesGrid: { gap: 10 },
    tilesRow: { flexDirection: 'row', gap: 10 },
    searchForRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
      marginTop: 4,
    },
    pressed: { backgroundColor: c.surface },
    searchForText: { fontSize: 14, color: c.text },
    searchForBold: { fontWeight: '700', color: c.primary },
  });
}
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 3: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/screens/SearchMainScreen.tsx
```

Suggested commit message: `feat(mobile): sectioned typeahead, spotlight, browse tiles, skeletons on SearchMain`.

---

## Task 8: `SearchResultsScreen` — context line, skeletons, filter polish

**Files:**
- Modify: `mobile/src/features/search/screens/SearchResultsScreen.tsx` (replace whole file)

Three changes:
1. Above the results list, render `<ResultsContextLine count={results.length} query={submittedQuery} activeEntityType={activeEntityType} />` when `resultsStatus === 'success'`.
2. Replace the centered `ActivityIndicator` with 4 `ResultCardSkeleton`s when `resultsStatus === 'loading'` and `results.length === 0`.
3. Drive `RefreshControl.refreshing` from `isPullRefreshing` (new store flag) instead of `resultsStatus === 'loading'`. The pull handler calls the new `pullToRefresh` action.

- [ ] **Step 1: Replace the entire file with:**

```tsx
import React, { useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, RefreshControl,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { SearchStackParamList } from '../../../navigation/types';
import { useSearchStore } from '../../../store/searchStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

import SearchInputHeader from '../components/SearchInputHeader';
import EntityTypeChip from '../components/EntityTypeChip';
import ResultCard from '../components/ResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import ResultsContextLine from '../components/ResultsContextLine';
import UnsupportedEntitySheet from '../components/UnsupportedEntitySheet';
import { useEntityNavigator } from '../hooks/useEntityNavigator';

type Nav = NativeStackNavigationProp<SearchStackParamList, 'SearchResults'>;
type Styles = ReturnType<typeof makeStyles>;

export default function SearchResultsScreen() {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useSearchStore((s) => s.query);
  const setQueryQuiet = useSearchStore((s) => s.setQueryQuiet);
  const submit = useSearchStore((s) => s.submit);
  const submittedQuery = useSearchStore((s) => s.submittedQuery);
  const results = useSearchStore((s) => s.results);
  const searchLogId = useSearchStore((s) => s.searchLogId);
  const resultsStatus = useSearchStore((s) => s.resultsStatus);
  const isPullRefreshing = useSearchStore((s) => s.isPullRefreshing);
  const activeEntityType = useSearchStore((s) => s.activeEntityType);
  const setEntityFilter = useSearchStore((s) => s.setEntityFilter);
  const refreshResults = useSearchStore((s) => s.refreshResults);
  const pullToRefresh = useSearchStore((s) => s.pullToRefresh);

  const { sheetRef, openResult } = useEntityNavigator();

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) set.add(r.entityType);
    if (activeEntityType) set.add(activeEntityType);
    return Array.from(set).sort();
  }, [results, activeEntityType]);

  const handleResubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      void submit(trimmed);
    },
    [submit],
  );

  return (
    <View style={styles.screen}>
      <SearchInputHeader
        value={query}
        onChangeText={setQueryQuiet}
        onSubmit={handleResubmit}
        onBack={() => navigation.goBack()}
      />

      {entityTypes.length > 0 ? (
        <View style={styles.chipStripWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipStrip}
            keyboardShouldPersistTaps="handled"
          >
            <EntityTypeChip
              label="All"
              active={activeEntityType == null}
              onPress={() => setEntityFilter(null)}
            />
            {entityTypes.map((t) => (
              <EntityTypeChip
                key={t}
                label={t}
                active={activeEntityType === t}
                onPress={() => setEntityFilter(t)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.body}>
        <Body
          status={resultsStatus}
          results={results}
          submittedQuery={submittedQuery}
          activeEntityType={activeEntityType}
          searchLogId={searchLogId}
          isPullRefreshing={isPullRefreshing}
          onRetry={refreshResults}
          onPullToRefresh={pullToRefresh}
          onPressItem={openResult}
          query={submittedQuery}
          styles={styles}
          colors={colors}
        />
      </View>

      <UnsupportedEntitySheet ref={sheetRef} />
    </View>
  );
}

interface BodyProps {
  status: ReturnType<typeof useSearchStore.getState>['resultsStatus'];
  results: ReturnType<typeof useSearchStore.getState>['results'];
  submittedQuery: string;
  activeEntityType: string | null;
  searchLogId: number | null;
  isPullRefreshing: boolean;
  onRetry: () => void;
  onPullToRefresh: () => Promise<void>;
  onPressItem: ReturnType<typeof useEntityNavigator>['openResult'];
  query: string;
  styles: Styles;
  colors: ThemeColors;
}

function Body({
  status, results, submittedQuery, activeEntityType, searchLogId,
  isPullRefreshing, onRetry, onPullToRefresh, onPressItem, query, styles, colors,
}: BodyProps) {
  if (status === 'loading' && results.length === 0) {
    return (
      <View>
        {Array.from({ length: 4 }, (_, i) => <ResultCardSkeleton key={i} />)}
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.errorTitle}>Couldn't load search</Text>
        <Pressable
          onPress={onRetry}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry search"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
        <Text style={styles.emptyTitle}>No results for "{submittedQuery}"</Text>
        <Text style={styles.emptyBody}>
          Try a different spelling or remove filters.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={results}
      keyExtractor={(r) => `${r.entityType}-${r.entityId}`}
      ListHeaderComponent={
        <ResultsContextLine
          count={results.length}
          query={submittedQuery}
          activeEntityType={activeEntityType}
        />
      }
      renderItem={({ item }) => (
        <ResultCard item={item} query={query} onPress={() => onPressItem(item, searchLogId)} />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isPullRefreshing}
          onRefresh={onPullToRefresh}
          tintColor={colors.primary}
        />
      }
    />
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    body: { flex: 1 },
    chipStripWrap: {
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    chipStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    center: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingHorizontal: 32,
    },
    errorTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    retryBtn: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: 10, backgroundColor: c.primarySoft,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: c.primary },
    emptyTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    emptyBody: {
      fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 18,
    },
  });
}
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 3: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/screens/SearchResultsScreen.tsx
```

Suggested commit message: `feat(mobile): SearchResults context line, skeletons, pull-refresh polish`.

---

## Task 9: Final smoke test

**Files:** none modified.

- [ ] **Step 1: Start the dev server.**

```bash
cd mobile && npm start
```

- [ ] **Step 2: Walk through the acceptance criteria from the spec:**

  1. **Sectioned dropdown.** Tap Search, type "shah". Verify the dropdown shows section headers (e.g. "PEOPLE", "MOVIES") with rows grouped under them.
  2. **Top-result spotlight.** First result renders as a hero card with "TOP RESULT" kicker and a 64px thumbnail.
  3. **Bold matched prefix.** "**Sha**hrukh Khan" / "**Sha**heed" — the matched prefix is bolder than the rest.
  4. **Skeleton typeahead.** Clear the input, type "raja" quickly — for the first ~250ms five skeleton rows render before suggestions resolve.
  5. **Browse tiles.** With recents empty (or freshly cleared), the search tab shows a 2x3 grid of tiles. Tap "Movies" → navigates to `SearchResults` with the Movies filter active.
  6. **Result card metadata.** On a results screen for a multi-type query (e.g. "ramayan"), each card shows an entity-type kicker (MOVIE / TV SHOW / ARTICLE / etc.) above the title.
  7. **Result count line.** Above the list: "**12 results** for "ramayan"". Tap the Article chip → "**3 Articles** for "ramayan"".
  8. **Skeleton results.** Submit a fresh query — for the first ~300ms, four skeleton cards render instead of a centered spinner.
  9. **Filter-tap pull-refresh.** Tap chips to switch filters — the pull-to-refresh chrome (spinner at the top) does **not** appear. Pulling the list down still shows the spinner.
  10. **Debounce.** Type "ramayan" rapidly — the network panel shows a single `/search/suggest` call, not seven.

- [ ] **Step 3: Final type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 4: Commit (controller will run after confirmation).** Suggested message:
`feat(mobile): production search polish — sections, spotlight, metadata, skeletons`.

---

## Acceptance criteria coverage

| Spec criterion | Task |
|---|---|
| 1. Sectioned typeahead dropdown | T1 (utils) + T5 (section component) + T7 (screen wiring) |
| 2. Top-result spotlight card | T5 (spotlight component) + T7 (screen wiring) |
| 3. Bold matched prefix | T2 (HighlightedText) + T4 (rows + cards) |
| 4. Per-entity-type metadata | T1 (entityMetadata util) + T4 (rows + cards) |
| 5. Result-count + filter context | T5 (component) + T8 (wiring) |
| 6. Skeleton loading states | T3 (skeleton components) + T7 (typeahead) + T8 (results) |
| 7. Smart empty-state browse tiles | T5 (BrowseTile) + T7 (screen) |
| 8. Debounce + filter-tap polish | T6 (store) + T8 (results) |
| 9. `npm run tsc` after every commit | All tasks |

## Self-review notes

- Every step has concrete code, exact paths, and exact verification commands.
- No TBD / TODO / "implement later" markers.
- Type identifiers are consistent: `HighlightedText`, `entityMetadataLine`, `groupSuggestions`, `SuggestionGroup`, `SuggestionRow`, `SuggestionSection`, `SuggestionSpotlight`, `SuggestionSkeleton`, `ResultCardSkeleton`, `ResultsContextLine`, `BrowseTile`, `pullToRefresh`, `isPullRefreshing` — each defined exactly once in the task that introduces it and used by name in later tasks.
- Spec coverage table maps every numbered acceptance criterion to its task.
- Implementation order is dependency-correct: utilities → primitives → row-level components → screen-level wiring → smoke test.
