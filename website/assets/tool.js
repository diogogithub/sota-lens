let metadata = emptyMetadata();
let articles = [];
let edges = [];
let filtered = [];
let selected = null;
const state = { scale: 0.42, ox: 450, oy: 310, dragging: false, lastX: 0, lastY: 0 };
const paletteLight = ["#2563eb", "#0f766e", "#ca8a04", "#9333ea", "#dc2626", "#4f46e5", "#0891b2", "#65a30d", "#ea580c", "#0284c7", "#16a34a", "#db2777"];
const paletteDark = ["#79c7ff", "#9de4c0", "#ffd98f", "#f0a6ff", "#ff9e9e", "#b8a8ff", "#8ce7e1", "#e7f58f", "#ffbd80", "#9fc2ff", "#d2f6c5", "#f8b7d4"];
const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", () => {
  bindControls();
  setupCanvas();
  updateStaticLists();
  applyFilters();
  drawGraph();
  if (new URLSearchParams(window.location.search).get("demo") === "paper") loadBundledDemo();
});
document.addEventListener("sotaThemeChanged", () => drawGraph());

function bindControls() {
  $("loadCsv").addEventListener("click", () => $("csvInput").click());
  $("loadGexf").addEventListener("click", () => $("gexfInput").click());
  $("loadDemo").addEventListener("click", loadBundledDemo);
  $("csvInput").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) readTextFile(f, (t) => loadArticlesCSV(t, f.name));
  });
  $("gexfInput").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) readTextFile(f, (t) => loadGEXF(t, f.name));
  });
  ["searchBox", "yearFrom", "yearTo", "depthFilter", "degreeMin"].forEach((id) => $(id).addEventListener("input", applyFilters));
  $("downloadFiltered").addEventListener("click", exportCSV);
  $("resetView").addEventListener("click", () => {
    state.scale = 0.42;
    state.ox = 450;
    state.oy = 310;
    drawGraph();
  });
}

function detectCommunitiesFromTopology(items, links) {
  const ids = new Set(items.map((item) => item.id));
  const neighbours = new Map(items.map((item) => [item.id, new Map()]));

  for (const edge of links) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;

    const a = neighbours.get(edge.source);
    const b = neighbours.get(edge.target);

    a.set(edge.target, (a.get(edge.target) || 0) + 1);
    b.set(edge.source, (b.get(edge.source) || 0) + 1);
  }

  let labels = new Map(items.map((item) => [item.id, item.id]));

  for (let iteration = 0; iteration < 30; iteration++) {
    let changed = false;

    const ordered = items
    .slice()
    .sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.id.localeCompare(b.id));

    for (const item of ordered) {
      const counts = new Map();

      for (const [neighbourId, weight] of neighbours.get(item.id) || []) {
        const label = labels.get(neighbourId);
        if (!label) continue;
        counts.set(label, (counts.get(label) || 0) + weight);
      }

      if (!counts.size) continue;

      const best = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0][0];

      if (labels.get(item.id) !== best) {
        labels.set(item.id, best);
        changed = true;
      }
    }

    if (!changed) break;
  }

  const labelSizes = new Map();

  for (const label of labels.values()) {
    labelSizes.set(label, (labelSizes.get(label) || 0) + 1);
  }

  const labelToCommunity = new Map(
    [...labelSizes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label], index) => [label, index])
  );

  for (const item of items) {
    item.community = labelToCommunity.get(labels.get(item.id)) ?? 0;
  }
}

function readTextFile(file, callback) {
  const r = new FileReader();
  r.onload = () => callback(String(r.result || ""));
  r.onerror = () => alert("Could not read file: " + r.error);
  r.readAsText(file);
}

