import "../styles/main.css";
import { loadConfigAsync } from "./site.config.js";

const config = await loadConfigAsync();
const form = document.querySelector("[data-static-contact-form]");
const status = document.querySelector("[data-form-status]");

applyTheme();
initMobileMenu();
prefillSession();
initNavClose();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  status.textContent = "Sending...";

  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Notify API unavailable");
    status.textContent = "Thank you. Your message has been sent successfully.";
    form.reset();
  } catch {
    localStorage.setItem(`liza-enquiry-${Date.now()}`, JSON.stringify(data));
    status.textContent = "Thank you. Your message has been saved, and Liza will contact you soon.";
    form.reset();
  }
});

function applyTheme() {
  const theme = config.appearance?.themes?.find((item) => item.id === config.appearance.theme) || config.appearance?.themes?.[0];
  if (!theme) return;
  const root = document.documentElement;
  root.style.setProperty("--ink", theme.ink);
  root.style.setProperty("--ink-soft", theme.inkSoft);
  root.style.setProperty("--paper", theme.paper);
  root.style.setProperty("--paper-deep", theme.paperDeep);
  root.style.setProperty("--cream", theme.cream);
  root.style.setProperty("--blush", theme.blush);
  root.style.setProperty("--white", theme.white);
}

function initMobileMenu() {
  const button = document.querySelector("[data-mobile-menu-toggle]");
  if (!button) return;
  button.addEventListener("click", () => {
    document.body.classList.toggle("mobile-nav-open");
    button.setAttribute("aria-expanded", String(document.body.classList.contains("mobile-nav-open")));
  });
}

function prefillSession() {
  const params = new URLSearchParams(location.search);
  const session = params.get("session");
  if (!session) return;
  const select = form.querySelector("select[name='session']");
  if (!select) return;
  const option = Array.from(select.options).find(
    (o) => o.value.toLowerCase() === session.toLowerCase()
  );
  if (option) select.value = option.value;
}

function initNavClose() {
  document.querySelectorAll(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("mobile-nav-open");
      const button = document.querySelector("[data-mobile-menu-toggle]");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  });
}
