import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { transitionColor, transitionOpacity } from './themeTransition';

// Absolute-fill overlay driven entirely by UI-thread shared values. It does
// NOT subscribe to the theme store, so the React cascade does not re-render
// it — the overlay stays painting smoothly on the UI thread while JS is
// blocked committing the cascade behind it.
//
// Mount one of these at the app root (covers regular screen content) AND
// one inside each Modal that's on top of the app (e.g. SideMenu) so the
// transition is contiguous across native layer boundaries.
//
// Stacking note: the SideMenu panel uses `elevation: 16` for its drop
// shadow. On Android, elevation creates a draw layer that's painted on
// top of later siblings with lower elevation — so without the explicit
// `elevation` here, the panel would paint *above* our supposedly-opaque
// mask. Bumping the overlay above any elevated chrome (panel=16, FABs,
// etc.) keeps it visually on top across iOS and Android.
const OVERLAY_ELEVATION = 100;
const OVERLAY_Z_INDEX = 9999;

export default function ThemeTransitionOverlay() {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: transitionColor.value,
    opacity: transitionOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: OVERLAY_Z_INDEX, elevation: OVERLAY_ELEVATION },
        animatedStyle,
      ]}
    />
  );
}
