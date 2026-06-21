import "../styles/main.css";
import { loadConfigAsync } from "./site.config.js";

const config = await loadConfigAsync();
const app = document.querySelector("#app");
const menuLinks = document.querySelector("[data-menu-links]");
const mobileMenuToggle = document.querySelector("[data-mobile-menu-toggle]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImg = document.querySelector("[data-lightbox-img]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");

let currentLang = "en";
let currentRoute = location.hash.replace("#", "") || "home";
let activeImages = [];
let activeImageIndex = 0;

const t = () => config.languages[currentLang] || config.languages.en;
const mediaUrl = (src) => src;

function init() {
  applyTheme();
  renderMenu();
  renderRoute(currentRoute);
  bindGlobalEvents();
  initHeader();
  initCookieConsent();
}

function renderMenu() {
  menuLinks.innerHTML = config.nav
    .map((item) =>
      item.id === "contact"
        ? `<a class="magnetic" href="/contact">${item.label}</a>`
        : `<a class="magnetic" href="#${item.id}" data-route="${item.id}">${item.label}</a>`
    )
    .join("");
}

function renderRoute(route) {
  if (route === "contact") {
    location.href = "/contact";
    return;
  }
  currentRoute = route;
  document.body.dataset.route = route;
  applySeo();
  const project = config.projects.find((item) => item.id === route);

  if (route === "home") renderHome();
  else if (route === "about") renderAbout();
  else if (project) renderProject(project);
  else renderHome();

  window.scrollTo({ top: 0, behavior: "instant" });
  observeReveals();
  bindRouteEvents();
}

function renderHome() {
  const copy = t();
  const allImages = config.projects.flatMap((project) =>
    project.images.map((src, imageIndex) => ({ src, project, imageIndex }))
  );
  activeImages = allImages.map((item) => ({ src: mediaUrl(item.src), caption: `${item.project.type} / ${item.project.title}` }));
  app.innerHTML = `
    <section class="portfolio-stage home-stage page-warm" id="home">
      <div class="stage-intro reveal">
        <p>${config.identity.role} / ${config.identity.location}</p>
        <h1>${config.identity.name}</h1>
        <span>${copy.heroLine}</span>
      </div>
      <div class="horizontal-run" data-gallery>
        ${allImages
          .map(
            (item, index) => `
              <button class="run-image reveal magnetic" type="button" data-index="${index}" style="--page-tint:${item.project.color}">
                <img src="${mediaUrl(item.src)}" alt="${item.project.title} image ${item.imageIndex + 1} by ${config.identity.name}" />
                <span>${item.project.type}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderProject(project) {
  const copy = t();
  const adjacent = config.projects.filter((item) => item.id !== project.id);
  app.innerHTML = `
    <section class="portfolio-stage project-page" style="--page-bg:${project.color}">
      <div class="project-heading reveal">
        <p class="eyebrow">${project.type} / ${project.year}</p>
        <h1>${project.title}</h1>
        <p>${copy.selected}. ${project.type === "Moving Image" ? "A cinematic study in rhythm, texture and presence." : "A quiet sequence of portraits, fragments and staged intimacy."}</p>
      </div>
      ${
        project.video
          ? `<div class="video-frame reveal"><iframe src="${project.video}" title="${project.title}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
          : ""
      }
      <div class="horizontal-run project-run" data-gallery>
        ${project.images
          .map(
            (src, index) => `
              <button class="run-image reveal magnetic" type="button" data-index="${index}" aria-label="Open ${project.title} image ${index + 1}">
                <img src="${mediaUrl(src)}" alt="${project.title} image ${index + 1} by ${config.identity.name}" />
              </button>
            `
          )
          .join("")}
      </div>
      <div class="next-projects reveal">
        ${adjacent
          .map((item) => `<a class="magnetic" href="#${item.id}" data-route="${item.id}">${item.type}<span>${item.title}</span></a>`)
          .join("")}
      </div>
    </section>
  `;
  activeImages = project.images.map((src, index) => ({ src: mediaUrl(src), caption: `${project.title}, ${index + 1}` }));
}

function renderAbout() {
  const copy = t();
  app.innerHTML = `
    <section class="about-page page page-cream">
      <div class="about-grid">
        <div class="about-image reveal" data-float>
          <img src="${config.images.about}" alt="${config.identity.name} photography mood portrait" />
        </div>
        <div class="about-copy reveal">
          <p class="eyebrow">About / Espoo</p>
          <h1>${copy.aboutTitle}</h1>
          <p>${copy.aboutText}</p>
          <p>${copy.services}</p>
          <div class="service-list">
            ${config.services.map((service) => `<span>${service}</span>`).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function applySeo() {
  const seo = config.seo?.[currentLang] || config.seo?.en;
  if (!seo) return;
  document.title = seo.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", seo.description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogTitle) ogTitle.setAttribute("content", seo.title);
  if (ogDescription) ogDescription.setAttribute("content", seo.description);
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const routeLink = event.target.closest("[data-route]");
    if (routeLink) {
      event.preventDefault();
      closeMobileMenu();
      history.pushState(null, "", routeLink.getAttribute("href"));
      renderRoute(routeLink.dataset.route);
    }
  });

  window.addEventListener("popstate", () => renderRoute(location.hash.replace("#", "") || "home"));
  mobileMenuToggle.addEventListener("click", toggleMobileMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
      closeLightbox();
    }
    if (event.key === "ArrowRight" && lightbox.getAttribute("aria-hidden") === "false") showLightbox(activeImageIndex + 1);
    if (event.key === "ArrowLeft" && lightbox.getAttribute("aria-hidden") === "false") showLightbox(activeImageIndex - 1);
  });
  document.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
  document.querySelector("[data-lightbox-next]").addEventListener("click", () => showLightbox(activeImageIndex + 1));
  document.querySelector("[data-lightbox-prev]").addEventListener("click", () => showLightbox(activeImageIndex - 1));
}

function bindRouteEvents() {
  app.querySelectorAll("[data-gallery] .image-tile, [data-gallery] .run-image").forEach((button) => {
    button.addEventListener("click", () => showLightbox(Number(button.dataset.index)));
  });

}

function initCookieConsent() {
  const consent = document.querySelector("[data-cookie-consent]");
  const accept = document.querySelector("[data-cookie-accept]");
  if (!consent || !accept || localStorage.getItem("liza-cookie-consent") === "accepted") return;
  consent.hidden = false;
  accept.addEventListener("click", () => {
    localStorage.setItem("liza-cookie-consent", "accepted");
    consent.hidden = true;
  });
}

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

function toggleMobileMenu() {
  document.body.classList.toggle("mobile-nav-open");
  mobileMenuToggle.setAttribute("aria-expanded", String(document.body.classList.contains("mobile-nav-open")));
}

function closeMobileMenu() {
  document.body.classList.remove("mobile-nav-open");
  mobileMenuToggle.setAttribute("aria-expanded", "false");
}

function showLightbox(index) {
  if (!activeImages.length) return;
  activeImageIndex = (index + activeImages.length) % activeImages.length;
  const item = activeImages[activeImageIndex];
  lightboxImg.src = item.src;
  lightboxImg.alt = item.caption;
  lightboxCaption.textContent = item.caption;
  lightbox.setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  lightbox.setAttribute("aria-hidden", "true");
}

function observeReveals() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );
  app.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function initHeader() {
  window.addEventListener("scroll", () => {
    document.querySelector("[data-header]").classList.toggle("is-scrolled", window.scrollY > 20);
  });
}

init();