async function loadBundledDemo() {
  setStatus("Loading the bundled DPM/SAR paper case study…", "loading");
  try {
    const data = await fetch("assets/data/case-study-demo.json").then((r) => {
      if (!r.ok) throw new Error("Could not fetch the bundled dataset.");
      return r.json();
    });
    const nodes = (data.nodes || []).map((n) => ({
      id: String(n.id || ""),
      doi: String(n.id || ""),
      title: String(n.title || n.label || n.id || "Untitled"),
      authors: Array.isArray(n.authors) ? n.authors : parseListish(n.authors || ""),
      subjects: Array.isArray(n.subjects) ? n.subjects : parseListish(n.subjects || ""),
      references: [],
      year: parseYear(n.year),
      url: n.url || "",
      depth: parseInt(n.depth || 0, 10) || 0,
      community: parseInt(n.community || 0, 10) || 0,
      degree: parseInt(n.degree || 0, 10) || 0,
      x: Number(n.x),
      y: Number(n.y)
    }));
    const demoEdges = (data.edges || []).map((e) => ({ source: String(e.source || ""), target: String(e.target || "") })).filter((e) => e.source && e.target);
    articles = nodes;
    edges = demoEdges;
    selected = null;
    addMetricsAndLayout(articles, edges, { preservePositions: true });
    metadata = {
      ...computeMetadata(articles, edges),
      ...(data.metadata || {}),
      unique_doi_vertices: data.metadata?.full_nodes || data.metadata?.display_nodes || articles.length,
      reference_edges: data.metadata?.full_edges || data.metadata?.display_edges || edges.length,
      communities_detected: computeMetadata(articles, edges).communities_detected
    };
    enableExplorer();
    updateStaticLists();
    applyFilters();
    setStatus(`<strong>Paper case study loaded.</strong> ${fmt(metadata.unique_doi_vertices)} DOI vertices, ${fmt(metadata.reference_edges)} citation edges, ${fmt(metadata.communities_detected)} communities.`, "ready");
    $("articleDetails").innerHTML = "Paper case study loaded. Click a node or table row to inspect an article.";
  } catch (err) {
    setStatus(`<strong>Could not load bundled case study.</strong> ${escapeHTML(err.message)}. You can still load a CSV or GEXF manually.`, "error");
  }
}

function setStatus(html, mode = "ready") {
  const el = $("datasetStatus");
  el.className = `note dataset-${mode}`;
  el.innerHTML = html;
}

function enableExplorer() {
  $("explorer").classList.remove("disabled");
  ["searchBox", "yearFrom", "yearTo", "depthFilter", "degreeMin"].forEach((id) => $(id).disabled = false);
}

function loadArticlesCSV(text, filename) {
  const rows = parseCSV(text);
  if (!rows.length) {
    alert("No rows found in CSV.");
    return;
  }
  articles = rows.map(rowToArticle).filter(Boolean);
  edges = buildEdgesFromArticles(articles);
  addMetricsAndLayout(articles, edges);
  metadata = computeMetadata(articles, edges);
  selected = null;
  enableExplorer();
  updateStaticLists();
  applyFilters();
  setStatus(`<strong>Loaded CSV:</strong> ${escapeHTML(filename)} · ${fmt(articles.length)} articles · ${fmt(edges.length)} in-corpus citation edges.`, "ready");
  $("articleDetails").innerHTML = `Loaded <strong>${escapeHTML(filename)}</strong>. Click a node or a table row.`;
}

