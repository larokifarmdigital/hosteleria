import 'server-only';
import { Hono } from 'hono';
import { after } from 'next/server';
import { createApp } from './app';

export const API_BASE_PATH = '/api';

/**
 * La app tal como la sirve Next, colgada de `/api`. Las rutas de Hono no llevan
 * ese prefijo (así las pruebas montan `createApp()` tal cual): `mount` lo quita
 * antes de pasarles la petición. Lo que va tras responder sale con `after()`.
 */
export const apiApp = new Hono().mount(
  API_BASE_PATH,
  createApp({ defer: task => after(task), publicBasePath: API_BASE_PATH }).fetch
);
