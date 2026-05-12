import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export interface UnsupportedEntityPayload {
  title: string;
  entityType: string;
  imageUrl: string | null;
  url: string | null;
}

export interface UnsupportedEntitySheetHandle {
  open: (payload: UnsupportedEntityPayload) => void;
  close: () => void;
}

const UnsupportedEntitySheet = forwardRef<UnsupportedEntitySheetHandle, object>(
  function UnsupportedEntitySheet(_props, ref) {
    const colors = useThemeStore((s) => s.colors);
    const styles = useThemedStyles(makeStyles);
    const sheetRef = useRef<BottomSheet>(null);
    const [payload, setPayload] = useState<UnsupportedEntityPayload | null>(null);

    useImperativeHandle(ref, () => ({
      open: (p) => { setPayload(p); sheetRef.current?.expand(); },
      close: () => sheetRef.current?.close(),
    }), []);

    const renderBackdrop = (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    );

    function handleOpen() {
      // Strip a leading slash so we never produce a double-slashed URL if
      // the API ever starts returning paths with one.
      const path = (payload?.url ?? '').replace(/^\/+/, '');
      void Linking.openURL(`https://www.indiaforums.com/${path}`);
      sheetRef.current?.close();
    }

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={[260]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.body}>
          {payload ? (
            <>
              <View style={styles.header}>
                {payload.imageUrl ? (
                  <Image source={{ uri: payload.imageUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.entityType}>{payload.entityType}</Text>
                  <Text style={styles.title} numberOfLines={2}>{payload.title}</Text>
                </View>
              </View>
              <Text style={styles.body2}>
                We're still building {payload.entityType.toLowerCase()} pages
                in the app. Open it on the web for now.
              </Text>
              <Pressable
                onPress={handleOpen}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel="Open in browser"
              >
                <Ionicons name="open-outline" size={16} color={colors.onPrimary} />
                <Text style={styles.ctaText}>Open in browser</Text>
              </Pressable>
            </>
          ) : null}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

export default UnsupportedEntitySheet;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    body: { padding: 18, gap: 14 },
    header: { flexDirection: 'row', gap: 12 },
    thumb: {
      width: 64, height: 64, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    entityType: {
      fontSize: 11, fontWeight: '700', color: c.primary,
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    title: { fontSize: 15, fontWeight: '600', color: c.text },
    body2: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 12,
    },
    ctaText: { fontSize: 14, fontWeight: '700', color: c.onPrimary },
  });
}
