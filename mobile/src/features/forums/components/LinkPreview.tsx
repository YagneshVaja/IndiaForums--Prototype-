import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useLinkOEmbed } from '../hooks/useLinkOEmbed';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  url: string;
}

/**
 * Rich preview card for a non-social URL shared inside a forum post. Renders
 * a link chip while loading, a full card (image + title + description) when
 * the oEmbed endpoint returns metadata, and a minimal fallback row (domain +
 * URL) when the endpoint has nothing for us but the URL is still valid.
 *
 * Tapping anywhere on the card opens the URL in the device browser.
 */
export default function LinkPreview({ url }: Props) {
  const { data, isLoading } = useLinkOEmbed(url);
  const [imageFailed, setImageFailed] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const open = () => { Linking.openURL(url).catch(() => {}); };

  // While the fetch is in flight, show a compact loading chip so the card
  // doesn't flash from nothing → something. It's intentionally small so it
  // doesn't dominate the post if the oEmbed ultimately has no content.
  if (isLoading) {
    return (
      <View style={styles.loadingChip}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText} numberOfLines={1}>{displayDomain(url)}</Text>
      </View>
    );
  }

  // If the endpoint returned metadata with at least a title OR image, render
  // the full Open Graph card. Otherwise collapse to a lightweight link chip.
  const hasRichCard = !!data && (!!data.title || (!!data.image && !imageFailed));

  if (!hasRichCard) {
    return (
      <Pressable style={styles.chip} onPress={open}>
        <View style={styles.chipIcon}>
          <Ionicons name="link-outline" size={13} color={colors.onPrimary} />
        </View>
        <View style={styles.chipText}>
          <Text style={styles.chipDomain} numberOfLines={1}>
            {data?.domain || displayDomain(url)}
          </Text>
          <Text style={styles.chipUrl} numberOfLines={1}>
            {url.replace(/^https?:\/\/(www\.)?/, '')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
      </Pressable>
    );
  }

  const showImage = !!data!.image && !imageFailed;
  const title     = data!.title || displayDomain(url);
  const domain    = data!.domain || displayDomain(url);

  return (
    <Pressable style={styles.card} onPress={open}>
      {showImage && (
        <Image
          source={{ uri: data!.image! }}
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setImageFailed(true)}
        />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardDomain} numberOfLines={1}>{domain}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        {!!data!.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {data!.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function displayDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    loadingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
    },
    loadingText: {
      fontSize: 11,
      color: c.textTertiary,
      flexShrink: 1,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
    },
    chipIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      flex: 1,
      minWidth: 0,
    },
    chipDomain: {
      fontSize: 12,
      fontWeight: '800',
      color: c.text,
    },
    chipUrl: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 1,
    },
    card: {
      marginTop: 10,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardImage: {
      width: '100%',
      height: 170,
      backgroundColor: c.surface,
    },
    cardBody: {
      padding: 12,
      gap: 4,
    },
    cardDomain: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      lineHeight: 19,
    },
    cardDescription: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
      marginTop: 2,
    },
  });
}
