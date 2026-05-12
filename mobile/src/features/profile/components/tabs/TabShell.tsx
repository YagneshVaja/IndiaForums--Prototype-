import React, { ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeStore } from '../../../../store/themeStore';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import ErrorState from '../../../../components/ui/ErrorState';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import { extractApiError } from '../../../../services/api';
import type { Ionicons } from '@expo/vector-icons';

interface Props {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
}

/**
 * Uniform loading/error/empty/content/paginated shell used by every tab.
 * Keeps every tab component focused on rendering its domain rows.
 */
export default function TabShell({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty,
  emptyTitle = 'Nothing here yet',
  emptySubtitle,
  emptyIcon,
  children,
  page,
  totalPages,
  onPageChange,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.centered}>
        <ErrorState message={extractApiError(error)} onRetry={onRetry} />
      </View>
    );
  }
  if (isEmpty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} />;
  }
  return (
    <View>
      {children}
      {page && totalPages && onPageChange ? (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      ) : null}
    </View>
  );
}

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    centered: {
      paddingVertical: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
