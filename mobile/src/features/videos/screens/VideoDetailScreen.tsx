import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Share,
  StyleSheet,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import SectionHeader from '../../../components/ui/SectionHeader';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Video } from '../../../services/api';

import VideoPlayer from '../components/VideoPlayer';
import RelatedVideoCard from '../components/RelatedVideoCard';
import { useVideoDetails } from '../hooks/useVideoDetails';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'VideoDetail'>;
type Rt  = RouteProp<HomeStackParamList, 'VideoDetail'>;

const DESC_LIMIT = 150;

export default function VideoDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const video = route.params.video;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: details } = useVideoDetails(video.id);
  const enriched = useMemo(() => ({ ...video, ...(details || {}) }), [video, details]);

  const [descExpanded, setDescExpanded] = useState(false);
  const shareUrl = `https://www.indiaforums.com/videos/${enriched.id}`;

  const onShare = async () => {
    try {
      await Share.share({ message: `${enriched.title}\n${shareUrl}`, url: shareUrl });
    } catch {}
  };

  const onCopy = async () => {
    try { await Clipboard.setStringAsync(shareUrl); } catch {}
  };

  const onRelatedPress = (v: Video) => {
    navigation.replace('VideoDetail', { video: v });
  };

  const hasDesc = !!enriched.description;
  const shortDesc = hasDesc && enriched.description.length > DESC_LIMIT
    ? enriched.description.slice(0, DESC_LIMIT) + '…'
    : enriched.description;

  const related = details?.relatedVideos || [];

  return (
    <View style={styles.screen}>
      <TopNavBack title="" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {enriched.contentId ? (
          <VideoPlayer youtubeId={enriched.contentId} thumbnail={enriched.thumbnail} />
        ) : (
          <Pressable
            onPress={() => Linking.openURL(shareUrl)}
            style={[styles.fallback, { backgroundColor: enriched.bg }]}
          >
            {enriched.thumbnail ? (
              <Image source={{ uri: enriched.thumbnail }} style={styles.fallbackImg} resizeMode="cover" />
            ) : (
              <Text style={styles.fallbackEmoji}>{enriched.emoji}</Text>
            )}
            <View style={styles.fallbackScrim} />
            <View style={styles.fallbackPlay}>
              <Ionicons name="play" size={28} color="#FFF" />
            </View>
            <Text style={styles.fallbackHint}>Tap to open on indiaforums.com</Text>
          </Pressable>
        )}

        <View style={styles.body}>
          <Text style={styles.breadcrumb}>
            Home <Text style={styles.bcSep}>›</Text> {enriched.catLabel} <Text style={styles.bcSep}>›</Text>{' '}
            <Text style={styles.bcActive}>Videos</Text>
          </Text>

          <Text style={styles.title}>{enriched.title}</Text>

          <View style={styles.metaRow}>
            {enriched.views ? (
              <>
                <View style={styles.metaChip}>
                  <Ionicons name="eye-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{enriched.views} views</Text>
                </View>
                <View style={styles.metaDot} />
              </>
            ) : null}
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{enriched.timeAgo}</Text>
            </View>
            {enriched.duration ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{enriched.duration}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.shareRow}>
            <Text style={styles.shareLabel}>Share:</Text>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#1877F2' }]}>
              <Ionicons name="logo-facebook" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#000' }]}>
              <Ionicons name="logo-twitter" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onShare} style={[styles.shareBtn, { backgroundColor: '#25D366' }]}>
              <Ionicons name="logo-whatsapp" size={14} color="#FFF" />
            </Pressable>
            <Pressable onPress={onCopy} style={[styles.shareBtn, styles.shareBtnCopy]}>
              <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {hasDesc ? (
            <View style={styles.descBlock}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descText}>
                {descExpanded ? enriched.description : shortDesc}
              </Text>
              {enriched.description.length > DESC_LIMIT ? (
                <Pressable onPress={() => setDescExpanded((v) => !v)}>
                  <Text style={styles.readMore}>
                    {descExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                </Pressable>
              ) : null}
              <View style={styles.divider} />
            </View>
          ) : null}

          {related.length > 0 ? (
            <View>
              <SectionHeader title="Related Videos" />
              <View style={styles.relatedList}>
                {related.map((v) => (
                  <RelatedVideoCard key={v.id} video={v} onPress={onRelatedPress} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scrollContent: { paddingBottom: 40 },
    fallback: {
      width: '100%',
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    fallbackEmoji: { fontSize: 80 },
    fallbackScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    fallbackPlay: {
      position: 'absolute',
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center', justifyContent: 'center',
    },
    fallbackHint: {
      position: 'absolute',
      bottom: 10,
      color: '#FFF',
      fontSize: 11,
      fontWeight: '600',
      opacity: 0.9,
    },
    body: { padding: 14, gap: 10 },
    breadcrumb: { fontSize: 11, color: c.textTertiary },
    bcSep: { color: c.textTertiary },
    bcActive: { color: c.text, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: '800', color: c.text, lineHeight: 26 },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: c.textSecondary },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: c.textTertiary },
    shareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    shareLabel: { fontSize: 12, color: c.textSecondary, marginRight: 4 },
    shareBtn: {
      width: 30, height: 30, borderRadius: 15,
      alignItems: 'center', justifyContent: 'center',
    },
    shareBtnCopy: { backgroundColor: c.surface },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 14 },
    descBlock: {},
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.4, marginBottom: 6 },
    descText: { fontSize: 14, color: c.text, lineHeight: 20 },
    readMore: { fontSize: 12, fontWeight: '700', color: c.primary, marginTop: 6 },
    relatedList: { paddingHorizontal: 4 },
  });
}
