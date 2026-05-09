/**
 * Locally splice a post's `reactionJson` so the aggregate emoji pill on
 * the post card reflects the user's new reaction without waiting for
 * the next /forums/topics/{id}/posts fetch.
 *
 * Wire shape (one entry per reaction type that has at least one user):
 *   `{"json":[{"lt":1,"lc":76,"uid":1219933,"un":"Red_eyes94"},...]}`
 *
 * Caveats — this is a best-effort approximation, not a faithful update:
 *   - We don't track per-user `uid` for non-OP posts, so removing the
 *     user's prior reaction splices the *first* entry with that type
 *     even though the entry might represent another reactor. The
 *     resulting top-3 emoji set is still correct in practice because
 *     the live aggregate is paged top-N reactors, not full membership.
 *   - We don't increment/decrement `lc`. Display logic
 *     (`parseTopReactionTypes`) counts entries per type, not `lc`,
 *     so the visible emoji set is right even if `lc` is stale.
 *
 * Same logic was previously inlined as `patchOpReactionJson` inside
 * `useTopicLike.ts` — extracted here so non-OP replies can patch too.
 */
export function patchReactionJson(
  reactionJson: string | null | undefined,
  prevReaction: number | null,
  nextReaction: number | null,
): string | null {
  let arr: Array<Record<string, unknown>> = [];
  if (reactionJson) {
    try {
      const parsed = JSON.parse(reactionJson);
      if (Array.isArray(parsed?.json)) arr = [...parsed.json];
    } catch {
      arr = [];
    }
  }
  if (prevReaction != null) {
    const idx = arr.findIndex((e) => Number(e?.lt) === prevReaction);
    if (idx >= 0) arr.splice(idx, 1);
  }
  if (nextReaction != null) {
    arr.unshift({ lt: nextReaction });
  }
  return arr.length > 0 ? JSON.stringify({ json: arr }) : null;
}
