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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Gallery } from '../../../services/api';

import PhotoGrid from '../components/PhotoGrid';
import RelatedGalleryCard from '../components/RelatedGalleryCard';
import Lightbox from '../components/Lightbox';
import { useGalleryDetails } from '../hooks/useGalleryDetails';

const GALLERY_ACCENT = '#D63636';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'GalleryDetail'>;
type Rt  = RouteProp<HomeStackParamList, 'GalleryDetail'>;

export default function GalleryDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const gallery = route.params.gallery;
  const colors = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: details, isLoading } = useGalleryDetails(gallery.id);

  const display = useMemo(() => ({ ...gallery, ...(details || {}) }), [gallery, details]);
  const photos = details?.photos ?? [];
  const count = details?.count ?? gallery.count;

  const [heroFailed, setHeroFailed] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const heroSrc = display.thumbnail && !heroFailed ? display.thumbnail : null;
  const shareUrl = display.pageUrl || `https://www.indiaforums.com/gallery/${display.id}`;

  const onShare = async () => {
    try {
      await Share.share({ message: `${display.title}\n${shareUrl}`, url: shareUrl });
    } catch {}
  };
  const onCopy = async () => {
    try { await Clipboard.setStringAsync(shareUrl); } catch {}
  };
  const openExt = (url: string) => Linking.openURL(url).catch(() => {});

  const onRelatedPress = (g: Gallery) => {
    navigation.push('GalleryDetail', { gallery: g });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCat}>
            {(display.catLabel || 'Gallery').toUpperCase()}
          </Text>
          <Text style={styles.headerCount}>
            {count} photos{display.views ? ` · ${display.views} views` : ''}
          </Text>
        </View>
        <Pressable style={styles.headerBtn} onPress={onShare} hitSlop={8}>
          <Ionicons name="share-social-outline" size={17} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: display.bg }]}>
          {heroSrc ? (
            <Image
              source={{ uri: heroSrc }}
              style={styles.heroImg}
              resizeMode="cover"
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <Text style={styles.heroEmoji}>{display.emoji}</Text>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.75)']}
            style={[StyleSheet.absoluteFill, styles.heroScrim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle} numberOfLines={2}>{display.title}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.85)" />
                <Text style={styles.heroMetaText}>{count} photos</Text>
              </View>
              {display.views ? (
                <>
                  <Text style={styles.heroDot}>·</Text>
                  <View style={styles.heroMetaItem}>
                    <Ionicons name="eye-outline" size={11} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroMetaText}>{display.views} views</Text>
                  </View>
                </>
              ) : null}
              <Text style={styles.heroDot}>·</Text>
              <Text style={styles.heroTime}>{display.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.shareRow}>
          <Text style={styles.shareLabel}>Share:</Text>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#25D366' }]}
            onPress={() => openExt(`https://wa.me/?text=${encodeURIComponent(`${display.title} ${shareUrl}`)}`)}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#000000' }]}
            onPress={() => openExt(`https://twitter.com/intent/tweet?text=${encodeURIComponent(display.title)}&url=${encodeURIComponent(shareUrl)}`)}
          >
            <Text style={styles.xLogo}>X</Text>
          </Pressable>
          <Pressable
            style={[styles.shareCircle, { backgroundColor: '#1877F2' }]}
            onPress={() => openExt(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
          >
            <Ionicons name="logo-facebook" size={15} color="#FFFFFF" />
          </Pressable>
          <Pressable style={[styles.shareCircle, styles.copyBtn]} onPress={onCopy}>
            <Ionicons name="link-outline" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>

        {details && (details.description || details.keywords.length > 0) ? (
          <View style={styles.metaSection}>
            {details.description ? (
              <Text style={styles.description}>{details.description}</Text>
            ) : null}
            {details.keywords.length > 0 ? (
              <View style={styles.keywords}>
                {details.keywords.map((kw) => (
                  <View key={kw} style={styles.keyword}>
                    <Text style={styles.keywordText}>{kw}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.gridHeader}>
            <Text style={styles.gridLabel}>PHOTOS</Text>
            <Text style={styles.gridCount}>{photos.length} of {count}</Text>
          </View>
        ) : null}

        {photos.length > 0 ? (
          <PhotoGrid photos={photos} onPhotoPress={setLightboxIndex} />
        ) : null}

        {!isLoading && photos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No photos available</Text>
          </View>
        ) : null}

        {details?.relatedGalleries && details.relatedGalleries.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.relatedLabel}>MORE GALLERIES</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedScroll}
            >
              {details.relatedGalleries.map((g) => (
                <RelatedGalleryCard key={String(g.id)} gallery={g} onPress={onRelatedPress} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.spacer} />
      </ScrollView>

      <Lightbox
        visible={lightboxIndex !== null}
        photos={photos}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
      />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 8,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 8,
    },
    headerBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
      alignItems: 'center',
    },
    headerCat: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: GALLERY_ACCENT,
    },
    headerCount: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
    },
    scroll: { paddingBottom: 32 },
    hero: {
      position: 'relative',
      height: 200,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroImg: { position: 'absolute', width: '100%', height: '100%' },
    heroEmoji: { fontSize: 56 },
    heroScrim: {
      // gradient applied via LinearGradient component
    },
    heroMeta: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 14,
    },
    heroTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 19,
      marginBottom: 6,
    },
    heroMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      flexWrap: 'wrap',
    },
    heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    heroMetaText: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
    heroDot: { color: 'rgba(255,255,255,0.35)' },
    heroTime: { fontSize: 10.5, color: 'rgba(255,255,255,0.6)' },
    shareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    shareLabel: { fontSize: 11, fontWeight: '700', color: c.textTertiary },
    shareCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copyBtn: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    xLogo: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    metaSection: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 8,
    },
    description: {
      fontSize: 12.5,
      color: c.textSecondary,
      lineHeight: 19,
    },
    keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    keyword: {
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: 'rgba(53,88,240,0.18)',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 12,
    },
    keywordText: { fontSize: 10, fontWeight: '600', color: c.primary },
    gridHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 8,
    },
    gridLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      paddingBottom: 5,
      borderBottomWidth: 2,
      borderBottomColor: GALLERY_ACCENT,
    },
    gridCount: { fontSize: 10, color: c.textTertiary, fontWeight: '500' },
    empty: { paddingVertical: 36, alignItems: 'center', gap: 8 },
    emptyText: { fontSize: 12, color: c.textTertiary },
    related: {
      paddingTop: 16,
      borderTopWidth: 6,
      borderTopColor: c.bg,
    },
    relatedLabel: {
      alignSelf: 'flex-start',
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      marginHorizontal: 14,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: GALLERY_ACCENT,
    },
    relatedScroll: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
    },
    spacer: { height: 24 },
  });
}
