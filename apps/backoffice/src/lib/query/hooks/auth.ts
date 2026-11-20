'use client';

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

export function useSession() {
  return useQuery({
    queryKey: qk.auth.session(),
    queryFn: () => api.auth.session().then(r => r.user),
    staleTime: Infinity
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (vars: { email: string; password: string; next?: string }) =>
      api.auth.login(vars.email, vars.password).then(r => ({ user: r.user, next: vars.next })),
    onSuccess: ({ user, next }) => {
      qc.setQueryData<SessionUser>(qk.auth.session(), user);
      router.replace(next ?? '/dashboard');
    }
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => { qc.clear(); router.replace('/login'); },
    onError: toastError
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => api.auth.forgot(email) });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) =>
      api.auth.reset(vars.token, vars.newPassword)
  });
}

export function useSetPassword() {
  return useMutation({
    mutationFn: (vars: { token: string; newPassword: string }) =>
      api.auth.setPassword(vars.token, vars.newPassword)
  });
}

/** Prefetch para RSC. Pasa el `api` del server (con cookies) y el `qc` creado en server. */
export async function prefetchSession(qc: QueryClient, serverApi: typeof api) {
  await qc.prefetchQuery({
    queryKey: qk.auth.session(),
    queryFn: () => serverApi.auth.session().then(r => r.user)
  });
}
