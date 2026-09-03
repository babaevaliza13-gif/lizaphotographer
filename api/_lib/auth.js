import { getStoredConfig } from "./github.js";

// SHA-256 of the initial password "12345". It is only accepted while no other
// password has been saved through the admin panel or set in the environment.
const defaultPasswordHash = "5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5";

export async function requireAdmin(request) {
  const password = String(request.headers["x-admin-password"] || request.headers["X-Admin-Password"] || "");
  if (!password) return false;

  if (process.env.ADMIN_PASSWORD) return safeEqual(password, process.env.ADMIN_PASSWORD);

  const hash = await sha256(password);
  if (process.env.ADMIN_PASSWORD_HASH) return safeEqual(hash, process.env.ADMIN_PASSWORD_HASH.toLowerCase());

  const config = await getStoredConfig().catch(() => null);
  const savedHash = String(config?.admin?.passwordHash || defaultPasswordHash).toLowerCase();
  return safeEqual(hash, savedHash);
}

export async function sha256(value) {
  const data = new TextEncoder().encode(String(value));
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}
