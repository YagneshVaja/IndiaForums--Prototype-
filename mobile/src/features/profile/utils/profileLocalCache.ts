import * as FileSystem from 'expo-file-system/legacy';
import { useQuery } from '@tanstack/react-query';

// Per-user local cache for profile fields the API exposes write-only —
// notably `pronoun`, which is settable via `PUT /me` (UpdateProfileCommand)
// but not returned on any read endpoint per the OpenAPI spec. We persist the
// value the user enters in Edit Profile so the hero can display it back.
// Reliable only for the signed-in user; other users' pronouns can't be
// shown until the API exposes them on read.
//
// We use the legacy expo-file-system async API (FileSystem.documentDirectory
// + writeAsStringAsync/readAsStringAsync). It's been battle-tested in
// thousands of Expo apps for years; works in Expo Go and dev builds, no
// device security requirement, no native build needed.

const DIR = (FileSystem.documentDirectory ?? '') + 'profile-extras/';
const fileUri = (userId: number | string) =>
  `${DIR}pronoun-${String(userId)}.txt`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

/**
 * Persist or clear the pronoun for the given user.
 */
export async function savePronoun(
  userId: number | string | null | undefined,
  pronoun: string,
): Promise<void> {
  if (userId == null || userId === '') return;
  if (!FileSystem.documentDirectory) return;
  const trimmed = pronoun.trim();
  const uri = fileUri(userId);
  if (trimmed) {
    try {
      await ensureDir();
      await FileSystem.writeAsStringAsync(uri, trimmed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[profileLocalCache] savePronoun failed', err);
    }
  } else {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignored — best-effort delete
    }
  }
}

/**
 * Load the cached pronoun for the given user. Returns `null` if not set.
 */
export async function loadPronoun(
  userId: number | string | null | undefined,
): Promise<string | null> {
  if (userId == null || userId === '') return null;
  if (!FileSystem.documentDirectory) return null;
  const uri = fileUri(userId);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const v = (await FileSystem.readAsStringAsync(uri)).trim();
    return v || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[profileLocalCache] loadPronoun failed', err);
    return null;
  }
}

// Stable react-query key shared by the reader hook below and any callers
// that need to invalidate the cache after a write (e.g. EditProfileScreen).
export const pronounQueryKey = (userId: number | string | null | undefined) =>
  ['profile', 'pronoun', String(userId ?? '')] as const;

/**
 * Read the cached pronoun for the given user via react-query. The file is
 * the persistent source of truth; this hook just exposes it with the usual
 * react-query lifecycle so callers can invalidate after a write
 * (`queryClient.invalidateQueries({ queryKey: pronounQueryKey(userId) })`).
 *
 * Returns `null` while loading or if no pronoun has been saved.
 */
export function usePronoun(userId: number | string | null | undefined): string | null {
  const enabled = userId != null && userId !== '';
  const q = useQuery({
    queryKey: pronounQueryKey(userId),
    queryFn: () => loadPronoun(userId),
    enabled,
    // Pronoun changes only via Edit Profile (which invalidates the query
    // explicitly). No background refetch needed.
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return (q.data ?? null) as string | null;
}
