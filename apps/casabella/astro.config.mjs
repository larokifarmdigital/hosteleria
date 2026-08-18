import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Dominio productivo — usar la URL temporal de Vercel hasta comprar `casabella.com`.
  // Cuando se configure el dominio custom, actualizar aquí y re-desplegar.
  site: "https://casabella.vercel.app",
  vite: {
    plugins: [tailwindcss()],
  },
});
