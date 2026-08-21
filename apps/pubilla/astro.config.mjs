import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://lapubilla.vercel.app",
  vite: {
    plugins: [tailwindcss()],
  },
});
