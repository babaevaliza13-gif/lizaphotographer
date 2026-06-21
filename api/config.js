import { defaultConfig } from "../src/js/site.config.js";
import { requireAdmin } from "./_lib/auth.js";
import { getStoredConfig, hasGitHubConfig, saveStoredConfig } from "./_lib/github.js";

export default async function handler(request, response) {
  setJson(response);

  if (request.method === "GET") {
    const stored = await getStoredConfig().catch(() => null);
    const config = stored || defaultConfig;
    response.status(200).json((await requireAdmin(request)) ? config : publicConfig(config));
    return;
  }

  if (request.method === "PUT") {
    if (!(await requireAdmin(request))) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasGitHubConfig()) {
      response.status(503).json({ error: "GitHub environment variables are not configured" });
      return;
    }
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    await saveStoredConfig(body);
    response.status(200).json({ ok: true });
    return;
  }

  response.status(405).json({ error: "Method not allowed" });
}

function setJson(response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
}

function publicConfig(config) {
  const clean = structuredClone(config);
  delete clean.admin;
  if (clean.contact?.telegram) clean.contact.telegram = {};
  return clean;
}
