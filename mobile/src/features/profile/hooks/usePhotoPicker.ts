import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadUserBanner, uploadUserThumbnail } from '../services/profileApi';
import { extractApiError } from '../../../services/api';
import { hapticError, hapticSuccess } from '../../../utils/haptics';

type Variant = 'avatar' | 'banner';

const MAX_BYTES = 10 * 1024 * 1024; // matches the API's 10MB cap

// `imageData` goes to the .NET endpoint as raw base64. Strip a `data:` prefix
// if a platform variant returned one — Convert.FromBase64String would 400.
function toRawBase64(asset: ImagePicker.ImagePickerAsset): string | null {
  if (!asset.base64) return null;
  const m = /^data:[^;]+;base64,(.*)$/.exec(asset.base64);
  return m ? m[1] : asset.base64;
}

interface Options {
  variant: Variant;
  onUploaded?: (url: string) => void;
}

export function usePhotoPicker({ variant, onUploaded }: Options) {
  const [uploading, setUploading] = useState(false);

  const pick = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Grant photo library access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: variant === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    const mime = (asset.mimeType || '').toLowerCase();
    if (mime === 'image/gif') {
      Alert.alert('Unsupported format', 'GIF images are not allowed. Please pick a JPEG or PNG.');
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
      Alert.alert(
        'Image too large',
        `Maximum file size is 10MB (yours is ${(asset.fileSize / 1024 / 1024).toFixed(1)}MB).`,
      );
      return;
    }
    const imageData = toRawBase64(asset);
    if (!imageData) {
      Alert.alert('Upload failed', 'Could not read image data. Try a different photo.');
      return;
    }

    setUploading(true);
    try {
      const res =
        variant === 'avatar'
          ? await uploadUserThumbnail({ imageData })
          : await uploadUserBanner({ imageData });
      if (res.imageUrl) {
        hapticSuccess();
        onUploaded?.(res.imageUrl);
      } else {
        hapticError();
        Alert.alert('Upload failed', res.message || 'Server did not return a URL.');
      }
    } catch (err) {
      hapticError();
      const e = err as { response?: { status?: number } };
      const detail = extractApiError(err);
      Alert.alert(
        'Upload failed',
        e?.response?.status
          ? `${detail}\n\n(HTTP ${e.response.status} from /upload/${variant === 'avatar' ? 'user-thumbnail' : 'user-banner'})`
          : detail,
      );
    } finally {
      setUploading(false);
    }
  }, [variant, onUploaded]);

  return { pick, uploading };
}
