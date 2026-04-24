import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Text, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SwipeHint() {
  const translate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translate, {
            toValue: -6,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(translate, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [translate, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hint,
        { transform: [{ translateX: -40 }, { translateY: translate }], opacity },
      ]}
    >
      <View style={styles.chevrons}>
        <Ionicons name="chevron-up" size={20} color="rgba(255,255,255,0.45)" />
        <Ionicons
          name="chevron-up"
          size={20}
          color="rgba(255,255,255,0.75)"
          style={styles.secondChevron}
        />
      </View>
      <Text style={styles.label}>Swipe up for next</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    bottom: 150,
    left: '50%',
    width: 140,
    alignItems: 'center',
    gap: 2,
  },
  chevrons: {
    alignItems: 'center',
  },
  secondChevron: {
    marginTop: -10,
  },
  label: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
