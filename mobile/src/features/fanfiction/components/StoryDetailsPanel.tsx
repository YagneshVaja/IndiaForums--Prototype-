import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FanFictionDetail } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  detail: FanFictionDetail;
}

type Styles = ReturnType<typeof makeStyles>;

function formatDate(d: string | null): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 10_000_000) return (n / 10_000_000).toFixed(1).replace(/\.0$/, '') + 'Cr';
  if (n >= 100_000)    return (n / 100_000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (n >= 1_000)      return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function StoryDetailsPanel({ detail }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const allTags = [...new Set([...detail.genres, ...detail.tags])];
  const hasTags = allTags.length > 0;
  const hasBeta = detail.beta.length > 0;

  const badgeCount = [
    !!detail.summary,
    !!detail.warning,
    !!detail.authorNote,
    hasTags,
    detail.entities.length > 0,
    hasBeta,
  ].filter(Boolean).length;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen(o => !o)}
        style={({ pressed }) => [styles.toggle, open && styles.toggleOpen, pressed && styles.pressed]}
      >
        <View style={styles.toggleLeft}>
          <Ionicons name="information-circle-outline" size={16} color={open ? colors.primary : colors.textSecondary} />
          <Text style={[styles.toggleText, open && styles.toggleTextOpen]}>
            {open ? 'Hide details' : 'Story details'}
          </Text>
          {!open && badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          ) : null}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={open ? colors.primary : colors.textSecondary}
        />
      </Pressable>

      {open ? (
        <View style={styles.panel}>
          {detail.summary ? (
            <Section styles={styles} label="Summary">
              <Text style={styles.body}>{detail.summary}</Text>
            </Section>
          ) : null}

          {detail.warning ? (
            <Section styles={styles} label="⚠ Warning">
              <Text style={styles.warning}>{detail.warning}</Text>
            </Section>
          ) : null}

          {detail.authorNote ? (
            <Section styles={styles} label="Author's Note">
              <Text style={styles.body}>{detail.authorNote}</Text>
            </Section>
          ) : null}

          {hasTags ? (
            <Section styles={styles} label={detail.genres.length > 0 ? 'Genres & Tags' : 'Tags'}>
              <View style={styles.tagList}>
                {detail.genres.map((g, i) => (
                  <View key={`g-${i}`} style={styles.tag}>
                    <Text style={styles.tagText}>{g}</Text>
                  </View>
                ))}
                {detail.tags.map((t, i) => (
                  <View key={`t-${i}`} style={styles.tagAlt}>
                    <Text style={styles.tagAltText}>{t}</Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {detail.entities.length > 0 ? (
            <Section styles={styles} label="Related">
              <View style={styles.tagList}>
                {detail.entities.map((e, i) => (
                  <View key={`e-${i}`} style={styles.entityTag}>
                    <Text style={styles.entityTagText}>{e}</Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          {hasBeta ? (
            <Section styles={styles} label="Beta Readers">
              <View style={styles.tagList}>
                {detail.beta.map((b, i) => (
                  <View key={`b-${i}`} style={styles.tagAlt}>
                    <Text style={styles.tagAltText}>{b}</Text>
                  </View>
                ))}
              </View>
            </Section>
          ) : null}

          <Section styles={styles} label="Details">
            <View style={styles.grid}>
              {detail.publishedAt ? <DetailRow styles={styles} label="Published" value={formatDate(detail.publishedAt)} /> : null}
              {detail.createdAt   ? <DetailRow styles={styles} label="Created"   value={formatDate(detail.createdAt)}   /> : null}
              {detail.updatedAt   ? <DetailRow styles={styles} label="Last updated" value={formatDate(detail.updatedAt)} /> : null}
              <DetailRow styles={styles} label="Followers" value={formatCount(detail.followerCount)} />
              <DetailRow styles={styles} label="Comments"  value={formatCount(detail.commentCount)} />
              {detail.rating     ? <DetailRow styles={styles} label="Rating" value={detail.rating} /> : null}
              {detail.type       ? <DetailRow styles={styles} label="Type"   value={detail.type}   /> : null}
              {detail.graphicsBy ? <DetailRow styles={styles} label="Graphics by" value={detail.graphicsBy} /> : null}
              <DetailRow styles={styles} label="Story ID" value={`#${detail.id}`} />
            </View>
          </Section>
        </View>
      ) : null}
    </View>
  );
}

function Section({ styles, label, children }: { styles: Styles; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function DetailRow({ styles, label, value }: { styles: Styles; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginHorizontal: 12,
      marginTop: 8,
      marginBottom: 16,
    },
    toggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    toggleOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    pressed: { opacity: 0.92 },
    toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    toggleText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    toggleTextOpen: { color: c.primary },
    badge: {
      minWidth: 18,
      paddingHorizontal: 5,
      height: 18,
      borderRadius: 9,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: c.onPrimary, fontSize: 10, fontWeight: '800' },
    panel: {
      backgroundColor: c.card,
      borderRadius: 10,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.border,
      padding: 14,
      gap: 14,
    },
    section: { gap: 6 },
    sectionLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    body: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    warning: {
      fontSize: 13,
      color: c.danger,
      lineHeight: 19,
      backgroundColor: c.dangerSoft,
      padding: 10,
      borderRadius: 8,
    },
    tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    tag: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    tagText: { fontSize: 10, fontWeight: '700', color: c.primary },
    tagAlt: {
      backgroundColor: c.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    tagAltText: { fontSize: 10, fontWeight: '600', color: c.textSecondary },
    entityTag: {
      backgroundColor: '#FDF4FF',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    entityTagText: { fontSize: 10, fontWeight: '700', color: '#7E22CE' },
    grid: {
      backgroundColor: c.surface,
      borderRadius: 8,
      padding: 10,
      gap: 5,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    detailLabel: { fontSize: 11, color: c.textTertiary },
    detailValue: { fontSize: 11, fontWeight: '700', color: c.text },
  });
}
