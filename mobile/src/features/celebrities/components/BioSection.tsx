import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { BioSection as BioSectionData, BioImage } from '../utils/parseBioHtml';
import { SECTION_ICONS } from '../utils/parseBioHtml';
import { CELEB_TEXT, CELEB_MUTED, CELEB_SURFACE, CELEB_BORDER } from '../utils/constants';

interface Props {
  section: BioSectionData;
  onImagePress: (images: BioImage[], index: number) => void;
}

export default function BioSection({ section, onImagePress }: Props) {
  const icon = SECTION_ICONS[section.title] || '📌';
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{section.title}</Text>
      </View>

      {section.items.length > 0 && (
        <View style={styles.items}>
          {section.items.map((it, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.itemLabel}>{it.label}</Text>
              <Text style={styles.itemValue}>{it.value}</Text>
            </View>
          ))}
        </View>
      )}

      {section.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imgRow}
          style={styles.imgStrip}
        >
          {section.images.map((img, i) => (
            <Pressable key={i} onPress={() => onImagePress(section.images, i)}>
              <Image
                source={{ uri: img.src }}
                style={styles.img}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CELEB_SURFACE,
    borderWidth: 1,
    borderColor: CELEB_BORDER,
    borderRadius: 12,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  icon:   { fontSize: 18 },
  title:  { fontSize: 14, fontWeight: '800', color: CELEB_TEXT, letterSpacing: -0.1 },
  items:  { gap: 8 },
  item:   { flexDirection: 'row', gap: 8 },
  itemLabel: { width: 100, fontSize: 12, color: CELEB_MUTED, fontWeight: '600' },
  itemValue: { flex: 1, fontSize: 13, color: CELEB_TEXT, lineHeight: 18 },
  imgStrip:  { marginTop: 12 },
  imgRow:    { gap: 8, paddingRight: 14 },
  img: { width: 120, height: 150, borderRadius: 8, backgroundColor: '#F3F4F6' },
});
