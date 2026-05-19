import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5173 },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    // Minify for smaller initial bundle (YouTube target: < 5 MiB)
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // CRITICAL: Do not inline or remove calls that terser can't see
        // are side-effectful (SDK calls)
        pure_funcs: [],
      },
      mangle: {
        // CRITICAL: Never mangle `ytgame` — it is a global set by the YouTube
        // SDK script. If terser renames references to it inside try/catch
        // blocks the SDK calls will fail silently.
        reserved: ["ytgame"],
      },
    },
    rollupOptions: {
      output: {
        // Ensure filenames use only alphanumeric + _ - . (YouTube requirement)
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});