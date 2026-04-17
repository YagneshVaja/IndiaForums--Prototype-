import api from './api';

// ── Image Upload API ─────────────────────────────────────────────────────────
// Spec: 4 endpoints under /api/v1/upload/*
//   - cropped-image  → temporary upload (anonymous OK), returns tempPath/tempUrl
//   - user-thumbnail → avatar (auth required), empty imageData removes existing
//   - user-banner    → banner (auth required), empty imageData removes existing
//   - post-image     → multipart upload for post media (auth required)
//
// Restrictions across all endpoints:
//   - 10MB max file size
//   - GIF rejected
//   - Animated WebP rejected

const UPLOAD = '/upload';

/**
 * Upload a cropped image to a temporary location.
 * Anonymous access is allowed — used for pre-registration flows.
 * @param imageData base64-encoded image (data URL or raw base64)
 */
export function uploadCroppedImage(imageData: string) {
  return api.post(`${UPLOAD}/cropped-image`, { imageData });
}

/**
 * Upload (or remove) the authenticated user's avatar.
 * Pass an empty string to remove the existing avatar.
 */
export function uploadAvatar(imageData: string) {
  return api.post(`${UPLOAD}/user-thumbnail`, { imageData });
}

/**
 * Upload (or remove) the authenticated user's profile banner.
 * Pass an empty string to remove the existing banner.
 */
export function uploadBanner(imageData: string) {
  return api.post(`${UPLOAD}/user-banner`, { imageData });
}

/**
 * Upload an image attached to a post (multipart form upload).
 * Auth required. Users in groups 4 & 5 are blocked from this endpoint.
 * Note: On mobile, use a Blob/File-like object from expo-image-picker.
 */
export function uploadPostImage(file: any) {
  const form = new FormData();
  form.append('file', file);
  return api.post(`${UPLOAD}/post-image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ── Client-side validation helpers ───────────────────────────────────────────

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Validate a file before attempting an upload. Mirrors the backend rules so we
 * can reject obviously bad files before burning a request.
 * @returns error message, or null if the file is valid
 */
export function validateImageFile(file: { size: number; type: string } | null): string | null {
  if (!file) return 'No file selected';
  if (file.size > MAX_UPLOAD_BYTES) return 'Image must be 10MB or smaller';
  if (file.type === 'image/gif') return 'GIF images are not allowed';
  if (!file.type.startsWith('image/')) return 'File must be an image';
  return null;
}

/**
 * Read a file URI as base64. On React Native, use expo-file-system instead.
 * This is a placeholder that throws — use platform-specific base64 conversion.
 */
export function fileToBase64(_file: any): Promise<string> {
  return Promise.reject(new Error('Use expo-file-system FileSystem.readAsStringAsync on mobile'));
}
