import { getStoredFile } from "./_lib/github.js";

export default async function handler(request, response) {
  const rawPath = String(request.query?.path || "");
  const path = rawPath.replace(/^\/+/, "");

  if (!path.startsWith("public/uploads/")) {
    response.status(400).send("Invalid media path");
    return;
  }

  const file = await getStoredFile(path).catch(() => null);
  if (!file?.content) {
    response.status(404).send("Media not found");
    return;
  }

  const bytes = Buffer.from(file.content, "base64");
  response.setHeader("Content-Type", contentType(path));
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  response.status(200).send(bytes);
}

function contentType(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
