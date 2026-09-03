import {
  defaultConfig,
  loadAdminConfig,
  saveConfigRemote,
  saveDraft,
  clearDraft,
  normalizeProject,
  escapeHtml as esc
} from "./site.config.js";

if (sessionStorage.getItem("liza-admin-session") !== "1") {
  location.replace("/login");
}

let adminPassword = sessionStorage.getItem("liza-admin-password") || "";
let mode = "local";
let config = structuredClone(defaultConfig);
let busy = false;

const form = document.querySelector("[data-admin-form]");
const status = document.querySelector("[data-admin-status]");
const modeLabel = document.querySelector("[data-admin-mode]");
const projectsEditor = document.querySelector("[data-projects-editor]");
const languageFields = document.querySelector("[data-language-fields]");
const seoFields = document.querySelector("[data-seo-fields]");
const themeFields = document.querySelector("[data-theme-fields]");
const saveButton = document.querySelector("[data-save]");

await boot();

async function boot() {
  status.textContent = "Loading content...";
  const loaded = await loadAdminConfig(adminPassword);
  config = loaded.config;
  mode = loaded.source;
  config.admin ||= {};
  renderMode(loaded.error);
  renderDynamicEditors();
  fillStaticFields();
  activateSection(location.hash.replace("#", "") || "projects");
  bindEvents();
  status.textContent = mode === "remote" ? "Content loaded from the server." : "Local mode: changes stay in this browser only.";
}

function renderMode(error) {
  if (mode === "remote") {
    modeLabel.textContent = "Connected to GitHub via Vercel API.";
  } else {
    modeLabel.textContent = `Local mode — ${error || "API unavailable"}. Uploads and publishing are disabled.`;
  }
}

/* ---------- events ---------- */

function bindEvents() {
  form.addEventListener("submit", handleSave);
  document.querySelector("[data-reload]").addEventListener("click", reloadFromServer);
  document.querySelector("[data-export]").addEventListener("click", exportConfig);
  document.querySelector("[data-add-project]").addEventListener("click", addProject);
  document.querySelector("[data-test-database]").addEventListener("click", checkServer);
  document.querySelector("[data-logout]").addEventListener("click", () => {
    sessionStorage.removeItem("liza-admin-session");
    sessionStorage.removeItem("liza-admin-password");
    location.replace("/login");
  });
  document.querySelector(".admin-nav").addEventListener("click", handleAdminNav);
  projectsEditor.addEventListener("click", handleProjectClick);
  projectsEditor.addEventListener("change", handleProjectChange);
  projectsEditor.addEventListener("input", handleProjectInput);

  const aboutInput = form.elements["images.about"];
  const aboutThumb = document.querySelector("[data-about-thumb]");
  const aboutFile = document.querySelector("[data-upload-about-input]");
  document.querySelector("[data-upload-about]").addEventListener("click", () => {
    if (mode !== "remote") {
      status.textContent = "Uploads need the Vercel API. Run the site with `vercel dev` or use the deployed admin.";
      return;
    }
    aboutFile.click();
  });
  aboutFile.addEventListener("change", async () => {
    const file = aboutFile.files?.[0];
    aboutFile.value = "";
    if (!file || busy) return;
    setBusy(true);
    status.textContent = `Uploading ${file.name}...`;
    try {
      const url = await uploadImage(await prepareImage(file));
      aboutInput.value = url;
      aboutThumb.src = url;
      status.textContent = "Photo uploaded. Click “Save & publish” to use it on the About page.";
    } catch (error) {
      status.textContent = `Upload failed: ${error.message}`;
    } finally {
      setBusy(false);
    }
  });
  aboutInput.addEventListener("change", () => {
    delete aboutThumb.dataset.retried;
    aboutThumb.removeAttribute("data-broken");
    aboutThumb.src = aboutInput.value.trim();
  });

  form.addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.matches("[data-thumb]")) return;
      const path = new URL(img.src, location.origin).pathname;
      if (!img.dataset.retried && path.startsWith("/uploads/")) {
        img.dataset.retried = "1";
        img.src = `/api/media?path=${encodeURIComponent(`public${path}`)}`;
        return;
      }
      img.setAttribute("data-broken", "");
      img.title = "Image could not be loaded";
    },
    true
  );
  window.addEventListener("hashchange", () => activateSection(location.hash.replace("#", "") || "projects"));
  window.addEventListener("beforeunload", (event) => {
    if (busy) event.preventDefault();
  });
}

