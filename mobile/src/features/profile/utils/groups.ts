// Mapping of API `groupId` (returned on /me, /users/{id}/profile, etc.) to
// the human-readable rank shown on profile heroes. The OpenAPI spec returns
// only the integer; the live web resolves these client-side. Add entries
// here as new ranks are observed in the wild.
//
// Source: indiaforums.com group ladder. Confirmed in-app: 25 = "Navigator".
const GROUP_NAMES: Record<number, string> = {
  25: 'Navigator',
};

export function getGroupName(
  groupId: number | string | null | undefined,
): string | null {
  if (groupId == null) return null;
  const n = typeof groupId === 'string' ? parseInt(groupId, 10) : groupId;
  if (!Number.isFinite(n)) return null;
  return GROUP_NAMES[Number(n)] ?? null;
}