function loadGEXF(text, filename) {
  const parsed = parseGEXF(text);
  if (!parsed.articles.length && !parsed.edges.length) {
    alert("No nodes or edges found in GEXF.");
    return;
  }
  if (!articles.length) articles = parsed.articles;
  else {
    const byId = new Map(articles.map((a) => [a.id, a]));
    for (const g of parsed.articles) {
      if (byId.has(g.id)) Object.assign(byId.get(g.id), { x: g.x ?? byId.get(g.id).x, y: g.y ?? byId.get(g.id).y, community: g.community ?? byId.get(g.id).community, degree: g.degree ?? byId.get(g.id).degree });
      else articles.push(g);
    }
  }
  if (parsed.edges.length) edges = parsed.edges;
  addMetricsAndLayout(articles, edges, { preservePositions: true });
  metadata = computeMetadata(articles, edges);
  selected = null;
  enableExplorer();
  updateStaticLists();
  applyFilters();
  setStatus(`<strong>Loaded GEXF:</strong> ${escapeHTML(filename)} · ${fmt(articles.length)} nodes · ${fmt(edges.length)} edges.`, "ready");
  $("articleDetails").innerHTML = `Loaded <strong>${escapeHTML(filename)}</strong>.`;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c !== '\r') field += c;
    }
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map((h) => h.trim());
  return rows.map((values, i) => Object.fromEntries(headers.map((h, j) => [h, values[j] ?? ""]).concat([["__row", i]])));
}

function rowToArticle(row) {
  const get = (...names) => {
    for (const name of names) if (row[name] !== undefined && String(row[name]).trim() !== "") return row[name];
    return "";
  };
  const doi = normaliseId(get("doi", "DOI", "id"));
  const title = get("title", "Title", "name") || doi || `Untitled ${Number(row.__row || 0) + 1}`;
  const id = doi || `row-${Number(row.__row || 0) + 1}`;
  return {
    id,
    doi,
    title,
    authors: parseListish(get("authors", "Authors")),
    subjects: parseListish(get("subject", "subjects", "Subject")),
    references: parseReferences(get("references", "References")),
    year: parseYear(get("year", "Year")),
    url: get("link", "url", "URL"),
    depth: parseInt(get("depth", "Depth") || "0", 10) || 0,
    community: null,
    degree: 0,
    x: 0,
    y: 0
  };
}

