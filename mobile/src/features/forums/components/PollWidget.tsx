import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TopicPoll } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  poll: TopicPoll;
  voted: boolean;
  votedIds: number[];
  voting: boolean;
  error: string | null;
  onVote: (optionIds: number[]) => void;
  // Gear menu — Lock Topic
  locked?: boolean;
  lockBusy?: boolean;
  onToggleLock?: () => void | Promise<void>;
}

// Fixed colors for poll-specific signals so results always read the same
// regardless of brand theming.
const POLL_GREEN = '#16A34A';
const POLL_CAST_PINK = '#E03A5C';

export default function PollWidget({
  poll, voted, votedIds, voting, error, onVote,
  locked = false, lockBusy = false, onToggleLock,
}: Props) {
  const total = poll.totalVotes || 0;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selected, setSelected] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleChoice(id: number) {
    if (voting) return;
    setSelected(cur => {
      if (poll.multiple) {
        return cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
      }
      return [id];
    });
  }

  function handleCast() {
    if (voting || selected.length === 0) return;
    onVote(selected);
  }

  async function handleLockPress() {
    setMenuOpen(false);
    if (lockBusy || !onToggleLock) return;
    await onToggleLock();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>POLL</Text>
        <Pressable
          style={styles.gearBtn}
          onPress={() => setMenuOpen(true)}
          disabled={lockBusy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Poll options"
        >
          <Ionicons name="settings-outline" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!!poll.question && (
        <Text style={styles.question}>{poll.question}</Text>
      )}

      {voted ? (
        <View style={styles.results}>
          {poll.options.map(opt => {
            const pct  = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
            const mine = votedIds.includes(opt.id);
            return (
              <View key={opt.id} style={styles.resultRow}>
                <View style={styles.resultTop}>
                  <Text style={styles.resultText} numberOfLines={2}>{opt.text}</Text>
                  <Text style={[
                    styles.resultPct,
                    mine ? { color: colors.primary } : null,
                  ]}>{pct}%</Text>
                </View>
                <View style={styles.resultTrack}>
                  <View
                    style={[
                      styles.resultFill,
                      { width: `${pct}%`, backgroundColor: mine ? colors.primary : POLL_GREEN },
                    ]}
                  />
                </View>
              </View>
            );
          })}
          <Text style={styles.meta}>{total} {total === 1 ? 'vote' : 'votes'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.choices}>
            {poll.options.map(opt => {
              const checked = selected.includes(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleChoice(opt.id)}
                  disabled={voting}
                  style={[
                    styles.choiceRow,
                    checked && styles.choiceRowOn,
                    voting && styles.choiceRowDisabled,
                  ]}
                >
                  <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
                    {checked && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.choiceText} numberOfLines={2}>{opt.text}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleCast}
            disabled={voting || selected.length === 0}
            style={({ pressed }) => [
              styles.castBtn,
              (voting || selected.length === 0) && styles.castBtnDisabled,
              pressed && !voting && selected.length > 0 && styles.castBtnPressed,
            ]}
          >
            {voting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.castBtnText}>CAST VOTE!!</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>*Vote to see the results</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      )}

      {/* Gear menu — simple modal sheet with a Lock/Unlock Topic action */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuWrap} pointerEvents="box-none">
          <View style={styles.menu}>
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={handleLockPress}
              disabled={lockBusy}
            >
              <Ionicons
                name={locked ? 'lock-open-outline' : 'lock-closed-outline'}
                size={15}
                color={colors.text}
              />
              <Text style={styles.menuItemText}>
                {locked ? 'Unlock Topic' : 'Lock Topic'}
              </Text>
              {lockBusy && <ActivityIndicator size="small" color={colors.primary} />}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
      padding: 14,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      color: c.text,
    },
    gearBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    question: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 19,
      marginBottom: 12,
    },
    /* ── Not-voted layout ── */
    choices: { gap: 8 },
    choiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    choiceRowOn: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    choiceRowDisabled: { opacity: 0.6 },
    checkBox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    choiceText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    castBtn: {
      alignSelf: 'flex-start',
      marginTop: 14,
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 100,
      backgroundColor: POLL_CAST_PINK,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 120,
    },
    castBtnPressed: { opacity: 0.88 },
    castBtnDisabled: { opacity: 0.5 },
    castBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    hint: {
      marginTop: 10,
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
    },
    /* ── Voted layout ── */
    results: { gap: 12 },
    resultRow: { gap: 6 },
    resultTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    resultText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
      lineHeight: 17,
    },
    resultPct: {
      fontSize: 12,
      fontWeight: '700',
      color: POLL_GREEN,
    },
    resultTrack: {
      height: 3,
      borderRadius: 2,
      backgroundColor: c.border,
      overflow: 'hidden',
    },
    resultFill: {
      height: '100%',
      borderRadius: 2,
    },
    meta: {
      fontSize: 10.5,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
    },
    error: {
      marginTop: 10,
      backgroundColor: c.dangerSoft,
      color: c.danger,
      fontSize: 11,
      fontWeight: '600',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      overflow: 'hidden',
    },
    /* ── Gear menu modal ── */
    menuBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    menuWrap: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 16,
    },
    menu: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 6,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    menuItemPressed: { backgroundColor: c.surface },
    menuItemText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
  });
}
