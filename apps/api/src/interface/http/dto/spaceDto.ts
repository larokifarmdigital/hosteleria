import type { Space } from '../../../domain/models/space.js';

// `schedule` se expande a los 7 días (vacíos si no hay turnos) porque la
// UI del backoffice itera siempre la semana completa. Counts a 0 hasta
// que crucemos los repos de dishes/wines/media.
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
