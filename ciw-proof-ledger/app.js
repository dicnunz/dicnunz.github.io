const ZERO_HASH = "0".repeat(64);
const STATUS_ORDER = ["active", "next", "watch", "done", "blocked", "idea"];
const FALLBACK_ROUTE = [
  "goal-openai-role",
  "progress-web",
  "public-openai-codex-proof-brief",
  "application-submit",
  "openai-application-receipt",
  "warm-referral-route",
];
const GRAPH_FILTERS = [
  ["all", "All"],
  ["active-path", "Active path"],
  ["next-branches", "Next branches"],
  ["latest-proof", "Latest proof"],
  ["blockers", "Blockers"],
];
const GRAPH_FILTER_KEYS = new Set(GRAPH_FILTERS.map(([key]) => key));
const ROLE_PRESETS = [
  {
    key: "reviewer-digest",
    label: "Reviewer digest",
    node: "openai-reviewer-digest",
    filter: "active-path",
  },
  {
    key: "receipt-fixtures",
    label: "Receipt fixtures",
    node: "deployment-feedback-receipt-fixtures",
    filter: "active-path",
  },
  {
    key: "post-workshop-handoff",
    label: "Post-workshop handoff",
    node: "post-workshop-handoff-receipt-path",
    filter: "active-path",
  },
  {
    key: "ready-handoff",
    label: "Ready handoff",
    node: "ready-second-service-handoff-fixture",
    filter: "active-path",
  },
  {
    key: "scorecard",
    label: "Scorecard",
    node: "field-trial-acceptance-scorecard",
    filter: "active-path",
  },
  {
    key: "assessment",
    label: "Assessment",
    node: "deployment-assessment-drill",
    filter: "active-path",
  },
  {
    key: "autonomy",
    label: "Autonomy",
    node: "autonomy-scheduler-health",
    filter: "active-path",
  },
  {
    key: "growth",
    label: "Growth plan",
    node: "autonomous-growth-readiness-selector",
    filter: "active-path",
  },
  {
    key: "reviewer-time",
    label: "Reviewer time",
    node: "reviewer-time-to-understand-benchmark",
    filter: "active-path",
  },
  {
    key: "interview-branching",
    label: "Interview branching",
    node: "interview-question-branching-drill",
    filter: "active-path",
  },
  {
    key: "source-answer",
    label: "Source-answer",
    node: "source-to-answer-index",
    filter: "active-path",
  },
  {
    key: "cold-read",
    label: "Cold-read",
    node: "proof-route-cold-read-simulation",
    filter: "active-path",
  },
  {
    key: "role-source",
    label: "Role source",
    node: "live-codex-role-source-check",
    filter: "active-path",
  },
  {
    key: "field-kit-branch",
    label: "Field-kit branch",
    node: "ai-coding-deployment-field-kit",
    filter: "active-path",
  },
];
const ROLE_PRESET_MAP = new Map(ROLE_PRESETS.map((preset) => [preset.key, preset]));

const state = {
  summary: null,
  ledger: [],
  graph: null,
  mode: initialMode(),
  graphFilter: initialGraphFilter(),
  query: initialQuery(),
  selectedNode: initialNode(),
  activePreset: initialPreset(),
};

const $ = (selector) => document.querySelector(selector);

function initialMode() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view") || window.location.hash.replace("#", "");
  return ["chain", "graph", "route"].includes(requested) ? requested : "chain";
}

function initialGraphFilter() {
  const requested = new URLSearchParams(window.location.search).get("filter");
  return GRAPH_FILTER_KEYS.has(requested) ? requested : "all";
}

function initialQuery() {
  return (new URLSearchParams(window.location.search).get("q") || "").trim().toLowerCase();
}

function initialNode() {
  return (new URLSearchParams(window.location.search).get("node") || "").trim() || null;
}

