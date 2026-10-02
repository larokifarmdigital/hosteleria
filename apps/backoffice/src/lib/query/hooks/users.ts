'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@hosteleria/api-client';
import { http } from '../../api/client';
import { qk } from '../keys';

type CreateInput = {
  email: string;
  password?: string;
  name: string;
  role?: 'admin' | 'editor';
  avatarColor?: string;
  restaurantSlugs?: string[];
};

type PatchInput = {
  name?: string;
  role?: 'admin' | 'editor';
  avatarColor?: string;
  restaurantSlugs?: string[];
  password?: string;
};

const api = {
  list: () => http.get<{ users: User[] }>('/users').then(r => r.data.users),
  create: (body: CreateInput) =>
    http.post<{ user: User }>('/users', body).then(r => r.data.user),
  patch: (id: string, body: PatchInput) =>
    http.patch<{ user: User }>(`/users/${id}`, body).then(r => r.data.user),
  delete: (id: string) => http.delete<{ ok: true }>(`/users/${id}`).then(r => r.data)
};

export function useUsers() {
  return useQuery({ queryKey: qk.users.list(), queryFn: api.list });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all })
  });
}

export function usePatchUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatchInput) => api.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all })
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.users.all })
  });
}
