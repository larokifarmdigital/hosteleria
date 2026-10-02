import { describe, it, expect } from 'vitest';
import { normalizeFilename } from '../src/lib/r2.js';

describe('normalizeFilename', () => {
  it('lowercase + reemplaza espacios por guiones', () => {
    const r = normalizeFilename('Foto Comedor 01.JPG');
    expect(r.name).toBe('foto-comedor-01');
    expect(r.extension).toBe('jpg');
  });

  it('quita acentos', () => {
    const r = normalizeFilename('Avión en el salón.PNG');
    expect(r.name).toBe('avion-en-el-salon');
    expect(r.extension).toBe('png');
  });

  it('quita caracteres especiales', () => {
    const r = normalizeFilename('Foto!!!@#$%^.webp');
    expect(r.name).toBe('foto');
    expect(r.extension).toBe('webp');
  });

  it('maneja archivos sin extensión', () => {
    const r = normalizeFilename('archivosinext');
    expect(r.name).toBe('archivosinext');
    expect(r.extension).toBe('bin');
  });

  it('maneja nombres vacíos tras sanitización', () => {
    const r = normalizeFilename('!!!.jpg');
    expect(r.name).toBe('file');
    expect(r.extension).toBe('jpg');
  });

  it('no se come dobles guiones ni inicia/termina con guión', () => {
    const r = normalizeFilename('---hola---mundo---.jpg');
    expect(r.name).toBe('hola-mundo');
  });
});
