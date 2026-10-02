'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../../api/endpoints';
import { qk } from '../keys';

/**
 * Lee la sesión actual del api. Útil en el header para mostrar el user
 * logueado o en guards client-side.
 *
 * - `staleTime: Infinity` → la sesión no cambia sin acción explícita.
 * - El 401 ya es manejado por el interceptor de axios → redirige a /login.
 */
export function useSession() {
  return useQuery({
    queryKey: qk.auth.session(),
    queryFn: () => authApi.session(),
    staleTime: Infinity
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (vars: { email: string; password: string; next?: string }) =>
      authApi.login(vars.email, vars.password),
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
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      qc.clear();
      router.replace('/login');
    }
  });
}
