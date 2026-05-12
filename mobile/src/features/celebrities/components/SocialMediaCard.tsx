import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import type { CelebrityBiography } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  biography: CelebrityBiography;
}

export default function SocialMediaCard({ biography }: Props) {
  const styles = useThemedStyles(makeStyles);

  const links: { label: string; icon: string; url: string }[] = [];
  if (biography.instagram) links.push({ label: 'Instagram', icon: '📷', url: `https://instagram.com/${biography.instagram}` });
  if (biography.twitter)   links.push({ label: 'Twitter',   icon: '🐦', url: `https://twitter.com/${biography.twitter}`   });
  if (biography.facebook)  links.push({ label: 'Facebook',  icon: '📘', url: `https://facebook.com/${biography.facebook}` });
  if (links.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔗</Text>
        <Text style={styles.title}>Social Media</Text>
      </View>
      <View style={styles.links}>
        {links.map((l) => (
          <Pressable key={l.label} style={styles.link} onPress={() => Linking.openURL(l.url)}>
            <Text style={styles.linkIcon}>{l.icon}</Text>
            <Text style={styles.linkLabel}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      marginHorizontal: 14,
      marginTop: 10,
      padding: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    icon:   { fontSize: 18 },
    title:  { fontSize: 14, fontWeight: '800', color: c.text },
    links:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.surface,
    },
    linkIcon:  { fontSize: 14 },
    linkLabel: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
  });
}
