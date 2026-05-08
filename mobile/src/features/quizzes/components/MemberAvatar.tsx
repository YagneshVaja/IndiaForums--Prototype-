import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  thumbnail: string | null;
  initials: string;
  gradient: readonly [string, string];
  size: number;
  textStyle?: TextStyle;
  style?: ViewStyle;
}

/**
 * Avatar that prefers an uploaded photo but always falls back to a gradient
 * with initials. Image is overlaid on top of the gradient so a 404 (or a
 * still-loading network response) shows the initials underneath instead of
 * a blank square.
 */
function MemberAvatarImpl({ thumbnail, initials, gradient, size, textStyle, style }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!thumbnail && !imgFailed;
  const radius = size / 2;

  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, styles.host, style]}>
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      >
        <View style={styles.center}>
          <Text style={[{ fontSize: Math.round(size * 0.36) }, styles.initials, textStyle]}>
            {initials}
          </Text>
        </View>
      </LinearGradient>

      {showImage ? (
        <Image
          source={{ uri: thumbnail! }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
          contentFit="cover"
          transition={140}
          onError={() => setImgFailed(true)}
        />
      ) : null}
    </View>
  );
}

export default memo(MemberAvatarImpl);

const styles = StyleSheet.create({
  host: {
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
