import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  url: string | null;
  onClose: () => void;
}

const YT_ID_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

function extractVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(YT_ID_REGEX);
  return match ? match[1] : null;
}

export default function YouTubePlayerModal({ visible, url, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const videoId = useMemo(() => extractVideoId(url), [url]);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0`
    : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {embedUrl ? (
          <WebView
            source={{ uri: embedUrl }}
            style={styles.web}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            )}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close video"
          style={[styles.closeBtn, { top: insets.top + 10 }]}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  web: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  closeBtn: {
    position: 'absolute',
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
