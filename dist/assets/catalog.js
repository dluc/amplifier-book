async function loadCatalog() {
  const res = await fetch("/data/catalog.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load catalog.json: ${res.status}`);
  return await res.json();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(c);
  return node;
}

function inlineCode(text) {
  return el("code", { class: "inline", html: escapeHtml(text) });
}

function list(container, items) {
  const ul = el("ul");
  for (const item of items) {
    const li = el("li");
    li.appendChild(item);
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function getFm(obj, path, fallback = null) {
  let cur = obj;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return fallback;
    cur = cur[p];
  }
  return cur == null ? fallback : cur;
}

function formatModuleList(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return "—";
  const names = items
    .map((it) => (typeof it === "string" ? it : it?.module))
    .filter(Boolean);
  if (names.length === 0) return "—";
  return names.join(", ");
}

function groupBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    const arr = m.get(k) || [];
    arr.push(it);
    m.set(k, arr);
  }
  return m;
}

function byKey(a, b, keyFn) {
  const ka = keyFn(a);
  const kb = keyFn(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}

function renderRepoLink(slug) {
  const a = el("a", { href: `https://github.com/${slug}`, target: "_blank", rel: "noreferrer" });
  // Insert `<wbr>` after path separators to prevent overflow in narrow columns.
  if (slug.includes("/")) {
    a.innerHTML = escapeHtml(slug).replaceAll("/", "/<wbr>");
    a.title = slug;
  } else {
    a.textContent = slug;
  }
  return a;
}

function renderGitHubFileLink(url, label) {
  const a = el("a", { href: url, target: "_blank", rel: "noreferrer" });
  // Insert `<wbr>` after path separators to prevent overflow in narrow columns.
  const safe = escapeHtml(label);
  if (label.includes("/")) {
    a.innerHTML = safe.replaceAll("/", "/<wbr>");
    a.title = label;
  } else {
    a.textContent = label;
  }
  return a;
}

function renderKeyValueTable(rows) {
  const table = el("table", { style: "width: 100%; border-collapse: collapse; margin: 10px 0" });
  for (const [k, v] of rows) {
    const tr = el("tr");
    const tdK = el("td", {
      style:
        "width: 180px; vertical-align: top; padding: 6px 8px; color: var(--muted); border-bottom: 1px solid var(--border)",
    });
    tdK.textContent = k;
    const tdV = el("td", { style: "padding: 6px 8px; border-bottom: 1px solid var(--border)" });
    if (v instanceof Node) tdV.appendChild(v);
    else tdV.textContent = String(v);
    tr.appendChild(tdK);
    tr.appendChild(tdV);
    table.appendChild(tr);
  }
  return table;
}

function makeAnchorId(prefix, name) {
  const safe = String(name)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
  return `${prefix}-${safe}`;
}

function renderProfileDeepDive(container, catalog) {
  const profiles = (catalog.profiles || []).slice().sort((a, b) => byKey(a, b, (x) => x.name));
  const grouped = groupBy(profiles, (p) => p.name);

  for (const [name, defs] of Array.from(grouped.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const sectionId = makeAnchorId("profile", name);
    const h2 = el("h2", { id: sectionId });
    h2.appendChild(inlineCode(name));
    container.appendChild(h2);

    // pick first definition as representative, but show sources if multiple
    const def = defs[0];
    const fm = def.frontmatter || {};

    const desc =
      getFm(fm, ["profile", "description"]) ||
      getFm(fm, ["profile", "title"]) ||
      getFm(fm, ["profile", "summary"]) ||
      "(no description found)";
    container.appendChild(el("p", { html: escapeHtml(desc) }));

    const orchestrator = getFm(fm, ["session", "orchestrator", "module"], "—");
    const context = getFm(fm, ["session", "context", "module"], "—");
    const extendsVal = getFm(fm, ["profile", "extends"], "—");
    const agentsVal = fm.agents != null ? JSON.stringify(fm.agents) : "—";

    const rows = [
      ["Extends", extendsVal],
      ["Orchestrator", orchestrator],
      ["Context manager", context],
      ["Providers", formatModuleList(fm.providers)],
      ["Tools", formatModuleList(fm.tools)],
      ["Hooks", formatModuleList(fm.hooks)],
      ["Agents", agentsVal],
    ];
    container.appendChild(renderKeyValueTable(rows));

    const sourcesP = el("p");
    sourcesP.appendChild(el("span", { html: "Defined in: " }));
    if (defs.length === 1) {
      sourcesP.appendChild(renderRepoLink(def.repo));
      sourcesP.appendChild(el("span", { html: " — " }));
      sourcesP.appendChild(renderGitHubFileLink(def.github_url, def.path));
    } else {
      const ul = el("ul");
      for (const d of defs) {
        const li = el("li");
        li.appendChild(renderRepoLink(d.repo));
        li.appendChild(el("span", { html: " — " }));
        li.appendChild(renderGitHubFileLink(d.github_url, d.path));
        ul.appendChild(li);
      }
      sourcesP.appendChild(el("span", { html: "(multiple definitions)" }));
      container.appendChild(sourcesP);
      container.appendChild(ul);
      continue;
    }
    container.appendChild(sourcesP);
  }
}

function renderProfilesIndex(container, catalog) {
  const profiles = (catalog.profiles || []).slice().sort((a, b) => byKey(a, b, (x) => x.name));
  const grouped = groupBy(profiles, (p) => p.name);

  const table = el("table", { class: "data-table" });
  const colgroup = el("colgroup");
  for (const w of ["44%", "56%"]) {
    colgroup.appendChild(el("col", { style: `width: ${w}` }));
  }
  table.appendChild(colgroup);

  const thead = el("thead");
  const header = el("tr");
  for (const h of ["Profile", "Composition & source"]) {
    const th = el("th");
    th.textContent = h;
    header.appendChild(th);
  }
  thead.appendChild(header);
  table.appendChild(thead);
  const tbody = el("tbody");
  table.appendChild(tbody);

  const makeChips = (names) => {
    const wrap = el("div", { class: "chips" });
    for (const n of names) {
      wrap.appendChild(el("span", { class: "chip", html: escapeHtml(n) }));
    }
    return wrap;
  };

  const labeled = (label, nodeOrText) => {
    const wrap = el("div", { class: "kv" });
    wrap.appendChild(el("div", { class: "kv-label", html: escapeHtml(label) }));
    const v = el("div", { class: "kv-value" });
    if (nodeOrText instanceof Node) v.appendChild(nodeOrText);
    else v.textContent = String(nodeOrText);
    wrap.appendChild(v);
    return wrap;
  };

  const moduleNames = (items) =>
    (items || [])
      .map((it) => (typeof it === "string" ? it : it?.module))
      .filter(Boolean)
      .slice(0, 6);

  const names = Array.from(grouped.keys()).sort();
  for (const name of names) {
    const defs = grouped.get(name) || [];
    const def = defs[0];
    const fm = def.frontmatter || {};

    const tr = el("tr");

    // Column 1: name + description
    const tdProfile = el("td");
    const titleRow = el("div", { class: "profile-title-row" });
    const nameLink = el("a", { href: `deep-dive.html#${makeAnchorId("profile", name)}` });
    nameLink.appendChild(inlineCode(name));
    titleRow.appendChild(nameLink);
    if (defs.length > 1) titleRow.appendChild(el("span", { class: "badge", html: `${defs.length} definitions` }));
    tdProfile.appendChild(titleRow);

    const desc = getFm(fm, ["profile", "description"], "");
    const descDiv = el("div", { class: "profile-desc", title: desc || "" });
    descDiv.textContent = desc || "—";
    tdProfile.appendChild(descDiv);
    tr.appendChild(tdProfile);

    // Column 2: composition + sources
    const tdRight = el("td");

    const orch = getFm(fm, ["session", "orchestrator", "module"], "—");
    const ctx = getFm(fm, ["session", "context", "module"], "—");
    const providers = moduleNames(fm.providers);
    const tools = moduleNames(fm.tools);
    const hooks = moduleNames(fm.hooks);

    const comp = el("div");
    comp.appendChild(labeled("Loop", makeChips([orch])));
    comp.appendChild(labeled("Context", makeChips([ctx])));
    if (providers.length) comp.appendChild(labeled("Providers", makeChips(providers)));
    if (tools.length) comp.appendChild(labeled("Tools", makeChips(tools)));
    if (hooks.length) comp.appendChild(labeled("Hooks", makeChips(hooks)));
    tdRight.appendChild(comp);

    const srcWrap = el("div", { class: "kv-group" });
    if (defs.length === 1) {
      srcWrap.appendChild(labeled("Repo", renderRepoLink(def.repo)));
      srcWrap.appendChild(labeled("File", renderGitHubFileLink(def.github_url, def.path)));
    } else {
      const ul = el("ul", { style: "margin: 0; padding-left: 18px" });
      for (const d of defs) {
        const li = el("li");
        li.appendChild(renderRepoLink(d.repo));
        li.appendChild(el("span", { html: " — " }));
        li.appendChild(renderGitHubFileLink(d.github_url, d.path));
        ul.appendChild(li);
      }
      srcWrap.appendChild(labeled("Defined in", ul));
    }
    tdRight.appendChild(srcWrap);

    tr.appendChild(tdRight);

    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

function renderCollectionDeepDive(container, catalog) {
  const collections = (catalog.collections || [])
    .slice()
    .sort((a, b) => byKey(a, b, (x) => (x.kind || "") + "::" + (x.repo || "") + "::" + (x.name || "")));
  const profiles = catalog.profiles || [];

  for (const c of collections) {
    const title = c.kind === "bundled" ? `${c.repo}#${c.name}` : c.repo;
    const sectionId = makeAnchorId("collection", title);
    const h2 = el("h2", { id: sectionId });
    h2.appendChild(inlineCode(title));
    container.appendChild(h2);

    if (c.readme_summary) container.appendChild(el("p", { html: escapeHtml(c.readme_summary) }));

    const relatedProfiles =
      c.kind === "bundled"
        ? profiles
            .filter((p) => p.repo === c.repo && typeof p.path === "string" && p.path.includes(`/data/collections/${c.name}/profiles/`))
            .sort((a, b) => byKey(a, b, (x) => x.name))
        : profiles.filter((p) => p.repo === c.repo).sort((a, b) => byKey(a, b, (x) => x.name));
    const profileText =
      c.profiles && Array.isArray(c.profiles) && c.profiles.length
        ? c.profiles.join(", ")
        : relatedProfiles.length
          ? relatedProfiles.map((p) => p.name).join(", ")
          : "—";
    const agentText = c.agents && Array.isArray(c.agents) && c.agents.length ? c.agents.join(", ") : "—";

    const rows = [
      ["Kind", c.kind || "—"],
      ["Repo", renderRepoLink(c.repo)],
      ["Collection path", c.path ? c.path : "—"],
      ["Profiles", profileText],
      ["Agents", agentText],
      ["Package", c.package_name || "—"],
      ["Package description", c.package_description || "—"],
    ];
    container.appendChild(renderKeyValueTable(rows));
  }
}

function renderModuleList(container, catalog, filterType) {
  const modules = (catalog.modules || [])
    .filter((m) => (filterType ? m.type === filterType : true))
    .sort((a, b) => byKey(a, b, (x) => x.id));

  const ul = el("ul");
  for (const m of modules) {
    const li = el("li");
    li.appendChild(inlineCode(m.id));
    li.appendChild(el("span", { html: " — " }));
    li.appendChild(renderRepoLink(m.repo));
    if (m.readme_summary) {
      li.appendChild(el("span", { html: " — " + escapeHtml(m.readme_summary) }));
    } else if (m.package_description) {
      li.appendChild(el("span", { html: " — " + escapeHtml(m.package_description) }));
    }
    ul.appendChild(li);
  }
  container.appendChild(ul);
}

function renderModulesTable(container, catalog, filterType, titleText) {
  const modules = (catalog.modules || [])
    .filter((m) => (filterType ? m.type === filterType : true))
    .slice()
    .sort((a, b) => byKey(a, b, (x) => x.id));

  if (titleText) {
    container.appendChild(el("h3", { html: escapeHtml(titleText) }));
  }

  const table = el("table", { class: "data-table" });
  const colgroup = el("colgroup");
  for (const w of ["22%", "22%", "56%"]) {
    colgroup.appendChild(el("col", { style: `width: ${w}` }));
  }
  table.appendChild(colgroup);

  const thead = el("thead");
  const header = el("tr");
  for (const h of ["Module", "Repo", "What it does"]) {
    const th = el("th");
    th.textContent = h;
    header.appendChild(th);
  }
  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = el("tbody");
  table.appendChild(tbody);

  for (const m of modules) {
    const tr = el("tr");

    const tdId = el("td");
    tdId.appendChild(inlineCode(m.id));
    tr.appendChild(tdId);

    const tdRepo = el("td");
    tdRepo.appendChild(renderRepoLink(m.repo));
    tr.appendChild(tdRepo);

    const tdDesc = el("td");
    const desc = m.readme_summary || m.package_description || "—";
    const d = el("div", { class: "truncate2", title: desc });
    d.textContent = desc;
    tdDesc.appendChild(d);
    tr.appendChild(tdDesc);
    tbody.appendChild(tr);
  }

  container.appendChild(table);
}

function renderBundlesTable(container, catalog) {
  const bundles = (catalog.bundles || []).slice().sort((a, b) => byKey(a, b, (x) => x.name || ""));

  if (!bundles.length) {
    container.appendChild(el("p", { html: "No bundles found in the current catalog." }));
    return;
  }

  const table = el("table", { class: "data-table" });
  const colgroup = el("colgroup");
  for (const w of ["34%", "46%", "20%"]) {
    colgroup.appendChild(el("col", { style: `width: ${w}` }));
  }
  table.appendChild(colgroup);

  const thead = el("thead");
  const header = el("tr");
  for (const h of ["Bundle", "Use case / composition", "Where it lives"]) {
    const th = el("th");
    th.textContent = h;
    header.appendChild(th);
  }
  thead.appendChild(header);
  table.appendChild(thead);

  const tbody = el("tbody");
  table.appendChild(tbody);

  function guessUseCase(name, desc) {
    const n = String(name || "").toLowerCase();
    const d = String(desc || "").toLowerCase();
    if (n.includes("minimal") || d.includes("minimal")) return "Minimal baseline (smoke tests, constrained runs)";
    if (n.includes("anthropic") || d.includes("anthropic")) return "Turn-key Anthropic provider bundle";
    if (n.includes("openai") || d.includes("openai")) return "Turn-key OpenAI provider bundle";
    if (n === "foundation") return "Provider-agnostic base bundle (compose providers separately)";
    return "Bundle preset (see includes)";
  }

  for (const b of bundles) {
    const tr = el("tr");

    const tdName = el("td");
    const bundleName = b.name || "—";
    tdName.appendChild(inlineCode(bundleName));
    const desc = b.bundle?.description || "";
    const version = b.bundle?.version || "";
    if (desc) {
      tdName.appendChild(el("div", { class: "meta", html: escapeHtml(desc) }));
    }
    if (version) {
      tdName.appendChild(el("div", { class: "meta", html: `Version: ${escapeHtml(version)}` }));
    }
    tr.appendChild(tdName);

    const tdWhat = el("td");
    tdWhat.appendChild(el("div", { html: escapeHtml(guessUseCase(bundleName, desc)) }));
    const includes = Array.isArray(b.includes) ? b.includes : [];
    if (includes.length) {
      const details = el("details");
      details.appendChild(el("summary", { class: "details-summary", html: `Includes (${includes.length})` }));
      const ul = el("ul");
      for (const inc of includes.slice(0, 30)) {
        const li = el("li");
        li.textContent = typeof inc === "string" ? inc : JSON.stringify(inc);
        ul.appendChild(li);
      }
      if (includes.length > 30) {
        const li = el("li", { html: `… +${includes.length - 30} more` });
        ul.appendChild(li);
      }
      details.appendChild(ul);
      tdWhat.appendChild(details);
    }
    tr.appendChild(tdWhat);

    const tdWhere = el("td");
    if (b.github_url) {
      const label = `${b.repo || "repo"}/${b.path || "bundle"}`;
      tdWhere.appendChild(renderGitHubFileLink(b.github_url, label));
    } else if (b.repo) {
      tdWhere.appendChild(renderRepoLink(b.repo));
    } else {
      tdWhere.textContent = "—";
    }
    tr.appendChild(tdWhere);

    tbody.appendChild(tr);
  }

  container.appendChild(table);
}
