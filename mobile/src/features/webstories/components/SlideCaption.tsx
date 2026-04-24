import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { WebStorySlide, WebStoryDetail } from '../../../services/api';

interface Props {
  slide: WebStorySlide;
  story: WebStoryDetail;
}

function listItemText(
  item:
    | string
    | { text?: string; title?: string; label?: string },
): string {
  if (typeof item === 'string') return item;
  if (!item) return '';
  return item.text || item.title || item.label || '';
}

export default function SlideCaption({ slide, story }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(), []);

  const showFeatured = slide.isCover && story.featured;
  const showStoryDescription =
    slide.isCover &&
    !!story.description &&
    story.description.trim() !== (slide.caption || '').trim();

  const handleCta = () => {
    if (!slide.actionUrl) return;
    Linking.openURL(slide.actionUrl).catch(() => {
      /* no-op — user feedback isn't critical here */
    });
  };

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {showFeatured ? (
        <View style={[styles.featuredPill, { backgroundColor: colors.primary }]}>
          <Text style={styles.featuredText}>Featured</Text>
        </View>
      ) : null}

      {slide.title ? (
        <Text style={styles.title} numberOfLines={3}>
          {slide.title}
        </Text>
      ) : null}

      {slide.caption ? (
        <Text style={styles.caption} numberOfLines={4}>
          {slide.caption}
        </Text>
      ) : null}

      {showStoryDescription ? (
        <Text style={styles.description} numberOfLines={4}>
          {story.description}
        </Text>
      ) : null}

      {slide.slideAuthor ? (
        <Text style={styles.byline}>— {slide.slideAuthor}</Text>
      ) : null}

      {slide.extra?.kind === 'list' && slide.extra.items.length > 0 ? (
        <View style={styles.listWrap}>
          {slide.extra.items.slice(0, 6).map((item, i) => {
            const text = listItemText(item);
            if (!text) return null;
            return (
              <Text key={i} style={styles.listItem} numberOfLines={2}>
                {`•  ${text}`}
              </Text>
            );
          })}
        </View>
      ) : null}

      {(slide.extra?.kind === 'poll' || slide.extra?.kind === 'quiz') &&
      slide.extra.options.length > 0 ? (
        <View style={styles.listWrap}>
          {slide.extra.options.slice(0, 6).map((opt, i) => {
            const text = listItemText(opt);
            if (!text) return null;
            return (
              <Text key={i} style={styles.optionItem} numberOfLines={2}>
                {text}
              </Text>
            );
          })}
        </View>
      ) : null}

      {slide.actionUrl && slide.actionLabel ? (
        <Pressable
          onPress={handleCta}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.primary },
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>{`${slide.actionLabel}  →`}</Text>
        </Pressable>
      ) : null}

      {slide.mediaCredit ? (
        <Text style={styles.credit}>{`Credit: ${slide.mediaCredit}`}</Text>
      ) : null}
    </View>
  );
}

function makeStyles() {
  return StyleSheet.create({
    wrap: {
      gap: 6,
    },
    featuredPill: {
      alignSelf: 'flex-start',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 6,
      marginBottom: 4,
    },
    featuredText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 24,
      textShadowColor: 'rgba(0,0,0,0.6)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 8,
    },
    caption: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 19,
    },
    description: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
    },
    byline: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
      fontStyle: 'italic',
    },
    listWrap: {
      marginTop: 4,
      gap: 4,
    },
    listItem: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
    },
    optionItem: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    cta: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    ctaPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    ctaText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    credit: {
      marginTop: 4,
      color: 'rgba(255,255,255,0.55)',
      fontSize: 9.5,
      fontWeight: '600',
    },
  });
}
