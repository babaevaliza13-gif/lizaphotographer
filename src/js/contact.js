import { defaultConfig as config, navItems, applyTheme, escapeHtml as esc } from "./site.config.js";

const form = document.querySelector("[data-static-contact-form]");
const status = document.querySelector("[data-form-status]");
const submitButton = form.querySelector("button[type='submit']");
const copy = config.languages?.en || {};

applyTheme(config);
renderRail();
renderCopy();
renderSessions();
prefillSession();
initMobileMenu();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());

  submitButton.disabled = true;
  status.textContent = "Sending...";

  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Notify API unavailable");
    status.textContent = "Thank you. Your message has been sent.";
    form.reset();
  } catch {
    status.textContent = `Sorry, the message could not be sent right now. Please write directly: ${config.contact?.email || "via Telegram or Instagram"}.`;
  } finally {
    submitButton.disabled = false;
  }
});

function renderRail() {
  const menu = document.querySelector("[data-menu-links]");
  if (menu) {
    menu.innerHTML = navItems(config)
      .map((item) => {
        if (item.id === "contact") return `<a href="/contact" class="is-active" aria-current="page">${esc(item.label)}</a>`;
        if (item.id === "home") return `<a href="/">${esc(item.label)}</a>`;
        return `<a href="/#${esc(item.id)}">${esc(item.label)}</a>`;
      })
      .join("");
  }
  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = config.identity.name;
  const brandName = document.querySelector("[data-brand-name]");
  if (brandName) brandName.textContent = config.identity.name;
  const copyright = document.querySelector("[data-copyright]");
  if (copyright && config.identity.copyright) copyright.textContent = config.identity.copyright;
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
}

function renderCopy() {
  const title = document.querySelector("[data-contact-title]");
  if (title && copy.contactTitle) title.textContent = copy.contactTitle;
  const lead = document.querySelector("[data-contact-lead]");
  if (lead && copy.contactLead) lead.textContent = copy.contactLead;
  document.title = `Contact - ${config.identity.name}`;

  const links = document.querySelector("[data-contact-links]");
  const contact = config.contact || {};
  if (links) {
    links.innerHTML = [
      contact.telegramUrl ? `<a href="${esc(contact.telegramUrl)}" target="_blank" rel="noreferrer">Telegram</a>` : "",
      contact.instagramUrl ? `<a href="${esc(contact.instagramUrl)}" target="_blank" rel="noreferrer">Instagram</a>` : "",
      contact.email ? `<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>` : ""
    ].join("");
  }
}

function renderSessions() {
  const select = document.querySelector("[data-session-select]");
  const services = config.services || [];
  if (!select || !services.length) return;
  select.innerHTML = services.map((service) => `<option>${esc(service)}</option>`).join("");
}

function prefillSession() {
  const session = new URLSearchParams(location.search).get("session");
  const select = document.querySelector("[data-session-select]");
  if (!session || !select) return;
  const option = Array.from(select.options).find((item) => item.value.toLowerCase() === session.toLowerCase());
  if (option) select.value = option.value;
}

function initMobileMenu() {
  const button = document.querySelector("[data-mobile-menu-toggle]");
  const rail = document.querySelector("[data-header]");
  if (!button) return;
  const close = () => {
    document.body.classList.remove("mobile-nav-open");
    button.setAttribute("aria-expanded", "false");
  };
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = document.body.classList.toggle("mobile-nav-open");
    button.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (document.body.classList.contains("mobile-nav-open") && rail && !rail.contains(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.querySelectorAll(".side-nav a").forEach((link) => link.addEventListener("click", close));
}
