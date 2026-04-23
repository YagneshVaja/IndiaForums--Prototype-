import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { useFolders } from '../hooks/useMessages';
import type { PmFolderDto } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (folderId: number | string) => void;
  busy?: boolean;
  title?: string;
}

/**
 * Bottom-sheet picker for PM folders. Folder 0 = Inbox / remove-from-folder.
 */
export default function FolderPickerSheet({
  visible,
  onClose,
  onPick,
  busy,
  title = 'Move to folder',
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const folders = useFolders();

  // Inbox row is synthetic (folderId=0 moves a message out of any folder).
  const rows: (PmFolderDto | { folderId: number; folderName: string; pmCount: number })[] = [
    { folderId: 0, folderName: 'Inbox (no folder)', pmCount: 0 },
    ...(folders.data?.folders ?? []),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} disabled={busy} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          {folders.isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(f) => String(f.folderId)}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              renderItem={({ item }) => {
                const isInbox = Number(item.folderId) === 0;
                return (
                  <Pressable
                    onPress={() => !busy && onPick(item.folderId)}
                    disabled={busy}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  >
                    <View style={styles.iconWrap}>
                      <Ionicons
                        name={isInbox ? 'mail-outline' : 'folder-outline'}
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.body}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.folderName}
                      </Text>
                      {!isInbox ? (
                        <Text style={styles.count}>{String(item.pmCount)} messages</Text>
                      ) : null}
                    </View>
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.state}>
                  <Text style={styles.empty}>No folders yet.</Text>
                </View>
              }
              style={{ maxHeight: 360 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 28,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    title: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    state: {
      padding: 32,
      alignItems: 'center',
    },
    empty: {
      fontSize: 13,
      color: c.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    pressed: { opacity: 0.88 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    count: {
      fontSize: 11,
      color: c.textTertiary,
    },
  });
}
