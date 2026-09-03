import { defaultConfig as config, navItems, applyTheme, escapeHtml as esc } from "./site.config.js";

const app = document.querySelector("#app");
const menuLinks = document.querySelector("[data-menu-links]");
const sideRail = document.querySelector("[data-header]");
const mobileMenuToggle = document.querySelector("[data-mobile-menu-toggle]");
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImg = document.querySelector("[data-lightbox-img]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const desktopQuery = window.matchMedia("(min-width: 881px)");

const copy = config.languages?.en || {};
let currentRoute = "";
let activeImages = [];
let activeImageIndex = 0;
let revealObserver = null;

init();

function init() {
  applyTheme(config);
  renderRail();
  renderMenu();
  bindGlobalEvents();
  renderRoute(routeFromHash());
  initCookieConsent();
}

/* ---------- navigation ---------- */

function routeFromHash() {
  return decodeURIComponent(location.hash.replace(/^#\/?/, "")).trim() || "home";
}

function resolveRoute(route) {
  if (route === "home" || route === "about") return route;
  const wanted = route.toLowerCase();
  const project = config.projects.find((item) => item.id.toLowerCase() === wanted);
  return project ? project.id : "home";
}

function renderMenu() {
  menuLinks.innerHTML = navItems(config)
    .map((item) =>
      item.id === "contact"
        ? `<a href="/contact">${esc(item.label)}</a>`
        : `<a href="#${esc(item.id)}" data-route="${esc(item.id)}">${esc(item.label)}</a>`
    )
    .join("");
}

function markActiveLink(route) {
  menuLinks.querySelectorAll("a").forEach((link) => {
    const active = link.dataset.route === route;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function renderRail() {
  const copyright = document.querySelector("[data-copyright]");
  if (copyright && config.identity.copyright) copyright.textContent = config.identity.copyright;
  const brandName = document.querySelector("[data-brand-name]");
  if (brandName) brandName.textContent = config.identity.name;
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = config.identity.name;
}

function renderRoute(requested) {
  const route = resolveRoute(requested);
  if (route !== requested) {
    history.replaceState(null, "", route === "home" ? location.pathname : `#${route}`);
  }
  currentRoute = route;
  document.body.dataset.page = route;
  closeMobileMenu();

  const project = config.projects.find((item) => item.id === route);
  if (route === "home") renderHome();
  else if (route === "about") renderAbout();
  else renderProject(project);

  applySeo(project);
  markActiveLink(route);
  window.scrollTo({ top: 0, behavior: "instant" });
  observeReveals();
  bindRouteEvents();
}

/* ---------- pages ---------- */

function coverOf(project) {
  return project.images[0] || "";
}

function renderHome() {
  const projects = config.projects.filter((project) => project.images.length);
  activeImages = [];
  app.innerHTML = `
    <section class="portfolio-stage home-stage" id="home">
      <div class="horizontal-run" data-gallery>
        <div class="stage-intro reveal">
          <p class="eyebrow">${esc(config.identity.role)}${config.identity.location ? ` / ${esc(config.identity.location)}` : ""}</p>
          <h1>${esc(config.identity.name)}</h1>
          ${copy.heroLine ? `<span>${esc(copy.heroLine)}</span>` : ""}
        </div>
        ${projects
          .map(
            (project, index) => `
              <a class="run-image cover-tile reveal" href="#${esc(project.id)}" data-route="${esc(project.id)}" style="--page-tint:${esc(project.color)}" aria-label="Open ${esc(project.label || project.title)}">
                <img src="${esc(coverOf(project))}" alt="${esc(project.title)} — ${esc(project.type)}" ${imageLoadingAttrs(index)} />
                <span>${esc(project.label || project.title)}</span>
              </a>
            `
          )
          .join("")}
        ${projects.length ? "" : `<p class="empty-note">No projects published yet.</p>`}
      </div>
    </section>
  `;
}

function renderProject(project) {
  const others = config.projects.filter((item) => item.id !== project.id && item.images.length);
  activeImages = project.images.map((src, index) => ({ src, caption: `${project.title}, ${index + 1} / ${project.images.length}` }));

  app.innerHTML = `
    <section class="portfolio-stage project-page" style="--page-bg:${esc(project.color)}">
      <div class="horizontal-run project-run" data-gallery>
        <div class="project-heading reveal">
          <p class="eyebrow">${esc([project.type, project.year].filter(Boolean).join(" / "))}</p>
          <h1>${esc(project.title)}</h1>
          ${copy.selected ? `<p>${esc(copy.selected)}</p>` : ""}
          <p class="run-hint" aria-hidden="true">Scroll to explore →</p>
        </div>
        ${
          project.video
            ? `<div class="video-frame reveal"><iframe src="${esc(project.video)}" title="${esc(project.title)} video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
            : ""
        }
        ${project.images
          .map(
            (src, index) => `
              <button class="run-image strip-image reveal" type="button" data-index="${index}" aria-label="Open ${esc(project.title)} image ${index + 1}">
                <img src="${esc(src)}" alt="${esc(project.title)} image ${index + 1} by ${esc(config.identity.name)}" ${imageLoadingAttrs(index)} />
              </button>
            `
          )
          .join("")}
      </div>
    </section>
    ${
      others.length
        ? `
      <section class="next-projects-section">
        <p class="eyebrow">More work</p>
        <div class="next-projects">
          ${others
            .map(
              (item) => `
                <a class="next-card" href="#${esc(item.id)}" data-route="${esc(item.id)}">
                  <img src="${esc(coverOf(item))}" alt="" loading="lazy" decoding="async" />
                  <span>${esc(item.label || item.type)}</span>
                  <strong>${esc(item.title)}</strong>
                </a>
              `
            )
            .join("")}
        </div>
      </section>`
        : ""
    }
  `;
}

function renderAbout() {
  activeImages = [];
  const services = config.services || [];
  app.innerHTML = `
    <section class="about-page page page-cream">
      <div class="about-grid">
        <div class="about-image reveal">
          <img src="${esc(config.images?.about || coverOf(config.projects[0] || { images: [] }))}" alt="${esc(config.identity.name)}" decoding="async" />
        </div>
        <div class="about-copy reveal">
          <p class="eyebrow">About${config.identity.location ? ` / ${esc(config.identity.location.split(",")[0])}` : ""}</p>
          ${copy.aboutTitle ? `<h1>${esc(copy.aboutTitle)}</h1>` : `<h1 class="visually-hidden">${esc(config.identity.name)}</h1>`}
          ${copy.aboutText ? paragraphs(copy.aboutText) : ""}
          ${copy.services ? `<p>${esc(copy.services)}</p>` : ""}
          ${
            services.length
              ? `<div class="service-list">${services
                  .map((service) => `<a class="service-tag" href="/contact?session=${encodeURIComponent(service)}">${esc(service)}</a>`)
                  .join("")}</div>`
              : ""
          }
          <a class="btn-book" href="/contact">Book a session →</a>
        </div>
      </div>
    </section>
  `;
}

function paragraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block.trim()).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function imageLoadingAttrs(index) {
  return index === 0
    ? 'fetchpriority="high" decoding="async"'
    : index < 3
      ? 'decoding="async"'
      : 'loading="lazy" decoding="async"';
}

/* ---------- seo ---------- */

function applySeo(project) {
  const seo = config.seo?.en || {};
  const baseTitle = seo.title || `${config.identity.name} - ${config.identity.role}`;
  let title = baseTitle;
  let description = seo.description || "";
  if (project) {
    title = `${project.title} - ${config.identity.name}`;
    description = `${project.title}. ${project.type}${project.year ? `, ${project.year}` : ""}. ${config.identity.role} ${config.identity.name}.`;
  } else if (currentRoute === "about") {
    title = `About - ${config.identity.name}`;
    description = copy.aboutText ? copy.aboutText.slice(0, 155) : description;
  }
  document.title = title;
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  applyJsonLd();
}

function setMeta(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute("content", value);
}

function applyJsonLd() {
  const [locality, country] = String(config.identity.location || "").split(",").map((part) => part.trim());
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: config.identity.name,
    jobTitle: config.identity.role,
    url: location.origin,
    sameAs: [config.contact?.instagramUrl, config.contact?.telegramUrl].filter(Boolean)
  };
  if (config.contact?.email) data.email = config.contact.email;
  if (locality) data.address = { "@type": "PostalAddress", addressLocality: locality, ...(country ? { addressCountry: country } : {}) };
  let script = document.querySelector("script[data-jsonld]");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.jsonld = "";
    document.head.append(script);
  }
  script.textContent = JSON.stringify(data);
}

/* ---------- events ---------- */

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-mobile-menu-toggle]")) return;

    const routeLink = event.target.closest("[data-route]");
    if (routeLink) {
      event.preventDefault();
      navigateTo(routeLink.dataset.route);
      return;
    }

    if (document.body.classList.contains("mobile-nav-open") && !sideRail.contains(event.target)) {
      closeMobileMenu();
    }
  });

  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    if (resolveRoute(route) !== currentRoute) renderRoute(route);
  });

  mobileMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
      closeLightbox();
    }
    if (lightbox.getAttribute("aria-hidden") === "false") {
      if (event.key === "ArrowRight") showLightbox(activeImageIndex + 1);
      if (event.key === "ArrowLeft") showLightbox(activeImageIndex - 1);
    }
  });

  document.querySelector("[data-lightbox-close]").addEventListener("click", closeLightbox);
  document.querySelector("[data-lightbox-next]").addEventListener("click", () => showLightbox(activeImageIndex + 1));
  document.querySelector("[data-lightbox-prev]").addEventListener("click", () => showLightbox(activeImageIndex - 1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  // Mouse wheel scrolls the horizontal gallery on desktop.
  app.addEventListener(
    "wheel",
    (event) => {
      if (!desktopQuery.matches || event.shiftKey || event.ctrlKey) return;
      const stage = event.target.closest(".portfolio-stage");
      if (!stage) return;
      const maxScroll = stage.scrollWidth - stage.clientWidth;
      if (maxScroll <= 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const goingForward = event.deltaY > 0;
      const atEnd = goingForward && stage.scrollLeft >= maxScroll - 1;
      const atStart = !goingForward && stage.scrollLeft <= 0;
      if (atEnd || atStart) return;
      event.preventDefault();
      stage.scrollLeft += event.deltaY;
    },
    { passive: false }
  );
}

function navigateTo(route) {
  const target = resolveRoute(route);
  const hash = target === "home" ? "" : `#${target}`;
  if (target === currentRoute) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeMobileMenu();
    return;
  }
  if (hash) {
    location.hash = hash; // triggers hashchange -> renderRoute
  } else {
    history.pushState(null, "", location.pathname);
    renderRoute("home");
  }
}

function bindRouteEvents() {
  app.querySelectorAll("[data-gallery] .strip-image").forEach((button) => {
    button.addEventListener("click", () => showLightbox(Number(button.dataset.index)));
  });
}

window.addEventListener("popstate", () => {
  const route = routeFromHash();
  if (resolveRoute(route) !== currentRoute) renderRoute(route);
});

/* ---------- ui helpers ---------- */

function initCookieConsent() {
  const consent = document.querySelector("[data-cookie-consent]");
  const accept = document.querySelector("[data-cookie-accept]");
  let accepted = false;
  try {
    accepted = localStorage.getItem("liza-cookie-consent") === "accepted";
  } catch {
    accepted = true;
  }
  if (!consent || !accept || accepted) return;
  consent.hidden = false;
  accept.addEventListener("click", () => {
    try {
      localStorage.setItem("liza-cookie-consent", "accepted");
    } catch {
      /* ignore */
    }
    consent.hidden = true;
  });
}

function toggleMobileMenu() {
  const open = document.body.classList.toggle("mobile-nav-open");
  mobileMenuToggle.setAttribute("aria-expanded", String(open));
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
  document.body.classList.add("lightbox-open");
  // warm up neighbours so arrow navigation feels instant
  [activeImageIndex + 1, activeImageIndex - 1].forEach((neighbour) => {
    const target = activeImages[(neighbour + activeImages.length) % activeImages.length];
    if (target) new Image().src = target.src;
  });
}

function closeLightbox() {
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}

function observeReveals() {
  if (revealObserver) revealObserver.disconnect();
  const elements = app.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 120px 0px 120px" }
  );
  elements.forEach((element) => revealObserver.observe(element));
}