function initialPreset() {
  const requested = (new URLSearchParams(window.location.search).get("preset") || "").trim();
  return ROLE_PRESET_MAP.has(requested) ? requested : null;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digestRecord(record) {
  const material = { ...record };
  delete material.hash;
  return sha256Hex(canonicalJson(material));
}

async function verifyLedger(records) {
  let previous = ZERO_HASH;
  for (const [index, record] of records.entries()) {
    if (record.index !== index) {
      return { ok: false, message: `Record ${index} has index ${record.index}.` };
    }
    if (record.prev_hash !== previous) {
      return { ok: false, message: `Record ${index} has a previous-hash break.` };
    }
    const digest = await digestRecord(record);
    if (digest !== record.hash) {
      return { ok: false, message: `Record ${index} hash does not match its public fields.` };
    }
    previous = record.hash;
  }
  return { ok: true, message: `${records.length} projected records verified.` };
}

function shortHash(hash) {
  if (!hash || hash.length < 14) {
    return hash || "-";
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function evidenceMarkup(value) {
  const text = String(value || "");
  if (/^https?:\/\//.test(text)) {
    const safe = escapeHtml(text);
    return `<a href="${safe}">${safe}</a>`;
  }
  return `<code>${escapeHtml(text)}</code>`;
}

function matchesQuery(text) {
  if (!state.query) {
    return true;
  }
  return text.toLowerCase().includes(state.query);
}

function setText(selector, value) {
  const element = $(selector);
  if (element) {
    element.textContent = value;
  }
}

function inspectorUrl({ mode = state.mode, filter = state.graphFilter, node = state.selectedNode, query = state.query, preset = state.activePreset } = {}) {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("view", mode);
  if (mode === "graph" && filter && filter !== "all") {
    url.searchParams.set("filter", filter);
  } else {
    url.searchParams.delete("filter");
  }
  if (mode === "graph" && node) {
    url.searchParams.set("node", node);
  } else {
    url.searchParams.delete("node");
  }
  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }
  if (mode === "graph" && preset) {
    url.searchParams.set("preset", preset);
  } else {
    url.searchParams.delete("preset");
  }
  return url;
}

function syncUrl() {
  window.history.replaceState(null, "", inspectorUrl());
}

function nodeUrl(nodeId) {
  const visibleIds = new Set(filteredGraphNodes().map((node) => node.id));
  return inspectorUrl({
    mode: "graph",
    filter: visibleIds.has(nodeId) ? state.graphFilter : "all",
    node: nodeId,
    query: state.query,
    preset: null,
  }).toString();
}

function presetUrl(preset) {
  return inspectorUrl({
    mode: "graph",
    filter: preset.filter,
    node: preset.node,
    query: "",
    preset: preset.key,
  }).toString();
}

function applyPreset(presetKey) {
  const preset = ROLE_PRESET_MAP.get(presetKey);
  if (!preset) {
    return false;
  }
  state.mode = "graph";
  state.graphFilter = GRAPH_FILTER_KEYS.has(preset.filter) ? preset.filter : "all";
  state.query = "";
  const route = activePathIds();
  state.selectedNode = graphNodes().some((node) => node.id === preset.node) ? preset.node : route[route.length - 1];
  state.activePreset = preset.key;
  const search = $("#search");
  if (search) {
    search.value = "";
  }
  return true;
}

function renderMetrics(verification) {
  const verifier = $(".verifier-panel");
  verifier.classList.toggle("is-good", verification.ok);
  verifier.classList.toggle("is-bad", !verification.ok);
  setText("#verify-state", verification.ok ? "Verified" : "Broken");
  setText("#verify-detail", verification.message);
  setText("#metric-records", String(state.summary.ledger.records));
  setText("#metric-nodes", String(state.summary.graph.nodes));
  setText("#metric-edges", String(state.summary.graph.edges));
  setText("#metric-hash", shortHash(state.summary.ledger.latest_hash));
  setText("#metric-action", state.summary.ledger.latest_action || "-");
}

function renderLinks() {
  const labels = {
    proof_brief: "Proof brief",
    cleanroom_repo: "Cleanroom repo",
    role_packet: "Role packet",
    deployment_memo: "Deployment memo",
    route_index: "Route index",
  };
  const publicLinks = Object.entries(state.summary.public_urls)
    .map(([key, href]) => `<a href="${href}">${labels[key] || key}</a>`)
    .join("");
  const presets = `
    <div class="preset-group" aria-label="Role-fit presets">
      <span class="label">Role-fit presets</span>
      ${ROLE_PRESETS.map(
        (preset) => `
          <a class="preset-link ${state.activePreset === preset.key ? "is-active" : ""}" href="${escapeHtml(presetUrl(preset))}" data-preset="${escapeHtml(preset.key)}">
            ${escapeHtml(preset.label)}
          </a>
        `
      ).join("")}
    </div>
  `;
  $("#public-links").innerHTML = publicLinks + presets;
}

function recordText(record) {
  return [
    record.index,
    record.timestamp,
    record.actor,
    record.action,
    record.details,
    record.hash,
    record.prev_hash,
    record.source_hash,
  ].join(" ");
}

function renderLedger() {
  const records = state.ledger.filter((record) => matchesQuery(recordText(record)));
  setText("#chain-count", `${records.length} records`);
  if (!records.length) {
    $("#ledger-list").innerHTML = '<div class="empty-state">No receipts match this search.</div>';
    return;
  }
  $("#ledger-list").innerHTML = records
    .map(
      (record) => `
        <article class="record">
          <div class="record-index">#${record.index}</div>
          <div>
            <h3>${escapeHtml(record.action)}</h3>
            <p>${escapeHtml(record.details)}</p>
          </div>
          <div class="record-meta">
            <span>${escapeHtml(formatTime(record.timestamp))} by ${escapeHtml(record.actor)}</span>
            <span class="hash-line">hash ${escapeHtml(shortHash(record.hash))}</span>
            <span class="hash-line">source ${escapeHtml(shortHash(record.source_hash))}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function graphNodes() {
  return state.graph.nodes || [];
}

function graphEdges() {
  return state.graph.edges || [];
}

function activePathIds() {
  const path = state.graph?.views?.active_path;
  return Array.isArray(path) && path.length ? path : FALLBACK_ROUTE;
}

function nextBranchIds() {
  const branches = state.graph?.views?.next_branches;
  return Array.isArray(branches) ? branches : [];
}

function latestProofIds() {
  return graphNodes()
    .filter((node) => node.status === "done" && (node.type.includes("proof") || node.type === "product" || node.type === "operating-system"))
    .slice(-8)
    .map((node) => node.id);
}

function filterIds() {
  if (state.graphFilter === "active-path") {
    return new Set(activePathIds());
  }
  if (state.graphFilter === "next-branches") {
    return new Set(nextBranchIds());
  }
  if (state.graphFilter === "latest-proof") {
    return new Set(latestProofIds());
  }
  if (state.graphFilter === "blockers") {
    return new Set(graphNodes().filter((node) => node.status === "blocked" || node.status === "watch" || node.type === "blocker").map((node) => node.id));
  }
  return null;
}

function filteredGraphNodes() {
  const ids = filterIds();
  return graphNodes().filter((node) => matchesQuery(nodeText(node)) && (!ids || ids.has(node.id)));
}

function nodeText(node) {
  return [node.id, node.title, node.type, node.status, node.priority, node.summary, ...(node.evidence || []), ...(node.next || [])].join(" ");
}

function neighborsFor(nodeId) {
  return graphEdges().filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

function renderGraph() {
  renderGraphFilters();
  const visibleNodes = filteredGraphNodes();
  setText("#graph-count", `${visibleNodes.length} nodes`);
  if (!state.selectedNode || !visibleNodes.some((node) => node.id === state.selectedNode)) {
    state.selectedNode = visibleNodes[0]?.id || null;
  }
  const byStatus = new Map();
  for (const node of visibleNodes) {
    if (!byStatus.has(node.status)) {
      byStatus.set(node.status, []);
    }
    byStatus.get(node.status).push(node);
  }
  const statuses = STATUS_ORDER.filter((status) => byStatus.has(status));
  if (!statuses.length) {
    $("#graph-grid").innerHTML = '<div class="empty-state">No graph nodes match this search.</div>';
    $("#node-detail").innerHTML = "";
    return;
  }
  $("#graph-grid").innerHTML = statuses
    .map((status) => {
      const nodes = byStatus.get(status).sort((left, right) => left.priority.localeCompare(right.priority) || left.id.localeCompare(right.id));
      return `
        <section class="status-column">
          <h3>${escapeHtml(status)} (${nodes.length})</h3>
          ${nodes
            .map(
              (node) => `
                <button class="node-button ${node.id === state.selectedNode ? "is-selected" : ""}" type="button" data-node="${node.id}">
                  <strong>${escapeHtml(node.title)}</strong>
                  <span>${escapeHtml(node.type)} / ${escapeHtml(node.priority)}</span>
                </button>
              `
            )
            .join("")}
        </section>
      `;
    })
    .join("");
  renderNodeDetail();
}

function renderGraphFilters() {
  const counts = {
    all: graphNodes().length,
    "active-path": activePathIds().length,
    "next-branches": nextBranchIds().length,
    "latest-proof": latestProofIds().length,
    blockers: graphNodes().filter((node) => node.status === "blocked" || node.status === "watch" || node.type === "blocker").length,
  };
  $("#graph-filters").innerHTML = GRAPH_FILTERS.map(
    ([key, label]) => `
      <button class="filter-button ${state.graphFilter === key ? "is-active" : ""}" type="button" data-filter="${key}">
        ${label}<span>${counts[key] || 0}</span>
      </button>
    `
  ).join("");
}

function renderNodeDetail() {
  const node = graphNodes().find((item) => item.id === state.selectedNode);
  if (!node) {
    $("#node-detail").innerHTML = "";
    return;
  }
  const neighbors = neighborsFor(node.id);
  const evidence = (node.evidence || []).slice(0, 6);
  const next = node.next || [];
  const directLink = nodeUrl(node.id);
  $("#node-detail").innerHTML = `
    <div class="node-detail-head">
      <div>
        <span class="label">${escapeHtml(node.status)} / ${escapeHtml(node.type)} / ${escapeHtml(node.priority)}</span>
        <h3>${escapeHtml(node.title)}</h3>
      </div>
      <code>${escapeHtml(node.id)}</code>
    </div>
    <div class="node-actions">
      <a href="${escapeHtml(directLink)}">Open node link</a>
      <button type="button" data-copy-node="${escapeHtml(node.id)}">Copy node link</button>
    </div>
    <p>${escapeHtml(node.summary)}</p>
    <div class="node-lists">
      <div>
        <strong>Next</strong>
        ${next.length ? `<ul>${next.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>No next action recorded.</p>"}
      </div>
      <div>
        <strong>Evidence</strong>
        ${evidence.length ? `<ul>${evidence.map((item) => `<li>${evidenceMarkup(item)}</li>`).join("")}</ul>` : "<p>No public evidence listed.</p>"}
      </div>
    </div>
    <div class="neighbor-list">
      ${neighbors
        .map((edge) => {
          const target = edge.from === node.id ? edge.to : edge.from;
          const direction = edge.from === node.id ? "to" : "from";
          return `<button type="button" data-node="${escapeHtml(target)}">${direction} ${escapeHtml(target)} / ${escapeHtml(edge.relation)}</button>`;
        })
        .join("")}
    </div>
  `;
}

function renderRoute() {
  const nodesById = new Map(graphNodes().map((node) => [node.id, node]));
  const steps = activePathIds().map((id) => nodesById.get(id)).filter(Boolean);
  setText("#route-count", `${steps.length} steps`);
  $("#route-list").innerHTML = steps
    .map(
      (node, index) => `
        <li class="route-step">
          <span class="step-number">${index + 1}</span>
          <div>
            <h3>${escapeHtml(node.title)}</h3>
            <p>${escapeHtml(node.summary)}</p>
            <p><strong>Next:</strong> ${escapeHtml((node.next && node.next[0]) || "No next action recorded.")}</p>
          </div>
        </li>
      `
    )
    .join("");
}

function renderMode() {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.panel !== state.mode);
  });
  document.querySelectorAll(".mode-button").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function renderAll() {
  renderMode();
  renderLinks();
  renderLedger();
  renderGraph();
  renderRoute();
}

function bindEvents() {
  $("#search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    state.activePreset = null;
    syncUrl();
    renderAll();
  });
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.activePreset = null;
      syncUrl();
      renderMode();
    });
  });
  $("#public-links").addEventListener("click", (event) => {
    const link = event.target.closest("[data-preset]");
    if (!link) {
      return;
    }
    event.preventDefault();
    if (applyPreset(link.dataset.preset)) {
      syncUrl();
      renderAll();
    }
  });
  $("#graph-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-node]");
    if (!button) {
      return;
    }
    state.selectedNode = button.dataset.node;
    state.mode = "graph";
    state.activePreset = null;
    syncUrl();
    renderGraph();
  });
  $("#node-detail").addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-node]");
    if (copyButton) {
      const link = nodeUrl(copyButton.dataset.copyNode);
      navigator.clipboard?.writeText(link).then(
        () => {
          copyButton.textContent = "Copied";
          window.setTimeout(() => {
            copyButton.textContent = "Copy node link";
          }, 1400);
        },
        () => {
          window.prompt("Node link", link);
        }
      );
      return;
    }
    const button = event.target.closest("[data-node]");
    if (!button) {
      return;
    }
    state.selectedNode = button.dataset.node;
    state.graphFilter = "all";
    state.mode = "graph";
    state.activePreset = null;
    syncUrl();
    renderAll();
  });
  $("#graph-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }
    state.graphFilter = button.dataset.filter;
    const visible = filteredGraphNodes();
    state.selectedNode = visible[0]?.id || null;
    state.mode = "graph";
    state.activePreset = null;
    syncUrl();
    renderGraph();
  });
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

async function boot() {
  try {
    const [summary, ledger, graph] = await Promise.all([
      loadJson("data/summary.json"),
      loadJson("data/ledger_public.json"),
      loadJson("data/progress_public.json"),
    ]);
    state.summary = summary;
    state.ledger = ledger;
    state.graph = graph;
    const route = activePathIds();
    if (state.query) {
      $("#search").value = state.query;
    }
    if (state.activePreset && applyPreset(state.activePreset)) {
      // Preset applied.
    } else {
      state.activePreset = null;
    }
    const nodeExists = state.selectedNode && graphNodes().some((node) => node.id === state.selectedNode);
    if (!state.activePreset && nodeExists) {
      state.mode = "graph";
      if (!filteredGraphNodes().some((node) => node.id === state.selectedNode)) {
        state.graphFilter = "all";
      }
    } else if (!state.activePreset) {
      state.selectedNode = route[route.length - 1] || graphNodes()[0]?.id || null;
    }
    const verification = await verifyLedger(ledger);
    renderMetrics(verification);
    renderAll();
    syncUrl();
    bindEvents();
  } catch (error) {
    setText("#verify-state", "Load failed");
    setText("#verify-detail", error.message);
    $(".verifier-panel").classList.add("is-bad");
  }
}

boot();
