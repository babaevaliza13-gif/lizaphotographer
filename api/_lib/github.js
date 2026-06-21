const apiVersion = "2022-11-28";

export function hasGitHubConfig() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
}

export function contentPath() {
  return process.env.GITHUB_CONTENT_PATH || "content/site.config.json";
}

export function uploadDir() {
  return process.env.GITHUB_UPLOAD_DIR || "public/uploads";
}

export async function getStoredConfig() {
  if (!hasGitHubConfig()) return null;
  const file = await getFile(contentPath()).catch((error) => {
    if (error.status === 404) return null;
    throw error;
  });
  if (!file?.content) return null;
  const json = Buffer.from(file.content, "base64").toString("utf8");
  return JSON.parse(json);
}

export async function saveStoredConfig(config) {
  return putFile({
    path: contentPath(),
    content: JSON.stringify(config, null, 2),
    message: "Update Liza Babaieva site content"
  });
}

export async function saveUploadedFile({ fileName, mimeType, base64 }) {
  const extension = extensionFromName(fileName, mimeType);
  const safeName = slugFileName(fileName.replace(/\.[^.]+$/, "")) || "image";
  const path = `${uploadDir().replace(/\/$/, "")}/${Date.now()}-${safeName}${extension}`;
  await putFile({
    path,
    contentBase64: base64,
    message: `Upload ${fileName || "image"}`
  });
  return `/${path.replace(/^public\//, "")}`;
}

async function getFile(path) {
  return githubRequest(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${encodePath(path)}`);
}

async function putFile({ path, content, contentBase64, message }) {
  const current = await getFile(path).catch((error) => {
    if (error.status === 404) return null;
    throw error;
  });
  return githubRequest(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: contentBase64 || Buffer.from(content, "utf8").toString("base64"),
      sha: current?.sha,
      branch: process.env.GITHUB_BRANCH || undefined
    })
  });
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": apiVersion,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "GitHub request failed");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function encodePath(path) {
  return String(path)
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function slugFileName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extensionFromName(fileName, mimeType) {
  const match = String(fileName || "").match(/\.[a-z0-9]+$/i);
  if (match) return match[0].toLowerCase();
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  return ".jpg";
}