function parseListish(text) {
  text = String(text || "").trim();
  if (!text || text === "[]" || text === "nan") return [];
  const quoted = [...text.matchAll(/[\'"]([^\'"]+)[\'"]/g)].map((m) => m[1].trim()).filter(Boolean);
  return quoted.length ? [...new Set(quoted)] : text.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
}

function parseReferences(text) {
  text = String(text || "").trim();
  if (!text) return [];
  const refs = [...text.matchAll(/[\'"](?:doi|DOI)[\'"]\s*:\s*[\'"]([^\'"]+)[\'"]/g)].map((m) => normaliseId(m[1]));
  if (refs.length) return [...new Set(refs)];
  return [...new Set([...text.matchAll(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/gi)].map((m) => normaliseId(m[0])))];
}

function parseYear(v) {
  const y = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(y) ? y : null;
}

function normaliseId(v) {
  return String(v || "").trim().toLowerCase();
}

function buildEdgesFromArticles(items) {
  const ids = new Set(items.map((a) => a.id));
  const out = [], seen = new Set();
  for (const a of items) for (const targetRaw of (a.references || [])) {
    const target = normaliseId(targetRaw);
    if (!target || !ids.has(target)) continue;
    const key = `${a.id}→${target}`;
    if (!seen.has(key)) { seen.add(key); out.push({ source: a.id, target }); }
  }
  return out;
}

function addMetricsAndLayout(items, links, opts = {}) {
  const degree = new Map(items.map((a) => [a.id, 0]));
  for (const e of links) {
    degree.set(e.source, (degree.get(e.source) || 0) + 1);
    degree.set(e.target, (degree.get(e.target) || 0) + 1);
  }
  const existingCommunities = new Set(
    items
    .map((item) => item.community)
    .filter((value) => value !== undefined && value !== null && Number.isFinite(Number(value)))
    .map((value) => Number(value))
  );

  if (links && links.length && existingCommunities.size <= 1) {
    detectCommunitiesFromTopology(items, links);
  }
  const subjectMap = new Map();
  let next = 0;
  for (const a of items) {
    if (a.community === undefined || a.community === null || Number.isNaN(a.community)) {
      const key = (a.subjects && a.subjects[0]) || "Unclassified";
      if (!subjectMap.has(key)) subjectMap.set(key, next++);
      a.community = subjectMap.get(key);
    }
    a.degree = degree.get(a.id) || a.degree || 0;
  }
  if (opts.preservePositions && items.some((a) => Number.isFinite(a.x) && Number.isFinite(a.y) && (a.x || a.y))) return;
  const groups = new Map();
  for (const a of items) {
    if (!groups.has(a.community)) groups.set(a.community, []);
    groups.get(a.community).push(a);
  }
  const entries = [...groups.entries()].sort((a, b) => a[0] - b[0]);
  const outer = 900;
  entries.forEach(([community, group], ci) => {
    const angle = 2 * Math.PI * ci / Math.max(1, entries.length);
    const cx = outer * Math.cos(angle), cy = outer * Math.sin(angle);
    group.sort((a, b) => (b.degree || 0) - (a.degree || 0));
    const r = 35 + 11 * Math.sqrt(group.length);
    group.forEach((a, j) => {
      const theta = 2 * Math.PI * j / Math.max(1, group.length);
      const ring = r * (0.55 + (j % 5) * 0.14);
      a.x = cx + ring * Math.cos(theta);
      a.y = cy + ring * Math.sin(theta);
    });
  });
}

function parseGEXF(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("Could not parse GEXF/XML.");
  }

  // Build attribute-id -> attribute-title map.
  // Example:
  // <attribute id="5" title="modularity_class" type="integer"/>
  // <attvalue for="5" value="3"/>
  const attrNames = new Map();

  for (const attr of [...doc.getElementsByTagName("attribute")]) {
    const id = attr.getAttribute("id");
    const title = attr.getAttribute("title") || attr.getAttribute("name") || "";
    if (id) attrNames.set(id, title.toLowerCase());
  }

  const nodes = [...doc.getElementsByTagName("node")];
  const edgeEls = [...doc.getElementsByTagName("edge")];

  const colourToCommunity = new Map();
  let nextColourCommunity = 0;

  function firstElementByLocalName(parent, localName) {
    return [...parent.getElementsByTagName("*")]
    .find((el) => el.localName === localName);
  }

  function readVizColour(nodeEl) {
    const colourEl = firstElementByLocalName(nodeEl, "color");
    if (!colourEl) return null;

    const hex = colourEl.getAttribute("hex");
    if (hex) return hex.toLowerCase();

    const r = colourEl.getAttribute("r");
    const g = colourEl.getAttribute("g");
    const b = colourEl.getAttribute("b");

    if (r !== null && g !== null && b !== null) {
      return `${r},${g},${b}`;
    }

    return null;
  }

  function readVizPosition(nodeEl) {
    const pos = firstElementByLocalName(nodeEl, "position");
    if (!pos) return { x: null, y: null };

    const x = parseFloat(pos.getAttribute("x"));
    const y = parseFloat(pos.getAttribute("y"));

    return {
      x: Number.isFinite(x) ? x : null,
      y: Number.isFinite(y) ? y : null
    };
  }

  function getAttrValue(attrBag, possibleNames) {
    for (const name of possibleNames) {
      if (attrBag.has(name)) return attrBag.get(name);
    }

    // Fuzzy fallback for slightly different Gephi/export labels.
    for (const [key, value] of attrBag.entries()) {
      for (const name of possibleNames) {
        if (key.includes(name)) return value;
      }
    }

    return null;
  }

  const items = nodes.map((n, i) => {
    const id = normaliseId(n.getAttribute("id") || `node-${i}`);
    const label = n.getAttribute("label") || id;

    const attrBag = new Map();

    for (const av of [...n.getElementsByTagName("attvalue")]) {
      const rawKey = av.getAttribute("for") || av.getAttribute("id") || "";
      const value = av.getAttribute("value") || "";

      const resolvedName = attrNames.get(rawKey) || rawKey.toLowerCase();

      attrBag.set(rawKey.toLowerCase(), value);
      attrBag.set(resolvedName, value);
    }

    const pos = readVizPosition(n);

    let communityRaw = getAttrValue(attrBag, [
      "modularity_class",
      "modularity class",
      "modularity",
      "community",
      "cluster",
      "partition",
      "class"
    ]);

    let community = communityRaw !== null ? parseInt(communityRaw, 10) : null;

    // Fallback: if Gephi exported colours but not modularity_class,
    // treat equal colours as equal communities.
    if (!Number.isFinite(community)) {
      const colour = readVizColour(n);
      if (colour) {
        if (!colourToCommunity.has(colour)) {
          colourToCommunity.set(colour, nextColourCommunity++);
        }
        community = colourToCommunity.get(colour);
      }
    }

    if (!Number.isFinite(community)) community = null;

    const yearRaw = getAttrValue(attrBag, [
      "year",
      "publication_year",
      "publication year",
      "date"
    ]);

    const depthRaw = getAttrValue(attrBag, [
      "depth",
      "search_depth",
      "search depth"
    ]);

    const degreeRaw = getAttrValue(attrBag, [
      "degree",
      "weighted degree",
      "weighted_degree"
    ]);

    const url = getAttrValue(attrBag, [
      "url",
      "link",
      "uri",
      "source"
    ]) || "";

    const authorsRaw = getAttrValue(attrBag, [
      "authors",
      "author"
    ]) || "";

    const subjectsRaw = getAttrValue(attrBag, [
      "subject",
      "subjects",
      "keywords",
      "terms"
    ]) || "";

    return {
      id,
      doi: id,
      title: label,
      authors: parseListish(authorsRaw),
                          subjects: parseListish(subjectsRaw),
                          references: [],
                          year: parseYear(yearRaw),
                          url,
                          depth: parseInt(depthRaw || "0", 10) || 0,
                          community,
                          degree: parseInt(degreeRaw || "0", 10) || 0,
                          x: pos.x,
                          y: pos.y
    };
  });

  const ids = new Set(items.map((item) => item.id));

  const links = edgeEls
  .map((e) => ({
    source: normaliseId(e.getAttribute("source")),
               target: normaliseId(e.getAttribute("target"))
  }))
  .filter((e) => e.source && e.target && ids.has(e.source) && ids.has(e.target));

  return { articles: items, edges: links };
}

function computeMetadata(items, links) {
  items = items || [];
  links = links || [];
  const years = items.map((a) => a.year).filter((y) => Number.isFinite(y));
  const authors = countFlat(items.flatMap((a) => a.authors || []));
  const subjects = countFlat(items.flatMap((a) => a.subjects || []));
  const communities = countFlat(items.map((a) => String(a.community ?? 0)));
  return {
    unique_doi_vertices: items.length,
    reference_edges: links.length,
    communities_detected: Object.keys(communities).length,
    year_min: years.length ? Math.min(...years) : null,
    year_max: years.length ? Math.max(...years) : null,
    top_authors: Object.entries(authors).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, count]) => ({ name, count })),
    top_subjects: Object.entries(subjects).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([name, count]) => ({ name, count })),
    community_sizes: Object.entries(communities).sort((a, b) => b[1] - a[1]).map(([community, size]) => ({ community, size }))
  };
}

function countFlat(values) {
  return values.filter(Boolean).reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1;
    return acc;
  }, {});
}

