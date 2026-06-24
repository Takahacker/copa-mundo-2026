import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path precisa ser "/<nome-do-repositorio>/" para funcionar no GitHub Pages
// (repositório: Takahacker/copa-mundo-2026)
export default defineConfig({
  plugins: [react()],
  base: "/copa-mundo-2026/",
});
