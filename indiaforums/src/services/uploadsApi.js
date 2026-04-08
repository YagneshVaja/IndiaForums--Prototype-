import api from './api';

// ── Image Upload API ─────────────────────────────────────────────────────────
// Spec: 4 endpoints under /api/v1/upload/*
//   - cropped-image  → temporary upload (anonymous OK), returns tempPath/tempUrl
//   - user-thumbnail → avatar (auth required), empty imageData removes existing
//   - user-banner    → banner (auth required), empty imageData removes existing
//   - post-image     → multipart upload for post media (auth required, groups 4&5 blocked)
//
// Restrictions across all endpoints:
//   - 10MB max file size
//   - GIF rejected
//   - Animated WebP rejected
//
// Body shapes:
//   UploadCroppedImageRequestDto: { imageData: string }   // base64 data URL
//   UploadUserImageRequestDto:    { imageData: string|null }
//
// Response shapes:
//   UploadCroppedImageResponseDto: { tempPath, fileId, tempUrl, expiresAt }
//   UploadUserImageResponseDto:    { imageUrl, message, isRemoved }
//   UploadPostImageResponseDto:    { success, message, filePath, mediaId, width, height }

const UPLOAD = '/upload';

/**
 * Upload a cropped image to a temporary location.
 * Anonymous access is allowed — used for pre-registration flows.
 * @param {string} imageData base64-encoded image (data URL or raw base64)
 */
export function uploadCroppedImage(imageData) {
  return api.post(`${UPLOAD}/cropped-image`, { imageData });
}

/**
 * Upload (or remove) the authenticated user's avatar.
 * Pass an empty string to remove the existing avatar.
 * @param {string} imageData base64-encoded image, or '' to remove
 */
export function uploadAvatar(imageData) {
  return api.post(`${UPLOAD}/user-thumbnail`, { imageData });
}

/**
 * Upload (or remove) the authenticated user's profile banner.
 * Pass an empty string to remove the existing banner.
 * @param {string} imageData base64-encoded image, or '' to remove
 */
export function uploadBanner(imageData) {
  return api.post(`${UPLOAD}/user-banner`, { imageData });
}

/**
 * Upload an image attached to a post (multipart form upload).
 * Auth required. Users in groups 4 & 5 are blocked from this endpoint.
 * @param {File} file image file from a file input
 */
export function uploadPostImage(file) {
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
 * @returns {string|null} error message, or null if the file is valid
 */
export function validateImageFile(file) {
  if (!file) return 'No file selected';
  if (file.size > MAX_UPLOAD_BYTES) return 'Image must be 10MB or smaller';
  if (file.type === 'image/gif') return 'GIF images are not allowed';
  if (!file.type.startsWith('image/')) return 'File must be an image';
  return null;
}

/**
 * Read a File as a base64 data URL. Used for the JSON-body upload endpoints
 * (cropped-image, user-thumbnail, user-banner).
 * @param {File} file
 * @returns {Promise<string>} resolves to a data URL like "data:image/png;base64,..."
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