function handleAdminNav(event) {
  const link = event.target.closest("a[href^='#']");
  if (!link) return;
  event.preventDefault();
  const section = link.getAttribute("href").slice(1);
  history.pushState(null, "", `#${section}`);
  activateSection(section);
}

function activateSection(section) {
  const target = document.getElementById(section) ? section : "projects";
  document.querySelectorAll(".admin-section").forEach((element) => {
    element.hidden = element.id !== target;
  });
  document.querySelectorAll(".admin-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${target}`);
  });
}

/* ---------- rendering ---------- */

function renderDynamicEditors() {
  themeFields.innerHTML = renderThemeEditor();
  seoFields.innerHTML = renderSeoBlock("en");
  languageFields.innerHTML = renderLanguageBlock("en");
  renderProjects();
}

function renderProjects() {
  projectsEditor.innerHTML = config.projects.length
    ? config.projects.map(renderProjectBlock).join("")
    : `<p class="admin-note">No projects yet. Click “Add project” to create the first section.</p>`;
}

function renderThemeEditor() {
  return config.appearance.themes
    .map(
      (theme, index) => `
        <fieldset class="admin-card theme-card">
          <legend>${esc(theme.name)}</legend>
          <label class="theme-select">
            <input type="radio" name="appearance.theme" value="${esc(theme.id)}" ${config.appearance.theme === theme.id ? "checked" : ""} />
            Use this theme
          </label>
          <label>Name<input name="appearance.themes.${index}.name" value="${esc(theme.name)}" /></label>
          <label>Ink<input type="color" name="appearance.themes.${index}.ink" value="${esc(theme.ink)}" /></label>
          <label>Paper<input type="color" name="appearance.themes.${index}.paper" value="${esc(theme.paper)}" /></label>
          <label>Deep paper<input type="color" name="appearance.themes.${index}.paperDeep" value="${esc(theme.paperDeep)}" /></label>
          <label>Cream<input type="color" name="appearance.themes.${index}.cream" value="${esc(theme.cream)}" /></label>
          <label>Blush<input type="color" name="appearance.themes.${index}.blush" value="${esc(theme.blush)}" /></label>
          <label>White<input type="color" name="appearance.themes.${index}.white" value="${esc(theme.white)}" /></label>
        </fieldset>
      `
    )
    .join("");
}

function renderSeoBlock(lang) {
  return `
    <fieldset class="admin-card">
      <legend>${lang.toUpperCase()}</legend>
      <label>SEO title<input name="seo.${lang}.title" maxlength="70" /></label>
      <label>SEO description<textarea name="seo.${lang}.description" rows="3" maxlength="160"></textarea></label>
    </fieldset>
  `;
}

function renderLanguageBlock(lang) {
  return `
    <fieldset class="admin-card">
      <legend>${lang.toUpperCase()}</legend>
      <label>Home intro line (under the name)<textarea name="languages.${lang}.heroLine" rows="2"></textarea></label>
      <label>Project page label (e.g. “Selected work”)<input name="languages.${lang}.selected" /></label>
      <label>About title<textarea name="languages.${lang}.aboutTitle" rows="2"></textarea></label>
      <label>About text<textarea name="languages.${lang}.aboutText" rows="6"></textarea></label>
      <label>Services intro<textarea name="languages.${lang}.services" rows="3"></textarea></label>
      <label>Contact title<textarea name="languages.${lang}.contactTitle" rows="2"></textarea></label>
      <label>Contact lead<textarea name="languages.${lang}.contactLead" rows="3"></textarea></label>
    </fieldset>
  `;
}

