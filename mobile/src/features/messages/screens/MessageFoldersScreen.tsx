import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import { extractApiError } from '../../../services/api';

import {
  useCreateOrUpdateFolder,
  useDeleteFolder,
  useFolders,
} from '../hooks/useMessages';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'MessageFolders'>;

// Per spec: at most 10 folders, folder name up to 10 chars.
const FOLDER_LIMIT = 10;
const NAME_MAX = 10;

export default function MessageFoldersScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useFolders();
  const create = useCreateOrUpdateFolder();
  const del = useDeleteFolder();

  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const folders = q.data?.folders ?? [];
  const atLimit = folders.length >= FOLDER_LIMIT;
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    if (name.length > NAME_MAX) return setError(`Folder name must be ${NAME_MAX} characters or fewer.`);
    if (atLimit) return setError(`You can create at most ${FOLDER_LIMIT} folders.`);
    setError(null);
    try {
      const res = await create.mutateAsync({ folderId: 0, folderName: name });
      if (!res.isSuccess) return setError(res.message || 'Failed to create folder');
      setNewName('');
    } catch (err) {
      setError(extractApiError(err, 'Failed to create folder'));
    }
  };

  const confirmDelete = (folderId: number | string, folderName: string) => {
    Alert.alert(
      `Delete "${folderName}"?`,
      'Messages inside it will be moved out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await del.mutateAsync(folderId);
              if (!res.isSuccess) Alert.alert('Error', res.message);
            } catch (err) {
              Alert.alert('Error', extractApiError(err));
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Folders" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Create form */}
        <View style={styles.addCard}>
          <Text style={styles.fieldLabel}>New folder</Text>
          <View style={styles.addRow}>
            <TextInput
              value={newName}
              onChangeText={(v) => {
                setNewName(v);
                setError(null);
              }}
              placeholder={`Max ${NAME_MAX} chars`}
              placeholderTextColor={colors.textTertiary}
              maxLength={NAME_MAX}
              editable={!atLimit && !create.isPending}
              style={styles.addInput}
              onSubmitEditing={add}
              returnKeyType="done"
            />
            <Pressable
              onPress={add}
              disabled={atLimit || !newName.trim() || create.isPending}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.pressed,
                (atLimit || !newName.trim() || create.isPending) && { opacity: 0.6 },
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.addBtnText}>Add</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {folders.length} of {FOLDER_LIMIT} folders used.
          </Text>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>

        {/* List */}
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : folders.length === 0 ? (
          <EmptyState
            icon="folder-outline"
            title="No folders yet"
            subtitle="Create one above to organize your messages."
          />
        ) : (
          <View style={styles.list}>
            {folders.map((f) => (
              <View key={String(f.folderId)} style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name="folder-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>{f.folderName}</Text>
                  <Text style={styles.rowCount}>{f.pmCount || 0} messages</Text>
                </View>
                <Pressable
                  onPress={() => confirmDelete(f.folderId, f.folderName)}
                  style={({ pressed }) => [styles.delBtn, pressed && styles.pressed]}
                  disabled={del.isPending}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    addCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 14,
      gap: 8,
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    addRow: {
      flexDirection: 'row',
      gap: 8,
    },
    addInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.card,
    },
    addBtn: {
      paddingHorizontal: 18,
      backgroundColor: c.primary,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.onPrimary,
    },
    hint: {
      fontSize: 11,
      color: c.textTertiary,
    },
    err: {
      fontSize: 12,
      color: c.danger,
      fontWeight: '600',
    },
    pressed: { opacity: 0.88 },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowName: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    rowCount: {
      fontSize: 11,
      color: c.textTertiary,
    },
    delBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
    },
  });
}
