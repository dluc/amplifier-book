function amplifierBookRoot() {
  // Book policy: use domain-root absolute paths (start with `/`), not relative (`./`).
  // This assumes the book is hosted at the domain root.
  return "/";
}

function absolutizeInternalLinks() {
  // Convert all same-origin links into absolute paths rooted at the book base path.
  // This prevents navigation from ever accumulating directories (e.g. `/core/core/...`)
  // and avoids `./` relative links.
  const base = amplifierBookRoot();
  const anchors = document.querySelectorAll("a[href]");
  for (const a of anchors) {
    const raw = a.getAttribute("href") || "";
    if (!raw) continue;
    if (raw.startsWith("#")) continue;
    if (raw.startsWith("//")) continue; // protocol-relative

    // Skip explicit schemes (http:, https:, mailto:, etc.)
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) continue;

    try {
      const url = new URL(raw, window.location.href);
      // Domain-root absolute path.
      a.setAttribute("href", base.replace(/\/+$/, "") + url.pathname + url.search + url.hash);
    } catch {
      // ignore
    }
  }
}

function linkEl(href, label) {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = label;
  return a;
}

// Feather icons (MIT) - https://github.com/feathericons/feather
function iconSvg(name) {
  const common =
    'width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const icons = {
    home: `<svg ${common}><path d="M3 9l9-7 9 7"/><path d="M9 22V12h6v10"/></svg>`,
    map: `<svg ${common}><polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/></svg>`,
    layers: `<svg ${common}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    check: `<svg ${common}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    box: `<svg ${common}><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    book: `<svg ${common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    terminal: `<svg ${common}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    cpu: `<svg ${common}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
  };
  return icons[name] || "";
}

function sectionTitleEl(label, iconName) {
  const h = document.createElement("h2");
  const icon = document.createElement("span");
  icon.className = "nav-icon";
  icon.innerHTML = iconSvg(iconName);
  const text = document.createElement("span");
  text.textContent = label;
  h.appendChild(icon);
  h.appendChild(text);
  return h;
}

function buildNav(containerId, depthPrefix = "") {
  const root = "/";
  const nav = document.getElementById(containerId);
  if (!nav) return;

  const wrap = document.createElement("div");

  const brand = document.createElement("div");
  brand.className = "brand";
  const title = document.createElement("h1");
  title.textContent = "Amplifier Book";
  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = "Mental model & reference";
  brand.appendChild(title);
  brand.appendChild(tag);
  wrap.appendChild(brand);

  const sections = [
    {
      title: "Start",
      icon: "home",
      links: [
        { href: root + "index.html", label: "Home" },
        { href: root + "what-is-amplifier.html", label: "What Amplifier Is" },
        { href: root + "glossary.html", label: "Glossary" },
      ],
    },
    {
      title: "Ecosystem",
      icon: "map",
      links: [
        { href: root + "ecosystem/how-to-find-repos.html", label: "Finding Repos" },
        { href: root + "ecosystem/repos.html", label: "Repo Overview" },
      ],
    },
    {
      title: "Bundles",
      icon: "layers",
      links: [
        { href: root + "bundles/fundamentals.html", label: "Fundamentals" },
        { href: root + "bundles/composition.html", label: "Composition Patterns" },
        { href: root + "bundles/authoring.html", label: "Creating Bundles" },
        { href: root + "bundles/index.html", label: "Available Bundles" },
        { href: root + "bundles/deep-dive.html", label: "Deep Dive (All)" },
      ],
    },
    {
      title: "Components",
      icon: "box",
      links: [
        { href: root + "modules/index.html", label: "Modules" },
        { href: root + "hooks/index.html", label: "Hooks" },
      ],
    },
    {
      title: "How The CLI Works",
      icon: "terminal",
      links: [
        { href: root + "cli/how-it-works.html", label: "CLI Overview" },
        { href: root + "cli/configuration.html", label: "CLI Configuration" },
        { href: root + "cli/uses-modules.html", label: "CLI → Modules" },
        { href: root + "cli/uses-hooks.html", label: "CLI → Hooks" },
      ],
    },
    {
      title: "Core",
      icon: "cpu",
      links: [
        { href: root + "core/core-and-foundation.html", label: "amplifier-core & foundation" },
        { href: root + "core/building-other-apps.html", label: "Building Other Apps" },
        { href: root + "core/creating-modules.html", label: "Creating Custom Modules" },
      ],
    },
    {
      title: "Verified Mechanics",
      icon: "check",
      links: [
        { href: root + "platform/module-resolution.html", label: "Module Resolution" },
        { href: root + "platform/agents-md.html", label: "AGENTS.md Loading" },
      ],
    },
    {
      title: "Deprecated",
      icon: "book",
      links: [
        { href: root + "deprecated/index.html", label: "Migration Guide" },
        { href: root + "profiles/index.html", label: "Profiles (archived)" },
        { href: root + "profiles/deep-dive.html", label: "Profiles Deep Dive" },
        { href: root + "collections/index.html", label: "Collections (archived)" },
        { href: root + "collections/deep-dive.html", label: "Collections Deep Dive" },
      ],
    },
  ];

  for (const section of sections) {
    const sec = document.createElement("div");
    sec.className = "nav-section";
    sec.appendChild(sectionTitleEl(section.title, section.icon));
    for (const l of section.links) {
      sec.appendChild(linkEl(l.href, l.label));
    }
    wrap.appendChild(sec);
  }

  // Add Last Updated timestamp at bottom of nav
  const footer = document.createElement("div");
  footer.className = "nav-footer";
  footer.innerHTML = '<div class="last-updated">Last Updated: <span id="catalog-timestamp">Loading...</span></div>';
  wrap.appendChild(footer);

  nav.innerHTML = "";
  nav.appendChild(wrap);
  markActiveNav(nav);
  absolutizeInternalLinks();

  // Load and display catalog timestamp
  loadCatalogTimestamp();
}

async function loadCatalogTimestamp() {
  try {
    const res = await fetch("/data/catalog.json", { cache: "no-store" });
    if (!res.ok) return;
    const catalog = await res.json();
    const timestamp = catalog.generated_at;
    if (timestamp) {
      const date = new Date(timestamp);
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const el = document.getElementById("catalog-timestamp");
      if (el) el.textContent = formatted;
    }
  } catch (e) {
    // Silently fail if catalog can't be loaded
  }
}

function markActiveNav(navEl) {
  const current = window.location.pathname;
  const links = navEl.querySelectorAll("a");
  let best = null;
  let bestLen = -1;
  for (const a of links) {
    const href = a.getAttribute("href") || "";
    try {
      const url = new URL(href, window.location.origin);
      if (current.endsWith(url.pathname) && url.pathname.length > bestLen) {
        best = a;
        bestLen = url.pathname.length;
      }
    } catch {
      // ignore
    }
  }
  if (best) best.classList.add("active");
}

async function loadScriptOnce(url) {
  if (document.querySelector(`script[data-amplifier-book-src="${url}"]`)) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    s.defer = true;
    s.dataset.amplifierBookSrc = url;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(s);
  });
}

async function initMermaid() {
  const nodes = document.querySelectorAll(".mermaid");
  if (!nodes.length) return;

  // CDN load (keeps the book lightweight). If you need fully-offline rendering,
  // vendor mermaid into assets/ and change this URL.
  const cdn = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
  if (!window.mermaid) {
    await loadScriptOnce(cdn);
  }

  if (!window.mermaid) return;
  window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  // mermaid.run renders all nodes with class 'mermaid'
  await window.mermaid.run({ nodes });
}
