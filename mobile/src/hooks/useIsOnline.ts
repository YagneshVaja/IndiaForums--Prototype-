import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Tracks network reachability via @react-native-community/netinfo. Initial
// value optimistically assumes online so first paint doesn't flash an offline
// banner; the first NetInfo event corrects it within ~one tick.
//
// Returns false only when we're certain the device is offline — `isConnected`
// false, OR `isInternetReachable` explicitly false (transport up but no
// internet, e.g. captive WiFi). Null `isInternetReachable` (unknown / probe
// pending) is treated as online to avoid false positives.
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const reachable =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(reachable);
    });
    NetInfo.fetch().then((state) => {
      const reachable =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(reachable);
    });
    return () => unsubscribe();
  }, []);

  return isOnline;
}
