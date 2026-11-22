'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { ApiClient, Dish, I18nString, Wine } from '@hosteleria/api-client';
import { api } from '../../api/browser';
import { useErrorToast } from '../../api/errorHandling';
import { qk } from '../keys';

// Mutaciones de la carta que reciben el id en la llamada y no al crear el hook:
// una lista necesita una sola mutación para todas sus filas.

type DishPatch = Parameters<ApiClient['dishes']['patch']>[1];
type WinePatch = Parameters<ApiClient['wines']['patch']>[1];

export function useUpdateDish() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DishPatch }) => api.dishes.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dishes.all }),
    onError: toastError
  });
}

export function useUpdateWine() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: WinePatch }) => api.wines.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}

export function usePatchWineCategory() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: I18nString; order?: number } }) =>
      api.wines.categories.patch(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.wines.all }),
    onError: toastError
  });
}

/**
 * Mostrar u ocultar un plato o vino desde su fila. Optimista: el interruptor
 * cambia al instante en todas las listas cacheadas y vuelve atrás si el api falla.
 */
function useSetActive<T extends { id: string; active: boolean }>(
  listKey: QueryKey,
  allKey: QueryKey,
  patch: (id: string, active: boolean) => Promise<unknown>
) {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => patch(id, active),
    onMutate: async ({ id, active }) => {
      await qc.cancelQueries({ queryKey: listKey });
      const previous = qc.getQueriesData<T[]>({ queryKey: listKey });
      qc.setQueriesData<T[]>({ queryKey: listKey }, old => old?.map(item => (item.id === id ? { ...item, active } : item)));
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      toastError(err);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: allKey })
  });
}

export function useSetDishActive() {
  return useSetActive<Dish>([...qk.dishes.all, 'list'], qk.dishes.all, (id, active) => api.dishes.patch(id, { active }));
}

export function useSetWineActive() {
  return useSetActive<Wine>([...qk.wines.all, 'list'], qk.wines.all, (id, active) => api.wines.patch(id, { active }));
}

/**
 * Cambia el orden de los elementos de una categoría o de las categorías de una carta.
 * La lista se recoloca al momento y, si el api lo rechaza, vuelve a como estaba.
 */
export function useReorderMenu() {
  const qc = useQueryClient();
  const toastError = useErrorToast();
  return useMutation({
    mutationFn: ({ menu, level, ids }: { menu: 'dishes' | 'wines'; level: 'items' | 'categories'; ids: string[] }) =>
      level === 'items' ? api[menu].reorder(ids) : api[menu].categories.reorder(ids),
    onMutate: async ({ menu, ids }) => {
      const queryKey = menu === 'dishes' ? qk.dishes.all : qk.wines.all;
      await qc.cancelQueries({ queryKey });
      const position = new Map(ids.map((id, index) => [id, index]));
      qc.setQueriesData<unknown>({ queryKey }, (old: unknown) =>
        Array.isArray(old)
          ? old.map((x: { id: string; order: number }) => (position.has(x.id) ? { ...x, order: position.get(x.id)! } : x))
          : old
      );
    },
    onError: toastError,
    onSettled: (_data, _err, { menu }) => qc.invalidateQueries({ queryKey: menu === 'dishes' ? qk.dishes.all : qk.wines.all })
  });
}
