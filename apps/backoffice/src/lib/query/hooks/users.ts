'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

type CreateInput = Parameters<ApiClient['users']['create']>[0];
type PatchInput = Parameters<ApiClient['users']['patch']>[1];

export function useUsers() {
  return useQuery({ queryKey: qk.users.list(), queryFn: api.users.list });
}

export function useCreateUser() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: CreateInput) => api.users.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
    onError: toastError
  });
}

export function usePatchUser(id: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (body: PatchInput) => api.users.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
    onError: toastError
  });
}

/** Como `usePatchUser`, para pantallas que editan a cualquiera de la lista. */
export function useUpdateUser() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchInput }) => api.users.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
    onError: toastError
  });
}

/** Enlace nuevo para que el usuario elija su contraseña. */
export function useInviteUser() {
  const toastError = useErrorToast();
  return useMutation({ mutationFn: (id: string) => api.users.invite(id), onError: toastError });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all }),
    onError: toastError
  });
}
