import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Celebrity } from '../../../services/api';
import TrendBadge from './TrendBadge';
import Initials from './Initials';
import { CELEB_TEXT, CELEB_MUTED, CELEB_BORDER } from '../utils/constants';

interface Props {
  celeb: Celebrity;
  onPress: (c: Celebrity) => void;
}

function RankRowImpl({ celeb, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(celeb)}
      android_ripple={{ color: 'rgba(53,88,240,0.12)' }}
    >
      <View style={styles.rankCol}>
        <Text style={styles.rankNum}>{celeb.rank}</Text>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} compact />
      </View>

      <View style={styles.avatar}>
        {celeb.thumbnail ? (
          <Image
            source={{ uri: celeb.thumbnail }}
            style={styles.avatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Initials name={celeb.name} size={44} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{celeb.name}</Text>
        {celeb.shortDesc ? (
          <Text style={styles.desc} numberOfLines={1}>{celeb.shortDesc}</Text>
        ) : celeb.prevRank > 0 ? (
          <Text style={styles.prev}>Last week: #{celeb.prevRank}</Text>
        ) : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const RankRow = React.memo(RankRowImpl);
export default RankRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: CELEB_BORDER,
  },
  rowPressed: {
    backgroundColor: '#F3F4F6',
  },
  rankCol: { width: 36, alignItems: 'center', gap: 2 },
  rankNum: { fontSize: 18, fontWeight: '800', color: CELEB_TEXT },
  avatar:  { width: 44, height: 44 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '700', color: CELEB_TEXT },
  desc: { fontSize: 12, color: CELEB_MUTED },
  prev: { fontSize: 11, color: CELEB_MUTED },
  chevron: { fontSize: 24, color: '#9CA3AF', fontWeight: '300' },
});
