import { useMutation } from '@tanstack/react-query';
import { login, register, forgotPassword } from '../../../services/authApi';
import { setTokens, clearAll, setStoredUser } from '../../../services/tokenStorage';
import { useAuthStore } from '../../../store/authStore';
import type { AuthUser } from '../../../store/authStore';

export function useLogin() {
  const setUser = useAuthStore(s => s.setUser);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login({ email, password }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSuccess: async (data: any) => {
      await setTokens(data.accessToken, data.refreshToken);
      const user: AuthUser = {
        userId:       data.userId ?? data.user?.userId,
        userName:     data.userName ?? data.user?.userName ?? '',
        email:        data.email ?? data.user?.email ?? '',
        groupId:      data.groupId ?? data.user?.groupId ?? null,
        avatarUrl:    data.avatarUrl ?? null,
        avatarAccent: data.avatarAccent ?? null,
      };
      await setStoredUser(user as unknown as Record<string, unknown>);
      setUser(user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: { userName: string; email: string; password: string }) =>
      register(payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => forgotPassword(email),
  });
}

export function useLogout() {
  const logout = useAuthStore(s => s.logout);
  return async () => {
    await clearAll();
    logout();
  };
}
