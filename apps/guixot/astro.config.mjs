import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Dominio productivo — URL temporal de Vercel hasta comprar `guixot.cat`.
  // Cuando se configure el dominio custom, actualizar aquí y re-desplegar.
  site: "https://guixot.vercel.app",
  vite: {
    plugins: [tailwindcss()],
  },
});
