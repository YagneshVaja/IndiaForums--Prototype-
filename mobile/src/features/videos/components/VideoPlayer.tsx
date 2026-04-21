import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  useWindowDimensions,
  Image,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  youtubeId: string;
  thumbnail?: string | null;
}

export default function VideoPlayer({ youtubeId, thumbnail }: Props) {
  const { width } = useWindowDimensions();
  const playerHeight = Math.round(width * 9 / 16);
  const [errored, setErrored] = useState(false);
  const [playing, setPlaying] = useState(false);

  const openOnYoutube = useCallback(() => {
    Linking.openURL(`https://www.youtube.com/watch?v=${youtubeId}`);
  }, [youtubeId]);

  const onError = useCallback(() => {
    setErrored(true);
    setPlaying(false);
  }, []);

  if (errored) {
    return (
      <View style={[styles.wrap, { height: playerHeight }]}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.bgImg} resizeMode="cover" blurRadius={6} />
        ) : null}
        <View style={styles.scrim} />
        <View style={styles.errInner}>
          <Ionicons name="alert-circle-outline" size={32} color="#FFFFFF" />
          <Text style={styles.errTitle}>Video unavailable for in-app playback</Text>
          <Text style={styles.errSub}>This video's embed is restricted by the uploader.</Text>
          <Pressable onPress={openOnYoutube} style={styles.ctaBtn}>
            <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
            <Text style={styles.ctaText}>Watch on YouTube</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height: playerHeight }]}>
      <YoutubePlayer
        height={playerHeight}
        play={playing}
        videoId={youtubeId}
        onError={onError}
        onChangeState={(s: string) => {
          if (s === 'ended') setPlaying(false);
        }}
        webViewProps={{
          androidLayerType: 'hardware',
          allowsFullscreenVideo: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  bgImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  errInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 6,
  },
  errTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  errSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    textAlign: 'center',
  },
  ctaBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF0033',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
