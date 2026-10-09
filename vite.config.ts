import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

import { webSearchPlugin } from "./vite-plugin-web-search.ts"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), webSearchPlugin()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
      },
    },
  },
})
