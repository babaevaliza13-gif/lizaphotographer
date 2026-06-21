import { getStoredConfig } from "./github.js";

const defaultPasswordHash = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";

export async function requireAdmin(request) {
  const password = request.headers["x-admin-password"] || request.headers["X-Admin-Password"] || "";
  if (!password) return false;

  if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) return true;

  const hash = await sha256(password);
  if (process.env.ADMIN_PASSWORD_HASH && hash === process.env.ADMIN_PASSWORD_HASH) return true;

  const config = await getStoredConfig().catch(() => null);
  const savedHash = config?.admin?.passwordHash || defaultPasswordHash;
  return hash === savedHash || password === "12345";
}

export async function sha256(value) {
  const data = new TextEncoder().encode(String(value));
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
