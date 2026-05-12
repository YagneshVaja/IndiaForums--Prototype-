// mobile/src/lib/format.ts
// Shared formatting helpers, cross-feature. The implementation still lives
// in features/profile/utils/format.ts for now — this re-export lets callers
// transition without one giant diff. New code should import from this path.
export { stripHtml, timeAgo } from '../features/profile/utils/format';
