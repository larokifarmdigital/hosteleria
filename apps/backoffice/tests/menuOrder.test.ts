import { describe, it, expect } from 'vitest';
import { assertSameGroup, InvalidReorderError } from '@/core/menu/domain';

const item = (group: string) => ({ group });
const groupOf = (x: { group: string }) => x.group;

describe('lista para reordenar', () => {
  it('válida: devuelve el grupo común', () => {
    expect(assertSameGroup(['a', 'b'], [item('c1'), item('c1')], groupOf)).toBe('c1');
  });

  it('rechaza repetidos, inexistentes y mezclas de sitios', () => {
    expect(() => assertSameGroup(['a', 'a'], [item('c1'), item('c1')], groupOf)).toThrow(InvalidReorderError);
    expect(() => assertSameGroup(['a', 'b'], [item('c1'), null], groupOf)).toThrow(InvalidReorderError);
    expect(() => assertSameGroup(['a', 'b'], [item('c1'), item('c2')], groupOf)).toThrow(InvalidReorderError);
  });
});
