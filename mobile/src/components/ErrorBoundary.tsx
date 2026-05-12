// mobile/src/components/ErrorBoundary.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import type { ThemeColors } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  /** Optional label shown above the error so the user knows what crashed. */
  scope?: string;
}

interface State {
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<Props & { colors: ThemeColors }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn('[ErrorBoundary]', this.props.scope ?? 'unknown', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { colors, children, scope } = this.props;
    if (!error) return children;

    const styles = makeStyles(colors);
    return (
      <View style={styles.wrap}>
        <Ionicons name="alert-circle-outline" size={42} color={colors.danger} />
        <Text style={styles.title}>Something went wrong</Text>
        {scope ? <Text style={styles.scope}>{scope}</Text> : null}
        <Text style={styles.body} numberOfLines={4}>{error.message}</Text>
        <Pressable
          onPress={this.reset}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 10,
    },
    title: { fontSize: 18, fontWeight: '800', color: c.text },
    scope: { fontSize: 12, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    body: { fontSize: 13, color: c.textSecondary, textAlign: 'center', lineHeight: 19, marginVertical: 6 },
    btn: {
      marginTop: 8,
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 10,
    },
    btnText: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  });
}

/**
 * Functional wrapper so we can pull colors from the theme store at render time
 * (class components can't use hooks directly).
 */
export default function ErrorBoundary({ children, scope }: Props) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <ErrorBoundaryClass colors={colors} scope={scope}>
      {children}
    </ErrorBoundaryClass>
  );
}
