import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Forum } from '../../../services/api';
import { formatCount } from '../utils/format';

interface Props {
  forum: Forum;
  onPress: (forum: Forum) => void;
}

function ForumCardImpl({ forum, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(forum)}>
      <View style={[styles.avatar, { backgroundColor: forum.bg }]}>
        {forum.thumbnailUrl ? (
          <Image
            source={{ uri: forum.thumbnailUrl }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Text style={styles.avatarEmoji}>{forum.emoji}</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{forum.name}</Text>
          {forum.hot && <Text style={styles.hot}>🔥</Text>}
        </View>
        <Text style={styles.desc} numberOfLines={2}>{forum.description}</Text>
      </View>

      <View style={styles.stats}>
        <StatCol label="Rank" value={forum.rankDisplay || `#${forum.rank || '–'}`} accent />
        <View style={styles.divider} />
        <StatCol label="Topics" value={formatCount(forum.topicCount)} />
        <View style={styles.divider} />
        <StatCol label="Flwrs" value={formatCount(forum.followCount)} />
      </View>
    </Pressable>
  );
}

const ForumCard = React.memo(ForumCardImpl);
export default ForumCard;

function StatCol({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.statCol}>
      <Text style={[styles.statNum, accent && styles.statNumAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEFF1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    flexShrink: 1,
  },
  hot: {
    fontSize: 12,
  },
  desc: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 2,
    lineHeight: 15,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statCol: {
    alignItems: 'center',
    minWidth: 34,
  },
  statNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statNumAccent: {
    color: '#EA580C',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#A0A0A0',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E2E2',
  },
});
