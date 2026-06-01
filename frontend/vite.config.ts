import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Dev server proxy — in production Nginx handles this
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://localhost:51738",
        changeOrigin: true,
        secure: false,
      },
      "/hubs": {
        target: "https://localhost:51738",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "map-vendor": ["leaflet", "react-leaflet"],
          "signalr-vendor": ["@microsoft/signalr"],
        },
      },
    },
  },
});