function emptyMetadata() {
  return { unique_doi_vertices: 0, reference_edges: 0, communities_detected: 0, year_min: null, year_max: null, top_authors: [], top_subjects: [], community_sizes: [] };
}

function updateStaticLists() {
  metadata = metadata || computeMetadata(articles, edges);
  $("yearFrom").placeholder = metadata.year_min || "";
  $("yearTo").placeholder = metadata.year_max || "";
  $("authorsList").innerHTML = (metadata.top_authors || []).slice(0, 15).map((a) => `<li><strong>${escapeHTML(a.name)}</strong> — ${a.count}</li>`).join("") || `<li class="muted">Load data to see author rankings.</li>`;
  $("subjectsList").innerHTML = (metadata.top_subjects || []).slice(0, 15).map((s) => `<li><strong>${escapeHTML(s.name)}</strong> — ${s.count}</li>`).join("") || `<li class="muted">Load data to see subject terms.</li>`;
  $("communitiesList").innerHTML = (metadata.community_sizes || []).slice(0, 20).map((c) => `<span class="chip">C${c.community}: ${c.size}</span>`).join("") || `<span class="muted">Load data to see communities.</span>`;
}

function applyFilters() {
  const q = $("searchBox").value.trim().toLowerCase();
  const yf = parseInt($("yearFrom").value, 10);
  const yt = parseInt($("yearTo").value, 10);
  const depth = $("depthFilter").value;
  const degreeMin = parseInt($("degreeMin").value || "0", 10);
  filtered = (articles || []).filter((a) => {
    const hay = [a.title, a.id, ...(a.authors || []), ...(a.subjects || [])].join(" ").toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (!isNaN(yf) && (!a.year || a.year < yf)) return false;
    if (!isNaN(yt) && (!a.year || a.year > yt)) return false;
    if (depth !== "" && String(a.depth) !== depth) return false;
    if ((a.degree || 0) < degreeMin) return false;
    return true;
  });
  renderTable();
  drawGraph();
}