function renderProjectBlock(project, index) {
  const images = project.images
    .map(
      (url, imageIndex) => `
        <div class="image-row">
          <img class="thumb" data-thumb src="${esc(url)}" alt="" loading="lazy" decoding="async" />
          <input data-project-image="${index}" data-image-index="${imageIndex}" value="${esc(url)}" placeholder="https://... or /uploads/..." />
          <div class="image-row-actions">
            <button type="button" data-move-image="${index}" data-image-index="${imageIndex}" data-direction="-1" title="Move up" ${imageIndex === 0 ? "disabled" : ""}>↑</button>
            <button type="button" data-move-image="${index}" data-image-index="${imageIndex}" data-direction="1" title="Move down" ${imageIndex === project.images.length - 1 ? "disabled" : ""}>↓</button>
            <button type="button" data-remove-image="${index}" data-image-index="${imageIndex}">Remove</button>
          </div>
        </div>
      `
    )
    .join("");
  return `
    <fieldset class="admin-card project-card" data-project-card="${index}">
      <legend>${esc(project.label || project.title || "Project")}</legend>
      <label>Menu label<input data-project-field="${index}" data-field="label" value="${esc(project.label)}" placeholder="${esc(project.title || "Section name")}" /></label>
      <label>Slug (URL)<input data-project-field="${index}" data-field="id" value="${esc(project.id)}" placeholder="auto from title" /></label>
      <label>Title<input data-project-field="${index}" data-field="title" value="${esc(project.title)}" required /></label>
      <label>Category line<input data-project-field="${index}" data-field="type" value="${esc(project.type)}" placeholder="Portraits / Event documentation" /></label>
      <label>Year<input data-project-field="${index}" data-field="year" value="${esc(project.year)}" /></label>
      <label>Page color<input data-project-field="${index}" data-field="color" type="color" value="${esc(project.color)}" /></label>
      <label>Video embed URL (optional)<input data-project-field="${index}" data-field="video" value="${esc(project.video || "")}" placeholder="https://player.vimeo.com/video/..." /></label>
      <div class="image-editor">
        <p>Photos (${project.images.length}) — the first one is the cover</p>
        ${images}
        <div class="card-actions">
          <button type="button" data-upload-images="${index}" ${mode === "remote" ? "" : "disabled"}>Upload photos…</button>
          <input type="file" accept="image/*" multiple hidden data-upload-input="${index}" />
          <button type="button" data-add-image="${index}">Add image by URL</button>
        </div>
      </div>
      <div class="card-actions">
        <button type="button" data-move-project="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""}>Move section up</button>
        <button type="button" data-move-project="${index}" data-direction="1" ${index === config.projects.length - 1 ? "disabled" : ""}>Move section down</button>
        <button type="button" data-remove-project="${index}">Remove project</button>
      </div>
    </fieldset>
  `;
}

function fillStaticFields() {
  const values = flattenConfig(config);
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field || field instanceof HTMLFieldSetElement) return;
    if (field instanceof RadioNodeList || "value" in field) field.value = value ?? "";
  });
  form.elements.services.value = (config.services || []).join("\n");
  const aboutThumb = document.querySelector("[data-about-thumb]");
  if (aboutThumb) {
    delete aboutThumb.dataset.retried;
    aboutThumb.removeAttribute("data-broken");
    aboutThumb.src = config.images?.about || "";
  }
}

/* ---------- project editing ---------- */

function syncProjectsFromDom() {
  config.projects = [...projectsEditor.querySelectorAll("[data-project-card]")].map((card) => {
    const index = Number(card.dataset.projectCard);
    const base = structuredClone(config.projects[index] || { images: [] });
    card.querySelectorAll("[data-project-field]").forEach((input) => {
      base[input.dataset.field] = input.value;
    });
    base.images = [...card.querySelectorAll("[data-project-image]")].map((input) => input.value.trim());
    return base;
  });
}

function handleProjectInput(event) {
  const field = event.target.closest("[data-project-field]");
  if (!field) return;
  const card = field.closest("[data-project-card]");
  if (field.dataset.field === "label" || field.dataset.field === "title") {
    const label = card.querySelector("[data-field='label']").value.trim();
    const title = card.querySelector("[data-field='title']").value.trim();
    card.querySelector("legend").textContent = label || title || "Project";
  }
}

function handleProjectChange(event) {
  const fileInput = event.target.closest("[data-upload-input]");
  if (fileInput && fileInput.files?.length) {
    uploadFiles(Number(fileInput.dataset.uploadInput), [...fileInput.files]);
    fileInput.value = "";
    return;
  }
  const urlInput = event.target.closest("[data-project-image]");
  if (urlInput) {
    const thumb = urlInput.closest(".image-row")?.querySelector("[data-thumb]");
    if (thumb) {
      thumb.removeAttribute("data-broken");
      delete thumb.dataset.retried;
      thumb.src = urlInput.value.trim();
    }
  }
}

