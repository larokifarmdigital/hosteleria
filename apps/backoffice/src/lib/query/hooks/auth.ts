'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

// ─── Fetch functions ──────────────────────────────────────────────
const api = {
  session: () => http.get<{ user: SessionUser | null }>('/auth/session').then(r => r.data.user),
  login: (vars: { email: string; password: string }) =>
    http.post<{ user: SessionUser }>('/auth/login', vars).then(r => r.data.user),
  logout: () => http.post<{ ok: true }>('/auth/logout').then(r => r.data),
  forgot: (email: string) => http.post<{ ok: true }>('/auth/forgot', { email }).then(r => r.data),
  reset: (vars: { token: string; password: string }) =>
    http.post<{ ok: true }>('/auth/reset', vars).then(r => r.data),
  setPassword: (vars: { token: string; password: string }) =>
    http.post<{ ok: true }>('/auth/set-password', vars).then(r => r.data)
};

// ─── Hooks ────────────────────────────────────────────────────────
export function useSession() {
  return useQuery({
    queryKey: qk.auth.session(),
    queryFn: api.session,
    staleTime: Infinity
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (vars: { email: string; password: string; next?: string }) =>
      api.login({ email: vars.email, password: vars.password }),
    onSuccess: (user, vars) => {
      qc.setQueryData(qk.auth.session(), user);
      router.replace(vars.next ?? '/dashboard');
    }
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.clear();
      router.replace('/login');
    }
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: api.forgot });
}

export function useResetPassword() {
  return useMutation({ mutationFn: api.reset });
}

export function useSetPassword() {
  return useMutation({ mutationFn: api.setPassword });
}
