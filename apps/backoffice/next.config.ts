import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Permite compilar a otra carpeta (`NEXT_DIST_DIR=.next-verify`) para verificar el
  // build de producción sin pisar el `.next` de un `next dev` que esté abierto.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  transpilePackages: [],
  // Sin empaquetar: su logger carga `node:process` con un import dinámico que webpack no sabe seguir.
  serverExternalPackages: ['hono']
};

export default nextConfig;
