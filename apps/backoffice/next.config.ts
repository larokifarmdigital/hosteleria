import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

const nextConfig: NextConfig = {
  // Permite compilar a otra carpeta (`NEXT_DIST_DIR=.next-verify`) para verificar el
  // build de producción sin pisar el `.next` de un `next dev` que esté abierto.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  reactStrictMode: true,
  transpilePackages: [],
  // La cookie de sesión vive en el dominio del backoffice (la fija la server
  // action de login), así que el browser no puede enviarla al dominio del api.
  // Con este proxy las llamadas del cliente van al mismo origen y la llevan.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  }
};

export default nextConfig;
