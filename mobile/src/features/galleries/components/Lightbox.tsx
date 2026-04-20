import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { GalleryPhoto } from '../../../services/api';

interface Props {
  visible: boolean;
  photos: GalleryPhoto[];
  initialIndex: number;
  onClose: () => void;
}

const THUMB_SIZE = 46;

export default function Lightbox({ visible, photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [imgFailed, setImgFailed] = useState(false);
  const stripRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setImgFailed(false);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && stripRef.current) {
      stripRef.current.scrollTo({
        x: Math.max(0, index * (THUMB_SIZE + 5) - 120),
        animated: true,
      });
    }
  }, [index, visible]);

  if (!visible || photos.length === 0) return null;

  const photo = photos[index];
  const showImg = !!photo.imageUrl && !imgFailed;

  const change = (newIdx: number) => {
    setImgFailed(false);
    setIndex(newIdx);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.top}>
          <Text style={styles.counter}>{index + 1} / {photos.length}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={[styles.photoWrap, { backgroundColor: photo.bg }]}>
          {showImg ? (
            <Image
              source={{ uri: photo.imageUrl! }}
              style={styles.img}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={120}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Text style={styles.emoji}>{photo.emoji}</Text>
          )}
          {index > 0 ? (
            <Pressable onPress={() => change(index - 1)} style={[styles.nav, styles.navPrev]}>
              <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
          {index < photos.length - 1 ? (
            <Pressable onPress={() => change(index + 1)} style={[styles.nav, styles.navNext]}>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
        </View>

        {(photo.caption || photo.tags.length > 0) ? (
          <View style={styles.caption}>
            {photo.caption ? (
              <Text style={styles.captionText} numberOfLines={3}>{photo.caption}</Text>
            ) : null}
            {photo.tags.length > 0 ? (
              <View style={styles.tags}>
                {photo.tags.map((t) => (
                  <View key={String(t.id)} style={styles.tag}>
                    <Text style={styles.tagText}>{t.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {photos.map((p, i) => {
            const active = i === index;
            return (
              <Pressable
                key={String(p.id)}
                onPress={() => change(i)}
                style={[
                  styles.thumb,
                  { backgroundColor: p.bg },
                  active && styles.thumbActive,
                ]}
              >
                {p.imageUrl ? (
                  <Image
                    source={{ uri: p.imageUrl }}
                    style={styles.thumbImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={styles.thumbEmoji}>{p.emoji}</Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 8,
  },
  counter: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWrap: {
    position: 'relative',
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
  emoji: { fontSize: 72 },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPrev: { left: 8 },
  navNext: { right: 8 },
  caption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  captionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: 'rgba(53,88,240,0.7)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  tagText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  strip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: {
    opacity: 1,
    borderColor: '#3558F0',
    transform: [{ scale: 1.1 }],
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbEmoji: { fontSize: 18 },
});