function handleProjectClick(event) {
  const button = event.target.closest("button");
  if (!button || busy) return;

  if (button.matches("[data-upload-images]")) {
    projectsEditor.querySelector(`[data-upload-input="${button.dataset.uploadImages}"]`)?.click();
    return;
  }

  syncProjectsFromDom();

  if (button.matches("[data-add-image]")) {
    config.projects[Number(button.dataset.addImage)].images.push("");
  } else if (button.matches("[data-remove-image]")) {
    const images = config.projects[Number(button.dataset.removeImage)].images;
    images.splice(Number(button.dataset.imageIndex), 1);
  } else if (button.matches("[data-move-image]")) {
    const images = config.projects[Number(button.dataset.moveImage)].images;
    const from = Number(button.dataset.imageIndex);
    const to = from + Number(button.dataset.direction);
    if (to >= 0 && to < images.length) [images[from], images[to]] = [images[to], images[from]];
  } else if (button.matches("[data-move-project]")) {
    const from = Number(button.dataset.moveProject);
    const to = from + Number(button.dataset.direction);
    if (to >= 0 && to < config.projects.length) {
      [config.projects[from], config.projects[to]] = [config.projects[to], config.projects[from]];
    }
  } else if (button.matches("[data-remove-project]")) {
    const index = Number(button.dataset.removeProject);
    const project = config.projects[index];
    if (!confirm(`Remove “${project.label || project.title}” and its ${project.images.length} photos from the site?`)) return;
    config.projects.splice(index, 1);
  } else {
    return;
  }
  renderProjects();
}

