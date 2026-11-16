import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/features/auth/api.js';

export const authKeys = { me: ['auth', 'me'], config: ['auth', 'config'] };

export const useMeQuery = () => useQuery({ queryKey: authKeys.me, queryFn: authApi.fetchMe, retry: false, staleTime: 60_000 });
export const useAuthConfig = () => useQuery({ queryKey: authKeys.config, queryFn: authApi.fetchAuthConfig, staleTime: Infinity });

/**
 * Removes every cached query except the auth ones, so another account never sees old data.
 * (qc.clear() would also detach the active "me" observer and the UI would not update.)
 */
const dropUserData = (qc) => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });

/** Builds a mutation that, on success, drops all cached data so the new account never sees old data. */
function useAuthMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: ({ user }) => {
      dropUserData(qc);
      qc.setQueryData(authKeys.me, { user });
    },
  });
}

export const useAdminLogin = () => useAuthMutation(authApi.loginAdmin);
export const usePasswordLogin = () => useAuthMutation(authApi.loginPassword);
export const useGoogleLogin = () => useAuthMutation(authApi.loginGoogle);

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      dropUserData(qc);
      qc.setQueryData(authKeys.me, { user: null });
    },
  });
}
