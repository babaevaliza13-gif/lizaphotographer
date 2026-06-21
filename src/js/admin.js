import "../styles/main.css";
import { defaultConfig, loadConfigAsync, saveConfig, saveConfigRemote } from "./site.config.js";

const storageKey = "liza-site-config";
if (sessionStorage.getItem("liza-admin-session") !== "1") {
  location.replace("/login.html");
}

const adminPassword = sessionStorage.getItem("liza-admin-password") || "";
let config = await loadConfigAsync(adminPassword);
config.admin ||= structuredClone(defaultConfig.admin);

const shell = document.querySelector("[data-admin-shell]");
const form = document.querySelector("[data-admin-form]");
const status = document.querySelector("[data-admin-status]");
const projectsEditor = document.querySelector("[data-projects-editor]");
const languageFields = document.querySelector("[data-language-fields]");
const seoFields = document.querySelector("[data-seo-fields]");
const themeFields = document.querySelector("[data-theme-fields]");

init();

function init() {
  renderDynamicEditors();
  fillStaticFields();
  activateSection(location.hash.replace("#", "") || "identity");
  bindEvents();
}

function bindEvents() {
  form.addEventListener("submit", handleSave);
  document.querySelector("[data-reset]").addEventListener("click", resetConfig);
  document.querySelector("[data-export]").addEventListener("click", exportConfig);
  document.querySelector("[data-add-project]").addEventListener("click", addProject);
  document.querySelector("[data-test-database]").addEventListener("click", validateDatabase);
  document.querySelector("[data-logout]").addEventListener("click", () => {
    sessionStorage.removeItem("liza-admin-session");
    location.replace("/login.html");
  });
  document.querySelector(".admin-nav").addEventListener("click", handleAdminNav);
  projectsEditor.addEventListener("click", handleProjectClick);
  projectsEditor.addEventListener("change", handleProjectFile);
  window.addEventListener("hashchange", () => activateSection(location.hash.replace("#", "") || "identity"));
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
  const target = document.getElementById(section) ? section : "identity";
  document.querySelectorAll(".admin-section").forEach((element) => {
    element.hidden = element.id !== target;
  });
  document.querySelectorAll(".admin-nav a").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${target}`);
  });
}

function renderDynamicEditors() {
  themeFields.innerHTML = renderThemeEditor();
  seoFields.innerHTML = renderSeoBlock("en");
  languageFields.innerHTML = renderLanguageBlock("en");
  projectsEditor.innerHTML = config.projects.map(renderProjectBlock).join("");
}

function renderThemeEditor() {
  return config.appearance.themes
    .map(
      (theme, index) => `
        <fieldset class="admin-card theme-card">
          <legend>${theme.name}</legend>
          <label class="theme-select">
            <input type="radio" name="appearance.theme" value="${theme.id}" ${config.appearance.theme === theme.id ? "checked" : ""} />
            Use this theme
          </label>
          <label>Name<input name="appearance.themes.${index}.name" value="${escapeAttr(theme.name)}" /></label>
          <label>Ink<input type="color" name="appearance.themes.${index}.ink" value="${escapeAttr(theme.ink)}" /></label>
          <label>Paper<input type="color" name="appearance.themes.${index}.paper" value="${escapeAttr(theme.paper)}" /></label>
          <label>Deep paper<input type="color" name="appearance.themes.${index}.paperDeep" value="${escapeAttr(theme.paperDeep)}" /></label>
          <label>Cream<input type="color" name="appearance.themes.${index}.cream" value="${escapeAttr(theme.cream)}" /></label>
          <label>Blush<input type="color" name="appearance.themes.${index}.blush" value="${escapeAttr(theme.blush)}" /></label>
          <label>White<input type="color" name="appearance.themes.${index}.white" value="${escapeAttr(theme.white)}" /></label>
        </fieldset>
      `
    )
    .join("");
}

function renderSeoBlock(lang) {
  return `
    <fieldset class="admin-card">
      <legend>${lang.toUpperCase()}</legend>
      <label>SEO title<input name="seo.${lang}.title" /></label>
      <label>SEO description<textarea name="seo.${lang}.description" rows="3"></textarea></label>
    </fieldset>
  `;
}

function renderLanguageBlock(lang) {
  return `
    <fieldset class="admin-card">
      <legend>${lang.toUpperCase()}</legend>
      <label>Hero text<textarea name="languages.${lang}.heroLine" rows="3"></textarea></label>
      <label>Selected label<input name="languages.${lang}.selected" /></label>
      <label>About title<textarea name="languages.${lang}.aboutTitle" rows="2"></textarea></label>
      <label>About text<textarea name="languages.${lang}.aboutText" rows="5"></textarea></label>
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
          <input data-project-image="${index}" data-image-index="${imageIndex}" value="${escapeAttr(url)}" />
          <input type="file" accept="image/*" data-project-upload="${index}" data-image-index="${imageIndex}" />
          <button type="button" data-remove-image="${index}" data-image-index="${imageIndex}">Remove</button>
        </div>
      `
    )
    .join("");
  return `
    <fieldset class="admin-card project-card" data-project-card="${index}">
      <legend>${project.type || "Project"}</legend>
      <label>Slug/id<input data-project-field="${index}" data-field="id" value="${escapeAttr(project.id)}" /></label>
      <label>Type<input data-project-field="${index}" data-field="type" value="${escapeAttr(project.type)}" /></label>
      <label>Title<input data-project-field="${index}" data-field="title" value="${escapeAttr(project.title)}" /></label>
      <label>Year<input data-project-field="${index}" data-field="year" value="${escapeAttr(project.year)}" /></label>
      <label>Page color<input data-project-field="${index}" data-field="color" type="color" value="${escapeAttr(project.color)}" /></label>
      <label>Video iframe URL<input data-project-field="${index}" data-field="video" value="${escapeAttr(project.video || "")}" /></label>
      <div class="image-editor">
        <p>Images</p>
        ${images}
        <button type="button" data-add-image="${index}">Add image</button>
      </div>
      <button type="button" data-remove-project="${index}">Remove project</button>
    </fieldset>
  `;
}

function fillStaticFields() {
  const values = flattenConfig(config);
  Object.entries(values).forEach(([name, value]) => {
    const field = form.elements[name];
    if (!field) return;
    field.value = Array.isArray(value) ? value.join("\n") : value ?? "";
  });
  const services = form.elements.services;
  if (services) services.value = config.services.join("\n");
}

function handleSave(event) {
  event.preventDefault();
  const next = structuredClone(config);
  const data = new FormData(form);
  next.appearance.themes = collectThemes(data);

  for (const [key, value] of data.entries()) {
    if (key === "services" || key === "newPassword" || key.startsWith("appearance.themes.")) continue;
    setPath(next, key, value);
  }

  next.services = String(data.get("services") || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  updateProjectsFromDom(next);

  const newPassword = String(data.get("newPassword") || "");
  if (newPassword) {
    hashText(newPassword).then((hash) => {
      next.admin.passwordHash = hash;
      persist(next, "Saved. New admin password is active.");
      form.elements.newPassword.value = "";
    });
    return;
  }

  persist(next, "Saved. Refresh the public site to see changes.");
}

function collectThemes(data) {
  return config.appearance.themes.map((theme, index) => ({
    ...theme,
    name: data.get(`appearance.themes.${index}.name`) || theme.name,
    ink: data.get(`appearance.themes.${index}.ink`) || theme.ink,
    inkSoft: rgbaFromHex(data.get(`appearance.themes.${index}.ink`) || theme.ink, 0.66),
    paper: data.get(`appearance.themes.${index}.paper`) || theme.paper,
    paperDeep: data.get(`appearance.themes.${index}.paperDeep`) || theme.paperDeep,
    cream: data.get(`appearance.themes.${index}.cream`) || theme.cream,
    blush: data.get(`appearance.themes.${index}.blush`) || theme.blush,
    white: data.get(`appearance.themes.${index}.white`) || theme.white
  }));
}

function updateProjectsFromDom(next) {
  next.projects = [...projectsEditor.querySelectorAll("[data-project-card]")].map((card) => {
    const index = Number(card.dataset.projectCard);
    const base = structuredClone(config.projects[index] || { images: [] });
    card.querySelectorAll("[data-project-field]").forEach((input) => {
      base[input.dataset.field] = input.value;
    });
    base.images = [...card.querySelectorAll("[data-project-image]")]
      .map((input) => input.value.trim())
      .filter(Boolean);
    return base;
  });
}

function handleProjectClick(event) {
  const addImage = event.target.closest("[data-add-image]");
  const removeImage = event.target.closest("[data-remove-image]");
  const removeProject = event.target.closest("[data-remove-project]");

  if (addImage) {
    const index = Number(addImage.dataset.addImage);
    config.projects[index].images.push("");
    renderDynamicEditors();
    fillStaticFields();
  }

  if (removeImage) {
    const projectIndex = Number(removeImage.dataset.removeImage);
    const imageIndex = Number(removeImage.dataset.imageIndex);
    config.projects[projectIndex].images.splice(imageIndex, 1);
    renderDynamicEditors();
    fillStaticFields();
  }

  if (removeProject) {
    const index = Number(removeProject.dataset.removeProject);
    config.projects.splice(index, 1);
    renderDynamicEditors();
    fillStaticFields();
  }
}

async function handleProjectFile(event) {
  const input = event.target.closest("[data-project-upload]");
  if (!input || !input.files?.[0]) return;
  const projectIndex = Number(input.dataset.projectUpload);
  const imageIndex = Number(input.dataset.imageIndex);
  status.textContent = "Uploading image...";
  try {
    const uploadedUrl = await uploadImage(input.files[0]);
    config.projects[projectIndex].images[imageIndex] = uploadedUrl;
    status.textContent = "Image uploaded. Save changes to publish it.";
  } catch {
    const reader = new FileReader();
    reader.onload = () => {
      config.projects[projectIndex].images[imageIndex] = reader.result;
      renderDynamicEditors();
      fillStaticFields();
      status.textContent = "Image loaded locally. Save changes to apply.";
    };
    reader.readAsDataURL(input.files[0]);
    return;
  }
  renderDynamicEditors();
  fillStaticFields();
}

function addProject() {
  config.projects.push({
    id: `project-${config.projects.length + 1}`,
    type: "New Project",
    title: "Untitled",
    year: "2026",
    color: "#ead8c3",
    images: [""]
  });
  renderDynamicEditors();
  fillStaticFields();
}

function validateDatabase() {
  const databaseStatus = document.querySelector("[data-database-status]");
  databaseStatus.textContent = "Checking API...";
  fetch("/api/config", { cache: "no-store" })
    .then((response) => {
      databaseStatus.textContent = response.ok ? "Vercel/GitHub API is reachable." : "API exists but returned an error.";
    })
    .catch(() => {
      databaseStatus.textContent = "API is not available locally. On Vercel, set GitHub environment variables.";
    });
}

function exportConfig() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "liza-site-config.json";
  link.click();
  URL.revokeObjectURL(url);
}

function resetConfig() {
  localStorage.removeItem(storageKey);
  config = structuredClone(defaultConfig);
  renderDynamicEditors();
  fillStaticFields();
  status.textContent = "Reset to defaults.";
}

function persist(next, message) {
  config = next;
  saveConfig(config);
  saveConfigRemote(config, adminPassword)
    .then(() => {
      renderDynamicEditors();
      fillStaticFields();
      status.textContent = message;
    })
    .catch((error) => {
      renderDynamicEditors();
      fillStaticFields();
      status.textContent = `${message} Remote save skipped: ${error.message}`;
    });
}

async function uploadImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl
    })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Upload failed");
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
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function hashText(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeAttr(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
