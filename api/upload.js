import { requireAdmin } from "./_lib/auth.js";
import { hasGitHubConfig, saveUploadedFile } from "./_lib/github.js";

const maxUploadBytes = 4.5 * 1024 * 1024;

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!(await requireAdmin(request))) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!hasGitHubConfig()) {
    response.status(503).json({ error: "GitHub environment variables are not configured" });
    return;
  }

  const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  const { fileName, mimeType, dataUrl } = body || {};
  if (!String(mimeType || "").startsWith("image/") || !String(dataUrl || "").startsWith("data:")) {
    response.status(400).json({ error: "Expected an image data URL" });
    return;
  }

  const base64 = String(dataUrl).split(",")[1] || "";
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > maxUploadBytes) {
    response.status(413).json({ error: "Image is too large. Use an image under 4.5 MB." });
    return;
  }

  const url = await saveUploadedFile({ fileName, mimeType, base64 });
  response.status(200).json({ ok: true, url });
}