function renderTable() {
  $("resultCount").textContent = `${fmt(filtered.length)} results`;
  const rows = filtered.slice().sort((a, b) => (b.degree - a.degree) || ((b.year || 0) - (a.year || 0))).slice(0, 500).map((a) => `<tr data-id="${escapeAttr(a.id)}"><td>${a.year || "—"}</td><td>${a.degree || 0}</td><td>C${a.community ?? 0}</td><td>${escapeHTML(a.title || "Untitled")}</td><td>${escapeHTML((a.authors || []).slice(0, 4).join(", ")) || "—"}</td><td>${escapeHTML(a.id)}</td></tr>`).join("");
  const tbody = $("articlesTable").querySelector("tbody");
  tbody.innerHTML = rows || `<tr><td colspan="6" class="muted">No rows to show yet.</td></tr>`;
  tbody.querySelectorAll("tr[data-id]").forEach((tr) => tr.addEventListener("click", () => {
    selected = articles.find((a) => a.id === tr.dataset.id);
    showDetails(selected);
    drawGraph();
  }));
}

function setupCanvas() {
  const c = $("graphCanvas");
  const ctx = c.getContext("2d");
  const resize = () => {
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * devicePixelRatio);
    c.height = Math.round(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    drawGraph();
  };
  window.addEventListener("resize", resize);
  resize();
  c.addEventListener("mousedown", (e) => {
    state.dragging = true;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => state.dragging = false);
  window.addEventListener("mousemove", (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX, dy = e.clientY - state.lastY;
    state.ox += dx;
    state.oy += dy;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    drawGraph();
  });
  c.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.scale *= e.deltaY < 0 ? 1.12 : 0.9;
    state.scale = Math.max(0.04, Math.min(5, state.scale));
    drawGraph();
  }, { passive: false });
  c.addEventListener("click", (e) => {
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = null, bd = 14;
    for (const a of filtered) {
      const p = toScreen(a.x, a.y);
      const r = 2 + Math.sqrt(a.degree || 1) * 0.55;
      const d = Math.hypot(mx - p.x, my - p.y) - r;
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    if (best) {
      selected = best;
      showDetails(best);
      drawGraph();
    }
  });
}

