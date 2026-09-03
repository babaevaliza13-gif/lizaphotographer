// Public site content is baked into the bundle at build time from content/site.config.json
// (see scripts/build-content.mjs). No API round-trip is needed to render a page.
import siteContent from "./site.content.js";

export const defaultConfig = siteContent;

const draftKey = "liza-site-config";

export function navItems(config) {
  return [
    { id: "home", label: "Home" },
    ...(config.projects || []).map((project) => ({ id: project.id, label: project.label || project.title || project.type })),
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" }
  ];
}

export function applyTheme(config) {
  const themes = config.appearance?.themes || [];
  const theme = themes.find((item) => item.id === config.appearance?.theme) || themes[0];
  if (!theme) return;
  const root = document.documentElement.style;
  root.setProperty("--ink", theme.ink);
  root.setProperty("--ink-soft", theme.inkSoft);
  root.setProperty("--paper", theme.paper);
  root.setProperty("--paper-deep", theme.paperDeep);
  root.setProperty("--cream", theme.cream);
  root.setProperty("--blush", theme.blush);
  root.setProperty("--white", theme.white);
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- admin helpers (browser only) ---------- */

export function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(draftKey) || "null");
  } catch {
    return null;
  }
}

export function saveDraft(config) {
  try {
    localStorage.setItem(draftKey, JSON.stringify(config));
  } catch {
    /* storage full or unavailable – the remote save is what matters */
  }
}

export function clearDraft() {
  localStorage.removeItem(draftKey);
}

/**
 * Loads the full config (including admin fields) from the API.
 * Resolves { config, source } where source is "remote" or "local".
 */
export async function loadAdminConfig(password = "") {
  try {
    const response = await fetch(`/api/config?ts=${Date.now()}`, {
      cache: "no-store",
      headers: password ? { "x-admin-password": password } : {}
    });
    if (response.ok) {
      const remote = await response.json();
      return { config: mergeConfig(defaultConfig, remote), source: "remote", error: "" };
    }
    const payload = await response.json().catch(() => ({}));
    return { config: mergeConfig(defaultConfig, loadDraft() || {}), source: "local", error: payload.error || `API returned ${response.status}` };
  } catch {
    return { config: mergeConfig(defaultConfig, loadDraft() || {}), source: "local", error: "API is not reachable" };
  }
}

export async function saveConfigRemote(config, password) {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password || ""
    },
    body: JSON.stringify(config)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Could not save (${response.status})`);
  }
  return response.json();
}

export function mergeConfig(base, saved = {}) {
  const merged = {
    ...base,
    ...saved,
    identity: { ...base.identity, ...(saved.identity || {}) },
    appearance: {
      ...base.appearance,
      ...(saved.appearance || {}),
      themes: saved.appearance?.themes?.length ? saved.appearance.themes : base.appearance.themes
    },
    seo: { ...base.seo, ...(saved.seo || {}) },
    contact: {
      ...base.contact,
      ...(saved.contact || {}),
      telegram: { ...(base.contact?.telegram || {}), ...(saved.contact?.telegram || {}) }
    },
    database: { ...base.database, ...(saved.database || {}) },
    admin: { ...(base.admin || {}), ...(saved.admin || {}) },
    images: { ...base.images, ...(saved.images || {}) },
    languages: { en: { ...base.languages.en, ...(saved.languages?.en || {}) } },
    projects: Array.isArray(saved.projects) ? saved.projects : base.projects,
    services: Array.isArray(saved.services) ? saved.services : base.services
  };
  delete merged.nav;
  merged.projects = merged.projects.map(normalizeProject);
  return merged;
}

export function normalizeProject(project, index = 0) {
  const title = String(project.title || "").trim();
  const type = String(project.type || "").trim();
  return {
    id: slugify(project.id || title || `project-${index + 1}`) || `project-${index + 1}`,
    label: String(project.label || "").trim(),
    type,
    title,
    year: String(project.year || "").trim(),
    color: project.color || "#f4eadc",
    video: String(project.video || "").trim(),
    images: (project.images || []).map((src) => String(src || "").trim()).filter(Boolean)
  };
}
