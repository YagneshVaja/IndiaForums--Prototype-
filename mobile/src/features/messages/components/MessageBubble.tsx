import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import Avatar from '../../profile/components/Avatar';
import { fmtDate, stripHtmlKeepBreaks, timeAgo } from '../../profile/utils/format';
import type { MessageThreadItemDto } from '../types';

interface Props {
  message: MessageThreadItemDto;
  isMine: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onLongPress?: (m: MessageThreadItemDto) => void;
}

function MessageBubbleImpl({
  message,
  isMine,
  isFirstInGroup,
  isLastInGroup,
  onLongPress,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showTime, setShowTime] = useState(false);
  const name = message.displayName || message.userName;
  const body = stripHtmlKeepBreaks(message.message);

  // Asymmetric rounding: the tail corner (bottom-right for mine,
  // bottom-left for theirs) snaps only on the last bubble of a run; internal
  // corners between consecutive same-sender bubbles also snap.
  const RADIUS = 18;
  const SNAP = 4;
  const tailSnap = isLastInGroup;
  const topSnap = !isFirstInGroup;
  const cornerStyle = isMine
    ? {
        borderTopLeftRadius: RADIUS,
        borderTopRightRadius: topSnap ? SNAP : RADIUS,
        borderBottomLeftRadius: RADIUS,
        borderBottomRightRadius: tailSnap ? SNAP : RADIUS,
      }
    : {
        borderTopLeftRadius: topSnap ? SNAP : RADIUS,
        borderTopRightRadius: RADIUS,
        borderBottomLeftRadius: tailSnap ? SNAP : RADIUS,
        borderBottomRightRadius: RADIUS,
      };
  const bubbleShape = [
    styles.bubble,
    isMine ? styles.bubbleMine : styles.bubbleTheirs,
    cornerStyle,
  ];

  return (
    <View
      style={[
        styles.row,
        isMine ? styles.rowMine : styles.rowTheirs,
        isLastInGroup ? styles.rowGapAfter : null,
      ]}
    >
      {!isMine ? (
        <View style={styles.avatarSlot}>
          {isLastInGroup ? (
            <Avatar
              userId={message.fromUserId}
              avatarType={message.avatarType}
              updateChecksum={message.updateChecksum}
              name={name}
              size={32}
            />
          ) : null}
        </View>
      ) : null}
      <View style={styles.bubbleWrap}>
        {!isMine && isFirstInGroup ? (
          <Text style={styles.author} numberOfLines={1}>{name}</Text>
        ) : null}
        <Pressable
          onPress={() => setShowTime((v) => !v)}
          onLongPress={() => onLongPress?.(message)}
          delayLongPress={250}
          style={({ pressed }) => [...bubbleShape, pressed && styles.bubblePressed]}
        >
          <Text style={[styles.body, isMine ? styles.bodyMine : styles.bodyTheirs]}>{body}</Text>
        </Pressable>
        {showTime ? (
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
            {fmtDate(message.messageDate)} · {timeAgo(message.messageDate)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(MessageBubbleImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 2,
      paddingHorizontal: 12,
    },
    rowMine: {
      justifyContent: 'flex-end',
    },
    rowTheirs: {
      justifyContent: 'flex-start',
    },
    rowGapAfter: {
      marginBottom: 6,
    },
    avatarSlot: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    bubbleWrap: {
      maxWidth: '78%',
    },
    author: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
      marginBottom: 3,
      marginLeft: 4,
    },
    bubble: {
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    bubblePressed: {
      opacity: 0.85,
    },
    bubbleMine: {
      backgroundColor: c.primary,
    },
    bubbleTheirs: {
      backgroundColor: c.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
    },
    bodyMine: {
      color: c.onPrimary,
    },
    bodyTheirs: {
      color: c.text,
    },
    time: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 3,
      fontWeight: '600',
    },
    timeMine: {
      textAlign: 'right',
      marginRight: 4,
    },
    timeTheirs: {
      textAlign: 'left',
      marginLeft: 4,
    },
  });
}
