import { useRef, useState } from 'react';
import {
  uploadAvatar,
  uploadBanner,
  validateImageFile,
  fileToBase64,
} from '../../services/uploadsApi';
import { extractApiError } from '../../services/api';
import styles from './AvatarUploader.module.css';

/**
 * Image upload widget for the user's avatar or profile banner.
 *
 * Variants:
 *   - "avatar" (default): square 96px preview, calls POST /upload/user-thumbnail
 *   - "banner":          wide 16:5 preview, calls POST /upload/user-banner
 *
 * On a successful upload the parent is notified via onUploaded(imageUrl|null).
 * Passing an empty string to the upload endpoint removes the existing image —
 * we expose this as a "Remove" button.
 *
 * Props:
 *   variant     'avatar' | 'banner'
 *   currentUrl  string | null  — existing image to show before any change
 *   onUploaded  (url: string | null) => void
 *   label       optional override for the field label
 */
export default function AvatarUploader({
  variant = 'avatar',
  currentUrl,
  onUploaded,
  label,
}) {
  const isBanner = variant === 'banner';
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fieldLabel = label || (isBanner ? 'Profile Banner' : 'Profile Picture');

  function pick() {
    if (busy) return;
    inputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be picked again after a removal
    e.target.value = '';
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const upload = isBanner ? uploadBanner : uploadAvatar;
      const res = await upload(base64);
      const newUrl = res.data?.imageUrl || null;
      setPreview(newUrl || base64);
      onUploaded?.(newUrl);
    } catch (err) {
      console.error('Image upload error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to upload image'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const upload = isBanner ? uploadBanner : uploadAvatar;
      // Empty imageData tells the backend to remove the existing image.
      await upload('');
      setPreview(null);
      onUploaded?.(null);
    } catch (err) {
      console.error('Image remove error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to remove image'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{fieldLabel}</span>

      <div className={`${styles.previewWrap} ${isBanner ? styles.banner : styles.avatar}`}>
        {preview ? (
          <img src={preview} alt={fieldLabel} className={styles.previewImg} />
        ) : (
          <div className={styles.placeholder}>
            {isBanner ? 'No banner uploaded' : 'No photo'}
          </div>
        )}
        {busy && <div className={styles.busyOverlay}>Uploading…</div>}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={pick}
          disabled={busy}
        >
          {preview ? 'Change' : 'Upload'}
        </button>
        {preview && (
          <button
            type="button"
            className={styles.removeBtn}
            onClick={handleRemove}
            disabled={busy}
          >
            Remove
          </button>
        )}
      </div>

      <span className={styles.hint}>JPG, PNG, or WebP. Max 10 MB.</span>
      {error && <div className={styles.error}>{error}</div>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.fileInput}
        onChange={handleFile}
      />
    </div>
  );
}
