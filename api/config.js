import { requireAdmin } from "./_lib/auth.js";
import { getStoredConfig, hasGitHubConfig, saveStoredConfig } from "./_lib/github.js";

// GitHub's contents API cannot read files above 1 MB, so keep the config well below that.
const maxConfigBytes = 800 * 1024;

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  if (!hasGitHubConfig()) {
    response.status(503).json({ error: "GitHub environment variables are not configured" });
    return;
  }

  if (request.method === "GET") {
    let stored;
    try {
      stored = await getStoredConfig();
    } catch (error) {
      response.status(502).json({ error: `GitHub read failed: ${error.message}` });
      return;
    }
    if (!stored) {
      response.status(404).json({ error: "No content file in the repository yet" });
      return;
    }
    response.status(200).json((await requireAdmin(request)) ? stored : publicConfig(stored));
    return;
  }

  if (request.method === "PUT") {
    if (!(await requireAdmin(request))) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    let body;
    try {
      body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    } catch {
      response.status(400).json({ error: "Invalid JSON" });
      return;
    }
    const problem = validate(body);
    if (problem) {
      response.status(400).json({ error: problem });
      return;
    }
    try {
      await saveStoredConfig(body);
    } catch (error) {
      response.status(502).json({ error: `GitHub write failed: ${error.message}` });
      return;
    }
    response.status(200).json({ ok: true });
    return;
  }

  response.status(405).json({ error: "Method not allowed" });
}

function validate(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Expected a config object";
  if (!Array.isArray(body.projects)) return "projects must be an array";
  if (!body.identity?.name) return "identity.name is required";
  const serialized = JSON.stringify(body);
  if (serialized.length > maxConfigBytes) return "Config is too large. Upload photos instead of embedding them.";
  if (/data:image\//.test(serialized)) return "Embedded data: images are not allowed. Upload photos instead.";
  return "";
}

function publicConfig(config) {
  const clean = structuredClone(config);
  delete clean.admin;
  if (clean.contact?.telegram) clean.contact.telegram = {};
  return clean;
}
