# Mobile Frontend — Messages feature issues

**Date:** 2026-05-12
**Scope:** `mobile/src/features/messages/` — My Space › Messages
**Companion to:** [backend-issues-messages-2026-05-12.md](backend-issues-messages-2026-05-12.md)

This doc lists what we need to clean up on the **client** for the Messages feature. The backend doc covers what we need from the API team; this one is the mobile-team punch list. Severity tiers mirror the broader frontend tech-debt doc.

---

## Summary

| Severity | Count |
|---|---|
| 🔴 Critical (user-visible bug or spec drift) | 6 |
| 🟡 Important (UX quality / inefficiency) | 9 |
| ⚪ Nice to have (polish / missing affordances) | 7 |
| **Total** | **22** |

---

## 🔴 Critical

### M-1: Search input refires the query on every keystroke

**File:** [MessagesInboxScreen.tsx:77-82](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx#L77-L82)

```tsx
const list = useMessagesList({
  mode: tab,
  page,
  filter: search.trim() || undefined,
  folderId,
});
```

`search` is set on every `onChangeText`, and `filter` is part of the React Query queryKey. So every keystroke spawns a brand-new query against `/messages?…&filter=…`. There's an `onSubmitEditing` that calls `refetch()` — but it's redundant because the query is already auto-refetching for each character.

**Impact:** dozens of backend calls per search term; flicker as `keepPreviousData` swaps stale results in/out; throwaway pressure on Inbox/Unread (which are 500-ing anyway — see [backend issue F-1](backend-issues-messages-2026-05-12.md#f-1-get-messagesmodeinbox-and-modeunread-return-500)).

**Action:** debounce `search` (250-300ms) before it enters the queryKey, or only commit on submit + clear button.

---

### M-2: No optimistic update on `sendMessage` (spec drift)

**File:** [useMessages.ts:102-110](../mobile/src/features/messages/hooks/useMessages.ts#L102-L110)

```ts
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMessageRequestDto) => sendMessage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
```

The [Messages design spec](superpowers/specs/2026-05-11-mobile-messages-design.md) explicitly calls for an optimistic insert into `['messages', 'thread', rootId]` on submit (with rollback on error). The current hook only invalidates on success — so users see their reply appear ~1-2s after tapping send, no immediate feedback in the thread.

**Impact:** the inline composer feels sluggish; users tap send twice and produce duplicates.

**Action:** add `onMutate` that builds a temp `MessageThreadItemDto` from the form, pushes it into the thread cache, and rolls back in `onError`. Pattern is standard React Query — see RQ docs for "Optimistic Updates" or copy from any chat sample.

---

### M-3: Thread renders into a plain `ScrollView` — no virtualization, no pagination

**File:** [MessageThreadScreen.tsx:275-290](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L275-L290)

```tsx
<ScrollView
  ref={scrollRef}
  contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
  onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
  …
>
  {rendered}
</ScrollView>
```

Two problems:

1. **No virtualization.** The mobile CLAUDE.md says *"Lists | FlashList (`@shopify/flash-list`) — prefer over FlatList"*. We're using a plain `ScrollView` that renders every bubble in memory, even for a 500-message thread.
2. **No pagination.** `useMessageThread` doesn't pass `pageNumber` / `cursor` — we only ever fetch page 1. Users with long-running conversations cannot load older messages.

**Impact:** janky scroll on long threads, and a hard ceiling on history.

**Action:** convert to `FlashList` inverted (chat-style), add upward "load older" via `fetchNextPage` once we wire `useInfiniteQuery` for the thread.

---

### M-4: Thread auto-scrolls to bottom on every refetch (clobbers scroll position)

**File:** [MessageThreadScreen.tsx:278](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L278)

```tsx
onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
```

The spec says *"preserve position on background refetch"*, but `onContentSizeChange` fires on every refetch (which happens on focus, on `staleTime` expiry every 15s, etc.) and jumps the user back to the latest message. If a user is reading scrollback, the screen yanks them out of context.

**Action:** track whether the user is "at bottom" (within ~120px) and only auto-scroll when they were already there.

---

### M-5: Thread "options" ellipsis goes straight to Opt Out — no action sheet (spec drift)

**File:** [MessageThreadScreen.tsx:237-240](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L237-L240)

```tsx
<TopNavBack
  …
  rightIcon="ellipsis-vertical"
  onRightPress={optOut}
  rightAccessibilityLabel="Thread options"
/>
```

The [design spec](superpowers/specs/2026-05-11-mobile-messages-design.md#L50) calls for an action sheet — *"Opt out, Mark unread, Refresh"*. Today the ellipsis fires `optOut` directly, which means a user tapping the ellipsis to "do something with this thread" is one Alert tap away from a destructive action. The accessibility label says "Thread options" but the only option is destruct.

**Impact:** spec drift + dangerous UX — the destructive action is on the primary tap path.

**Action:** wire ellipsis to an `ActionSheet` / bottom-sheet with all three options.

---

### M-6: Send error toast never auto-hides (spec drift)

**File:** [MessageThreadScreen.tsx:310-316](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L310-L316)

```tsx
{sendError ? (
  <Pressable onPress={() => setSendError(null)} style={styles.errorToast}>
    …
  </Pressable>
) : null}
```

Spec says *"surface inline error toast above the composer (3s autohide)"*. Today the toast persists until the user taps it.

**Action:** mirror the success-toast pattern at [MessageThreadScreen.tsx:81-85](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L81-L85) — set a `setTimeout` to clear `sendError` after 3000ms.

---

## 🟡 Important

### M-7: `qc.invalidateQueries({ queryKey: ['messages'] })` is too broad

**Files:** [useMessages.ts:107,117,127,141,153](../mobile/src/features/messages/hooks/useMessages.ts)

Every mutation (send, bulk action, move-to-folder, create/delete folder) invalidates the entire `['messages']` namespace. That refetches:
- The current list query
- All other tab list queries (cached but cold)
- The folders query
- The overview query
- The open thread query
- Drafts

…even when only one of them was actually affected.

**Action:** scope each `invalidateQueries` to the narrowest key. E.g. send-reply should invalidate `['messages', 'thread', rootId]` + `['messages', 'overview']`, not everything.

---

### M-8: Drafts row shows raw `toIds` to the user

**File:** [MessagesInboxScreen.tsx:553-555](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx#L553-L555)

```tsx
{d.toIds ? (
  <Text style={styles.meta} numberOfLines={1}>To: {d.toIds}</Text>
) : null}
```

`MessageDraftDto.toIds` is sometimes a comma-list of numeric user IDs (per the comment in [MessageComposeScreen.tsx:66-68](../mobile/src/features/messages/screens/MessageComposeScreen.tsx#L66-L68)). The Drafts list happily renders `To: 121342,55879` to the user. Compose handles this on hydration by showing a friendly banner — the list doesn't.

**Action:** show `To: 2 recipients` when `toIds` is numeric; show the names when it isn't.

---

### M-9: `useNewMessageForm` always enabled — unnecessary call on plain new-message flow

**File:** [MessageComposeScreen.tsx:50-55](../mobile/src/features/messages/screens/MessageComposeScreen.tsx#L50-L55)

```ts
const newFormParams = useMemo(() => {
  if (draftId) return { did: draftId };
  if (recipientId) return { mode: 'PM', tunm: recipientId };
  return { mode: 'PM' };
}, [draftId, recipientId]);
const newForm = useNewMessageForm(newFormParams);
```

When opening Compose with no draft and no recipient (the most common case — tapping the compose FAB), we still hit `GET /messages/new?mode=PM`. The response is then unused; only `pmUserTagLimit` could matter, and the UI doesn't surface a limit indicator yet.

**Action:** gate the call — `useNewMessageForm(params, /* enabled */ !!draftId || !!recipientId)`.

---

### M-10: Selection-mode bulk actions are not optimistic

**File:** [MessagesInboxScreen.tsx:139-169](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx#L139-L169)

Read/Unread/Star/Unstar/Delete all wait for the API round-trip before the list updates. With 5-10 selected rows that's an extra second of "did anything happen?" — and the visual feedback (unread accent bar, star icon) only changes after refetch.

**Action:** optimistically toggle `readPost` / `likeType` in the list cache on `onMutate`, roll back on error.

---

### M-11: Tab switch doesn't reset `search`

**File:** [MessagesInboxScreen.tsx:233-237](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx#L233-L237)

```tsx
onPress={() => {
  setTab(t.key);
  setFolderId(undefined);
  setPage(1);
}}
```

`setSearch('')` is missing. If a user searches for "Vijay" in Inbox and switches to Sent, the search bar still says "Vijay" and the Sent list is filtered without obvious cause.

**Action:** add `setSearch('')` on tab switch.

---

### M-12: `KeyboardAvoidingView` does nothing on Android (Compose + Thread)

**Files:**
- [MessageComposeScreen.tsx:146-149](../mobile/src/features/messages/screens/MessageComposeScreen.tsx#L146-L149)
- [MessageThreadScreen.tsx:229-232](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L229-L232)

```tsx
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
```

On Android, `behavior={undefined}` means the keyboard can overlap the composer / body field. RN docs recommend `'height'` for Android.

**Impact:** Android users have to manually scroll to see what they're typing — see the broader frontend doc's issue #35.

**Action:** use `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` and verify on a real device.

---

### M-13: `dateDividerLabel` uses device-local date parsing

**File:** [ThreadDateDivider.tsx:24-37](../mobile/src/features/messages/components/ThreadDateDivider.tsx#L24-L37)

```ts
const d = new Date(input);
…
const ymd = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
```

`new Date(input)` honors device timezone. If the API returns a UTC timestamp like `2026-05-12T19:30:00Z`, a user in IST (+5:30) sees it as May 13 — the divider says "Today" on May 13 even though the server bucketed it as May 12.

Also: `messages[i].messageDate.slice(0, 10)` used for grouping in [MessageThreadScreen.tsx:191](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L191) does a raw string slice that's similarly TZ-naive.

**Action:** parse explicitly with the user's locale (IST is the realistic target) and use a consistent helper. `Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' })` or a dedicated date library.

---

### M-14: Composer disabled when thread is empty — replies impossible on edge case

**File:** [MessageThreadScreen.tsx:318-327](../mobile/src/features/messages/screens/MessageThreadScreen.tsx#L318-L327)

```tsx
<ThreadComposer … disabled={messages.length === 0} />
```

If a backend bug or pagination edge case returns a thread with `rootMessage` but `messages: []`, the user sees the subject + participants but can't reply. Probably shouldn't happen, but the failure mode is silent.

**Action:** allow the composer when `root` exists. We have everything we need to send (`rootMessageId`, participant list).

---

### M-15: `Number(meId)` can be `NaN` if auth user is mid-hydration

**Files:** [MessageThreadScreen.tsx:90,143,148,199,206,210](../mobile/src/features/messages/screens/MessageThreadScreen.tsx)

```ts
const meId = useAuthStore((s) => s.user?.userId);
…
Number(p.userId) !== Number(meId)
```

If the auth store hasn't yet hydrated when the thread screen mounts (rare but happens after cold start with a push tap), `meId` is `undefined` → `Number(undefined) = NaN` → every comparison is false → **all messages render as "theirs", participant subtitle includes me, send recipient list includes me**.

**Action:** guard `meId` — show a spinner until `useAuthStore.persist.hasHydrated()` is true, or fall back to the user's `userName` when present.

---

## ⚪ Nice to have

### M-16: No avatar grouping break at participant change inside a date

`MessageBubble` only shows the author name on `isFirstInGroup` for "theirs" bubbles. That's correct, but a 3-way thread (me, A, B) where A and B alternate produces lots of name labels. Could collapse with finer logic.

---

### M-17: No haptic on long-press selection in inbox

[MessagesInboxScreen.tsx:474-475](../mobile/src/features/messages/screens/MessagesInboxScreen.tsx#L474-L475) fires `onLongPress` to enter selection mode but doesn't trigger `Haptics.selectionAsync()`. Standard mobile pattern.

---

### M-18: No "select all" affordance in selection mode

Once a user is in selection mode, there's no quick way to select every visible row. Power users with cleanup intent end up tapping 24 rows.

---

### M-19: No "report message" / "block sender" actions

The bubble long-press fires `handleCopy` only — copies the body. Most chat apps offer Report / Block as well.

---

### M-20: Folder chips don't auto-scroll the active chip into view

`tabsScroll` and the folder row are horizontal `ScrollView`s. If a user is on a tab/folder that's off-screen, it stays off-screen.

---

### M-21: No skeleton variant for the inbox list

The inbox loading state is a centered `ActivityIndicator` — the broader frontend doc's issue #13 calls this out app-wide. The Messages list rows are uniform and would skeleton cleanly.

---

### M-22: Attachment button is a placeholder

[ThreadComposer.tsx:43-53](../mobile/src/features/messages/components/ThreadComposer.tsx#L43-L53) renders a disabled attach icon. Either drop it until the API exposes a PM-attachment endpoint, or wire it now if the backend can take it.

---

## What blocks what

| Frontend fix | Unblocks |
|---|---|
| M-1, M-7 | Smooth search + fewer backend hits when [F-1](backend-issues-messages-2026-05-12.md) is fixed |
| M-2, M-4 | Inline-reply UX matching the spec |
| M-3 | Long-thread performance, history beyond page 1 |
| M-5, M-6 | Spec parity for the thread screen |
| M-12 | Compose on Android |
| M-15 | Cold-start push → thread tap |

---

## Suggested priority order

**Tier 1 — fix alongside the next Messages PR**
1. **M-1** — debounce search
2. **M-2** — optimistic send (single biggest perceived-perf win)
3. **M-4** — preserve scroll position on refetch
4. **M-6** — auto-hide error toast
5. **M-12** — Android keyboard

**Tier 2 — this quarter**
6. M-3 — FlashList + pagination for thread
7. M-5 — action sheet for thread ellipsis
8. M-7 — scoped invalidations
9. M-10 — optimistic bulk actions
10. M-13 — TZ-aware date dividers
11. M-15 — auth-hydration guard

**Tier 3 — roadmap**
12. Everything else (16-22).

---

## See also

- [backend-issues-messages-2026-05-12.md](backend-issues-messages-2026-05-12.md) — server-side bugs (Inbox/Unread 500, Send 500, Overview 400)
- [frontend-issues-mobile-2026-05-12.md](frontend-issues-mobile-2026-05-12.md) — app-wide tech debt (lint, CI, error boundaries, etc.)
- [superpowers/specs/2026-05-11-mobile-messages-design.md](superpowers/specs/2026-05-11-mobile-messages-design.md) — design spec the implementation is measured against
