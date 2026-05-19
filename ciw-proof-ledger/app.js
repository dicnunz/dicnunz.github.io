const ZERO_HASH = "0".repeat(64);
const STATUS_ORDER = ["active", "next", "watch", "done", "blocked", "idea"];
const ROUTE = [
  "goal-openai-role",
  "progress-web",
  "public-openai-codex-proof-brief",
  "application-submit",
  "openai-application-receipt",
  "warm-referral-route",
];

const state = {
  summary: null,
  ledger: [],
  graph: null,
  mode: initialMode(),
  query: "",
  selectedNode: null,
};

const $ = (selector) => document.querySelector(selector);

function initialMode() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("view") || window.location.hash.replace("#", "");
  return ["chain", "graph", "route"].includes(requested) ? requested : "chain";
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
}

function renderLinks() {
  const labels = {
    proof_brief: "Proof brief",
    cleanroom_repo: "Cleanroom repo",
    role_packet: "Role packet",
    deployment_memo: "Deployment memo",
  };
  $("#public-links").innerHTML = Object.entries(state.summary.public_urls)
    .map(([key, href]) => `<a href="${href}">${labels[key] || key}</a>`)
    .join("");
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
            <h3>${record.action}</h3>
            <p>${record.details}</p>
          </div>
          <div class="record-meta">
            <span>${formatTime(record.timestamp)} by ${record.actor}</span>
            <span class="hash-line">hash ${shortHash(record.hash)}</span>
            <span class="hash-line">source ${shortHash(record.source_hash)}</span>
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

function nodeText(node) {
  return [node.id, node.title, node.type, node.status, node.priority, node.summary, ...(node.evidence || []), ...(node.next || [])].join(" ");
}

function neighborsFor(nodeId) {
  return graphEdges().filter((edge) => edge.from === nodeId || edge.to === nodeId);
}

function renderGraph() {
  const visibleNodes = graphNodes().filter((node) => matchesQuery(nodeText(node)));
  setText("#graph-count", `${visibleNodes.length} nodes`);
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
          <h3>${status} (${nodes.length})</h3>
          ${nodes
            .map(
              (node) => `
                <button class="node-button ${node.id === state.selectedNode ? "is-selected" : ""}" type="button" data-node="${node.id}">
                  <strong>${node.title}</strong>
                  <span>${node.type} / ${node.priority}</span>
                </button>
              `
            )
            .join("")}
        </section>
      `;
    })
    .join("");
  if (!state.selectedNode || !visibleNodes.some((node) => node.id === state.selectedNode)) {
    state.selectedNode = visibleNodes[0].id;
  }
  renderNodeDetail();
}

function renderNodeDetail() {
  const node = graphNodes().find((item) => item.id === state.selectedNode);
  if (!node) {
    $("#node-detail").innerHTML = "";
    return;
  }
  const neighbors = neighborsFor(node.id);
  $("#node-detail").innerHTML = `
    <h3>${node.title}</h3>
    <p>${node.summary}</p>
    <p><strong>Next:</strong> ${(node.next && node.next[0]) || "No next action recorded."}</p>
    <div class="neighbor-list">
      ${neighbors.map((edge) => `<span>${edge.from === node.id ? "to" : "from"} ${edge.from === node.id ? edge.to : edge.from} / ${edge.relation}</span>`).join("")}
    </div>
  `;
}

function renderRoute() {
  const nodesById = new Map(graphNodes().map((node) => [node.id, node]));
  const steps = ROUTE.map((id) => nodesById.get(id)).filter(Boolean);
  setText("#route-count", `${steps.length} steps`);
  $("#route-list").innerHTML = steps
    .map(
      (node, index) => `
        <li class="route-step">
          <span class="step-number">${index + 1}</span>
          <div>
            <h3>${node.title}</h3>
            <p>${node.summary}</p>
            <p><strong>Next:</strong> ${(node.next && node.next[0]) || "No next action recorded."}</p>
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
  renderLedger();
  renderGraph();
  renderRoute();
}

function bindEvents() {
  $("#search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderAll();
  });
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      const url = new URL(window.location.href);
      url.searchParams.set("view", state.mode);
      window.history.replaceState(null, "", url);
      renderMode();
    });
  });
  $("#graph-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-node]");
    if (!button) {
      return;
    }
    state.selectedNode = button.dataset.node;
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
    state.selectedNode = ROUTE[ROUTE.length - 1];
    const verification = await verifyLedger(ledger);
    renderMetrics(verification);
    renderLinks();
    renderAll();
    bindEvents();
  } catch (error) {
    setText("#verify-state", "Load failed");
    setText("#verify-detail", error.message);
    $(".verifier-panel").classList.add("is-bad");
  }
}

boot();
