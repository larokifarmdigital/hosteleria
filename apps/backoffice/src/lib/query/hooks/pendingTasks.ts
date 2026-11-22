'use client';

import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { api } from '../../api/browser';
import { qk } from '../keys';

// Siempre al día: la lista cambia con cualquier guardado, en esta pantalla o en otra.
const options = (restaurantSlug: string, stamp = 0) => ({
  queryKey: qk.pendingTasks.byRestaurant(restaurantSlug, stamp),
  queryFn: () => api.pendingTasks(restaurantSlug),
  enabled: Boolean(restaurantSlug),
  staleTime: 0,
  placeholderData: keepPreviousData
});

/** `stamp`: cámbialo cuando el contenido cambie en esta misma pantalla, para volver a preguntar. */
export function usePendingTasks(restaurantSlug: string, stamp = 0) {
  return useQuery(options(restaurantSlug, stamp));
}

export function usePendingTasksOf(restaurantSlugs: string[]) {
  return useQueries({ queries: restaurantSlugs.map(slug => options(slug)) });
}
