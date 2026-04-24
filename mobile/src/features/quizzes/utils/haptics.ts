import { Platform, Vibration } from 'react-native';

// Quiz-specific haptic feedback using React Native's built-in Vibration API.
// On iOS patterns are ignored (only duration is honoured) — we keep it simple
// with short durations that feel right on both platforms.

export function hapticTap() {
  if (Platform.OS === 'android') Vibration.vibrate(10);
  else Vibration.vibrate();
}

export function hapticCorrect() {
  // Two quick pulses — "ding ding"
  Vibration.vibrate(Platform.OS === 'android' ? [0, 30, 60, 30] : [0, 30, 60, 30]);
}

export function hapticWrong() {
  // One longer pulse — "bzzzt"
  Vibration.vibrate(Platform.OS === 'android' ? 80 : 80);
}

export function hapticFinish() {
  // Three short pulses — "tada!"
  Vibration.vibrate(
    Platform.OS === 'android'
      ? [0, 25, 40, 25, 40, 40]
      : [0, 25, 40, 25, 40, 40],
  );
}

export function hapticTimeout() {
  Vibration.vibrate(100);
}
