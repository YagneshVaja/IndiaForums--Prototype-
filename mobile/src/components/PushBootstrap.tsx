// mobile/src/components/PushBootstrap.tsx
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../store/authStore';
import {
  registerForPush,
  deregisterFromPush,
  installPushListeners,
  teardownPushListeners,
  handleColdStartTap,
} from '../services/pushNotifications';

export default function PushBootstrap(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const lastAuthRef = useRef<boolean | null>(null);
  const authRef = useRef(isAuthenticated);
  authRef.current = isAuthenticated;

  // Install listeners once on mount.
  useEffect(() => {
    installPushListeners({
      isAuthenticated: () => authRef.current,
      queryClient,
    });
    void handleColdStartTap(() => authRef.current);
    return () => {
      teardownPushListeners();
    };
    // queryClient is stable across the app; effect runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to auth changes: register on login, deregister on logout.
  useEffect(() => {
    const prev = lastAuthRef.current;
    lastAuthRef.current = isAuthenticated;
    if (prev === isAuthenticated) return;

    if (isAuthenticated) {
      void registerForPush();
    } else if (prev === true) {
      // Only deregister on actual transitions (true → false), not initial mount.
      void deregisterFromPush();
    }
  }, [isAuthenticated]);

  return null;
}
