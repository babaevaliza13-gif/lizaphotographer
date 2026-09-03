import { defineConfig } from "vite";
import { resolve } from "node:path";

// Clean URLs (/contact, /admin, /login) work on Vercel through vercel.json.
// This tiny middleware makes them work the same way in `vite dev` and `vite preview`.
const cleanUrls = {
  "/contact": "/contact.html",
  "/admin": "/admin.html",
  "/login": "/login.html"
};

function cleanUrlMiddleware(server) {
  server.middlewares.use((request, response, next) => {
    const [path, query] = (request.url || "").split("?");
    const target = cleanUrls[path.replace(/\/$/, "") || "/"];
    if (target) request.url = query ? `${target}?${query}` : target;
    next();
  });
}

const cleanUrlPlugin = {
  name: "clean-urls",
  configureServer: cleanUrlMiddleware,
  configurePreviewServer: cleanUrlMiddleware
};

export default defineConfig({
  appType: "mpa",
  plugins: [cleanUrlPlugin],
  build: {
    target: "es2022",
    cssCodeSplit: false,
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
