import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { WebStoryAuthor } from '../../../services/api';

interface Props {
  author: WebStoryAuthor | null;
  timeAgo: string;
  paused: boolean;
  onTogglePause: () => void;
  onClose: () => void;
}

export default function PlayerHeader({
  author,
  timeAgo,
  paused,
  onTogglePause,
  onClose,
}: Props) {
  const displayName = author?.displayName || 'India Forums';
  const initials = author?.initials || 'IF';
  const avatarColors =
    author?.avatarBg.colors ?? (['#3558F0', '#7c3aed'] as [string, string]);

  return (
    <View style={styles.row} pointerEvents="box-none">
      <View style={styles.left} pointerEvents="box-none">
        <LinearGradient
          colors={avatarColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.initials}>{initials}</Text>
        </LinearGradient>
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {author?.groupName ? (
              <View style={styles.groupChip}>
                <Text style={styles.groupChipText} numberOfLines={1}>
                  {author.groupName}
                </Text>
              </View>
            ) : null}
          </View>
          {timeAgo ? <Text style={styles.timeAgo}>{timeAgo}</Text> : null}
        </View>
      </View>

      <View style={styles.right}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          onPress={onTogglePause}
          hitSlop={6}
          accessibilityLabel={paused ? 'Play' : 'Pause'}
        >
          <Ionicons name={paused ? 'play' : 'pause'} size={15} color="#fff" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          onPress={onClose}
          hitSlop={6}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexGrow: 1,
    gap: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  meta: {
    flexShrink: 1,
    flexGrow: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  groupChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  groupChipText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  timeAgo: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10.5,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
});
