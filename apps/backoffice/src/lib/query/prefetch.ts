import type { QueryClient } from '@tanstack/react-query';
import type { ApiClient } from '@hosteleria/api-client';
import { qk } from './keys';

// Sin 'use client' a propósito: los RSC llaman a estas funciones, y Next no
// permite invocar desde el servidor nada exportado por un módulo cliente.

export async function prefetchSession(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({
    queryKey: qk.auth.session(),
    queryFn: () => serverApi.auth.session().then(r => r.user)
  });
}

export async function prefetchDishes(qc: QueryClient, serverApi: ApiClient, filters?: Parameters<ApiClient['dishes']['list']>[0]) {
  await qc.prefetchQuery({
    queryKey: qk.dishes.list(filters),
    queryFn: () => serverApi.dishes.list(filters)
  });
}

export async function prefetchLanguages(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({ queryKey: qk.languages.list(), queryFn: serverApi.languages.list });
}

export async function prefetchMedia(qc: QueryClient, serverApi: ApiClient, filters?: Parameters<ApiClient['media']['list']>[0]) {
  await qc.prefetchQuery({
    queryKey: qk.media.list(filters),
    queryFn: () => serverApi.media.list(filters)
  });
}

export async function prefetchRestaurants(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({ queryKey: qk.restaurants.list(), queryFn: serverApi.restaurants.list });
}

export async function prefetchRestaurant(qc: QueryClient, serverApi: ApiClient, slug: string) {
  await qc.prefetchQuery({
    queryKey: qk.restaurants.detail(slug),
    queryFn: () => serverApi.restaurants.get(slug)
  });
}

export async function prefetchSpaces(qc: QueryClient, serverApi: ApiClient, restaurantSlug: string) {
  await qc.prefetchQuery({
    queryKey: qk.spaces.byRestaurant(restaurantSlug),
    queryFn: () => serverApi.spaces.list(restaurantSlug)
  });
}

export async function prefetchSpace(qc: QueryClient, serverApi: ApiClient, restaurantSlug: string, spaceId: string) {
  await qc.prefetchQuery({
    queryKey: qk.spaces.detail(restaurantSlug, spaceId),
    queryFn: () => serverApi.spaces.get(restaurantSlug, spaceId)
  });
}

export async function prefetchUsers(qc: QueryClient, serverApi: ApiClient) {
  await qc.prefetchQuery({ queryKey: qk.users.list(), queryFn: serverApi.users.list });
}

export async function prefetchWines(qc: QueryClient, serverApi: ApiClient, filters?: Parameters<ApiClient['wines']['list']>[0]) {
  await qc.prefetchQuery({
    queryKey: qk.wines.list(filters),
    queryFn: () => serverApi.wines.list(filters)
  });
}