function drawGraph() {
  const c = $("graphCanvas");
  const ctx = c.getContext("2d");
  const width = c.width / devicePixelRatio;
  const height = c.height / devicePixelRatio;
  const styles = getComputedStyle(document.documentElement);
  const bg = styles.getPropertyValue("--canvas").trim() || styles.getPropertyValue("--panel").trim();
  const line = styles.getPropertyValue("--line").trim();
  const text = styles.getPropertyValue("--text").trim();
  const muted = styles.getPropertyValue("--muted").trim();
  const palette = document.documentElement.dataset.theme === "dark" ? paletteDark : paletteLight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (!filtered.length) {
    ctx.fillStyle = muted;
    ctx.font = "16px Inter, system-ui, sans-serif";
    ctx.fillText("No dataset loaded. Use Load CSV, Load GEXF, or Try paper case study.", 26, 42);
    return;
  }

  const keep = new Set(filtered.map((a) => a.id));
  ctx.lineWidth = 1;
  ctx.strokeStyle = line;
  ctx.globalAlpha = 0.28;
  for (const e of edges) {
    if (!keep.has(e.source) || !keep.has(e.target)) continue;
    const a = articles.find((x) => x.id === e.source);
    const b = articles.find((x) => x.id === e.target);
    if (!a || !b) continue;
    const p1 = toScreen(a.x, a.y), p2 = toScreen(b.x, b.y);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const maxDegree = Math.max(1, ...filtered.map((a) => a.degree || 0));
  for (const a of filtered) {
    const p = toScreen(a.x, a.y);
    const radius = 3 + Math.sqrt(a.degree || 1) * 0.65;
    const color = palette[Math.abs(Number(a.community) || 0) % palette.length];
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (selected && selected.id === a.id) {
      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = text;
      ctx.arc(p.x, p.y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    if ((a.degree || 0) >= maxDegree * 0.6) {
      ctx.fillStyle = text;
      ctx.font = "12px Inter, system-ui, sans-serif";
      ctx.fillText((a.title || a.id).slice(0, 40), p.x + radius + 5, p.y + 4);
    }
  }
}

function showDetails(a) {
  if (!a) {
    $("articleDetails").innerHTML = '<span class="muted">No article selected.</span>';
    return;
  }
  const authors = (a.authors || []).length ? a.authors.map((x) => `<span class="badge">${escapeHTML(x)}</span>`).join("") : '<span class="muted">No author list available.</span>';
  const subjects = (a.subjects || []).length ? a.subjects.map((x) => `<span class="badge">${escapeHTML(x)}</span>`).join("") : '<span class="muted">No subject terms available.</span>';
  const url = a.url ? `<p><strong>URL:</strong> <a href="${escapeAttr(a.url)}" target="_blank" rel="noopener">${escapeHTML(a.url)}</a></p>` : "";
  $("articleDetails").innerHTML = `
    <h3>${escapeHTML(a.title || "Untitled")}</h3>
    <p><strong>ID:</strong> ${escapeHTML(a.id)}</p>
    <p><strong>Year:</strong> ${a.year || "—"} &nbsp; <strong>Degree:</strong> ${a.degree || 0} &nbsp; <strong>Community:</strong> C${a.community ?? 0} &nbsp; <strong>Depth:</strong> ${a.depth ?? 0}</p>
    ${url}
    <p><strong>Authors</strong></p>
    <div>${authors}</div>
    <p><strong>Subject terms</strong></p>
    <div>${subjects}</div>
  `;
}

function exportCSV() {
  const header = ["id", "title", "year", "degree", "community", "authors", "subjects", "url"];
  const rows = filtered.map((a) => [a.id, a.title || "", a.year || "", a.degree || 0, a.community ?? "", (a.authors || []).join("; "), (a.subjects || []).join("; "), a.url || ""]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "sota-lens-filtered.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toScreen(x, y) {
  const c = $("graphCanvas");
  const width = c.width / devicePixelRatio;
  const height = c.height / devicePixelRatio;
  return { x: width / 2 + x * state.scale + state.ox, y: height / 2 + y * state.scale + state.oy };
}

function fmt(n) {
  return Number(n || 0).toLocaleString();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#96;");
}
