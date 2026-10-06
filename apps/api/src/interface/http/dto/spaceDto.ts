import type { Space } from '../../../domain/models/space.js';

/**
 * Serializa `Space` del dominio al shape público. Mantiene el shape que
 * ya consume el backoffice: schedule por día de la semana, counts
 * (dishesCount/winesCount/galleryCount) placeholder en 0 hasta cablear.
 */
export function spaceToDto(s: Space) {
  const schedule = (['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const).map(day => ({
    day,
    shifts: s.schedule.find(d => d.day === day)?.shifts ?? []
  }));
  return {
    id: s.id,
    restaurantId: s.restaurantId,
    slug: s.slug,
    name: s.name,
    type: s.type,
    isDefault: s.isDefault,
    order: s.order,
    state: s.state,
    coverGradient: s.coverGradient,
    descriptor: s.descriptor,
    hero: s.hero,
    manifesto: s.manifesto,
    schedule,
    galleryCount: 0,
    dishesCount: 0,
    winesCount: 0,
    completePercent: 0
  };
}