function addProject() {
  if (busy) return;
  syncProjectsFromDom();
  const number = config.projects.length + 1;
  config.projects.push({
    id: `project-${number}`,
    label: "",
    type: "",
    title: `New project ${number}`,
    year: String(new Date().getFullYear()),
    color: "#f4eadc",
    video: "",
    images: []
  });
  renderProjects();
  projectsEditor.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- uploads ---------- */

async function uploadFiles(projectIndex, files) {
  if (mode !== "remote") {
    status.textContent = "Uploads need the Vercel API. Run the site with `vercel dev` or use the deployed admin.";
    return;
  }
  syncProjectsFromDom();
  setBusy(true);
  let done = 0;
  const failures = [];
  for (const file of files) {
    status.textContent = `Uploading ${file.name} (${done + 1}/${files.length})...`;
    try {
      const prepared = await prepareImage(file);
      const url = await uploadImage(prepared);
      config.projects[projectIndex].images.push(url);
      done += 1;
      renderProjects();
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }
  setBusy(false);
  status.textContent =
    `${done} photo${done === 1 ? "" : "s"} uploaded.` +
    (failures.length ? ` Failed — ${failures.join("; ")}.` : "") +
    (done ? " Click “Save & publish” to show them on the site." : "");
}

const maxEdge = 2000;

async function prepareImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  // Keep GIF/SVG as they are; everything else is resized and re-encoded.
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // browser cannot decode (e.g. HEIC) – send as is, server will still accept images
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const webp = await canvasToBlob(canvas, "image/webp", 0.84);
  const blob = webp && webp.type === "image/webp" ? webp : await canvasToBlob(canvas, "image/jpeg", 0.86);
  if (!blob) return file;
  const extension = blob.type === "image/webp" ? ".webp" : ".jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + extension;
  return new File([blob], name, { type: blob.type });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function uploadImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", dataUrl })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `upload failed (${response.status})`);
  }
  const payload = await response.json();
  return payload.url;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- save ---------- */

async function handleSave(event) {
  event.preventDefault();
  if (busy) return;
  const invalid = [...form.querySelectorAll("input, textarea, select")].find((field) => !field.checkValidity());
  if (invalid) {
    const section = invalid.closest(".admin-section");
    if (section) {
      history.replaceState(null, "", `#${section.id}`);
      activateSection(section.id);
    }
    invalid.reportValidity();
    status.textContent = "Please fix the highlighted field.";
    return;
  }

  syncProjectsFromDom();
  const next = structuredClone(config);
  const data = new FormData(form);
  next.appearance.themes = collectThemes(data);

  for (const [key, value] of data.entries()) {
    if (key === "services" || key === "newPassword" || key.startsWith("appearance.themes.")) continue;
    setPath(next, key, typeof value === "string" ? value.trim() : value);
  }

  next.services = String(data.get("services") || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  next.projects = next.projects.map(normalizeProject);
  const problem = validateProjects(next.projects);
  if (problem) {
    status.textContent = problem;
    return;
  }

  const newPassword = String(data.get("newPassword") || "").trim();
  if (newPassword) next.admin.passwordHash = await hashText(newPassword);

  setBusy(true);
  status.textContent = "Saving...";
  config = next;
  saveDraft(config);

  if (mode !== "remote") {
    setBusy(false);
    renderDynamicEditors();
    fillStaticFields();
    status.textContent = "Saved in this browser only (local mode). Publishing needs the Vercel API.";
    return;
  }

  try {
    await saveConfigRemote(config, adminPassword);
    if (newPassword) {
      adminPassword = newPassword;
      sessionStorage.setItem("liza-admin-password", newPassword);
      form.elements.newPassword.value = "";
    }
    clearDraft();
    renderDynamicEditors();
    fillStaticFields();
    status.textContent = `Published ${new Date().toLocaleTimeString()}. Vercel is rebuilding — the site updates in about a minute.`;
  } catch (error) {
    status.textContent = `Not published: ${error.message}. Your changes are kept in this browser — try saving again.`;
  } finally {
    setBusy(false);
  }
}

function validateProjects(projects) {
  const seen = new Set();
  for (const project of projects) {
    if (!project.title) return "Every project needs a title.";
    if (["home", "about", "contact"].includes(project.id)) return `“${project.id}” is a reserved slug — choose another one.`;
    if (seen.has(project.id)) return `Two projects share the slug “${project.id}”. Slugs must be unique.`;
    seen.add(project.id);
  }
  return "";
}

function collectThemes(data) {
  return config.appearance.themes.map((theme, index) => {
    const ink = data.get(`appearance.themes.${index}.ink`) || theme.ink;
    return {
      ...theme,
      name: data.get(`appearance.themes.${index}.name`) || theme.name,
      ink,
      inkSoft: rgbaFromHex(ink, 0.66),
      paper: data.get(`appearance.themes.${index}.paper`) || theme.paper,
      paperDeep: data.get(`appearance.themes.${index}.paperDeep`) || theme.paperDeep,
      cream: data.get(`appearance.themes.${index}.cream`) || theme.cream,
      blush: data.get(`appearance.themes.${index}.blush`) || theme.blush,
      white: data.get(`appearance.themes.${index}.white`) || theme.white
    };
  });
}

async function reloadFromServer() {
  if (busy) return;
  if (!confirm("Discard unsaved changes and reload the published content?")) return;
  clearDraft();
  status.textContent = "Reloading...";
  const loaded = await loadAdminConfig(adminPassword);
  config = loaded.config;
  mode = loaded.source;
  config.admin ||= {};
  renderMode(loaded.error);
  renderDynamicEditors();
  fillStaticFields();
  status.textContent = mode === "remote" ? "Reloaded from the server." : "Reloaded the built-in content (local mode).";
}

function checkServer() {
  const databaseStatus = document.querySelector("[data-database-status]");
  databaseStatus.textContent = "Checking...";
  fetch("/api/status", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((payload) => {
      const github = payload.github || {};
      const notifications = payload.notifications || {};
      const githubOk = github.token && github.owner && github.repo;
      databaseStatus.textContent = [
        githubOk ? `GitHub: connected (${github.branch}, ${github.contentPath}).` : "GitHub: not configured — set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO in Vercel.",
        `Notifications: ${[notifications.telegram && "Telegram", notifications.email && "email"].filter(Boolean).join(" + ") || "none configured"}.`
      ].join(" ");
    })
    .catch(() => {
      databaseStatus.textContent = "API is not available here. Locally run `vercel dev`; on Vercel check the environment variables.";
    });
}

function exportConfig() {
  syncProjectsFromDom();
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "site.config.json";
  link.click();
  URL.revokeObjectURL(url);
}

function setBusy(value) {
  busy = value;
  saveButton.disabled = value;
  saveButton.textContent = value ? "Working..." : "Save & publish";
}

/* ---------- utils ---------- */

function flattenConfig(source, prefix = "", output = {}) {
  Object.entries(source).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenConfig(value, path, output);
    } else {
      output[path] = value;
    }
  });
  return output;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] ||= {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

function rgbaFromHex(hex, alpha) {
  const clean = String(hex || "#211b16").replace("#", "");
  const value = parseInt(clean.length === 3 ? clean.split("").map((item) => item + item).join("") : clean, 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
