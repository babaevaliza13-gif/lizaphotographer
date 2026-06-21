import { requireAdmin } from "./_lib/auth.js";

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ok = await requireAdmin(request);
  response.status(ok ? 200 : 401).json({ ok });
}
