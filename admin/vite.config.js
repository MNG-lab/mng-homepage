import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  server: { host: "127.0.0.1", port: 4190, strictPort: true },
  preview: { host: "127.0.0.1", port: 4191, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL("../dist-admin", import.meta.url)),
    emptyOutDir: true,
  },
});
