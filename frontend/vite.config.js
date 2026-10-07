import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow "<shop-slug>.localhost:5173" so seller storefronts can be tested
    // as real subdomains in dev, mirroring how Shopify stores work in prod.
    allowedHosts: [".localhost"],
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
