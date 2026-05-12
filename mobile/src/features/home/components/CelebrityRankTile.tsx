import React, { memo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { Celebrity } from '../../../services/api';
import TrendBadge from '../../celebrities/components/TrendBadge';
import Initials from '../../celebrities/components/Initials';

interface Props {
  celeb: Celebrity;
  onPress: (celeb: Celebrity) => void;
}

const AVATAR_SIZE = 80;

const MEDAL_BG: Record<1 | 2 | 3, string> = {
  1: '#F5C518',
  2: '#C0C0C0',
  3: '#CD7F32',
};
const MEDAL_EMOJI: Record<1 | 2 | 3, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function CelebrityRankTileImpl({ celeb, onPress }: Props) {
  const styles = useThemedStyles(makeStyles);
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!celeb.thumbnail && !imgFailed;
  const isPodium = celeb.rank >= 1 && celeb.rank <= 3;
  const medalKey = (isPodium ? celeb.rank : 0) as 1 | 2 | 3;

  return (
    <Pressable
      onPress={() => onPress(celeb)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${celeb.name}, rank ${celeb.rank}`}
    >
      <View style={styles.avatarWrap}>
        {showImage ? (
          <Image
            source={{ uri: celeb.thumbnail as string }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <Initials name={celeb.name} size={AVATAR_SIZE} />
        )}

        {isPodium ? (
          <View
            style={[
              styles.medal,
              styles.medalPodium,
              { backgroundColor: MEDAL_BG[medalKey] },
            ]}
          >
            <Text style={styles.medalText}>
              {MEDAL_EMOJI[medalKey]} #{celeb.rank}
            </Text>
          </View>
        ) : (
          <View style={[styles.medal, styles.medalPlain]}>
            <Text style={styles.medalPlainText}>#{celeb.rank}</Text>
          </View>
        )}
      </View>

      <View style={styles.trendWrap}>
        <TrendBadge trend={celeb.trend} rankDiff={celeb.rankDiff} compact />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {celeb.name}
      </Text>
      {celeb.shortDesc ? (
        <Text style={styles.role} numberOfLines={1}>
          {celeb.shortDesc}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default memo(CelebrityRankTileImpl);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    tile: {
      width: 88,
      alignItems: 'center',
    },
    pressed: { opacity: 0.78 },

    avatarWrap: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      position: 'relative',
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: c.surface,
    },

    medal: {
      position: 'absolute',
      bottom: -4,
      right: -2,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: c.card,
    },
    medalPodium: {},
    medalText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#1A1A1A',
      letterSpacing: 0.2,
    },
    medalPlain: {
      backgroundColor: c.surface,
    },
    medalPlainText: {
      fontSize: 10,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 0.2,
    },

    trendWrap: {
      marginTop: 8,
    },
    name: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      lineHeight: 15,
      textAlign: 'center',
    },
    role: {
      marginTop: 1,
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '500',
      textAlign: 'center',
    },
  });
}
