import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        contact: resolve(__dirname, "contact.html"),
        admin: resolve(__dirname, "admin.html"),
        login: resolve(__dirname, "login.html")
      }
    }
  },
  server: {
    port: 5178,
    host: "127.0.0.1"
  },
  preview: {
    host: "127.0.0.1"
  }
});
