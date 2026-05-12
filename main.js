const work = [
  {
    id: "mission-control",
    name: "Codex Mission Control",
    type: "operator",
    x: 0.5,
    y: 0.35,
    radius: 30,
    link: "https://github.com/dicnunz/codex-mission-control",
    summary:
      "Local traffic control for multiple Codex chats on a Mac: missions, lanes, outboxes, locks, dashboards, and optional phone relay.",
    proof: ["local-first command center", "lane locks", "mission dashboard", "public install path"],
    tags: ["codex", "local", "browser", "operator", "mac"],
    color: "#15b56d"
  },
  {
    id: "taskproof",
    name: "TaskProof",
    type: "proof",
    x: 0.31,
    y: 0.52,
    radius: 25,
    link: "https://github.com/dicnunz/taskproof",
    summary:
      "Playwright task runner that turns browser flows into screenshots, logs, DOM evidence, rerun scripts, and static proof reports.",
    proof: ["browser specs", "evidence bundles", "static reports", "rerunnable proof"],
    tags: ["proof", "browser", "playwright", "evidence"],
    color: "#2457ff"
  },
  {
    id: "agentproof",
    name: "AgentProof",
    type: "proof",
    x: 0.68,
    y: 0.52,
    radius: 24,
    link: "https://github.com/dicnunz/agentproof",
    summary:
      "Local proof reports for AI-built apps and public PRs, with a public demo action consumer and a self-serve audit route.",
    proof: ["CLI reports", "outside Actions proof", "public demo", "paid audit surface"],
    tags: ["proof", "agents", "github", "audit"],
    color: "#2457ff"
  },
  {
    id: "traceboard",
    name: "Traceboard",
    type: "proof",
    x: 0.44,
    y: 0.68,
    radius: 23,
    link: "https://github.com/dicnunz/traceboard",
    summary:
      "Local-first web app for inspecting, scoring, and reporting on AI agent runs with import/export and release brief generation.",
    proof: ["typed fixtures", "rubric scoring", "release brief", "Playwright smoke path"],
    tags: ["agent", "reliability", "report", "local"],
    color: "#2457ff"
  },
  {
    id: "boundary-atlas",
    name: "Boundary Atlas",
    type: "proof",
    x: 0.18,
    y: 0.28,
    radius: 21,
    link: "https://github.com/dicnunz/boundary-atlas",
    summary:
      "Offline architecture radar for TypeScript and JavaScript import graphs, cycles, deep imports, boundaries, dead exports, and drift.",
    proof: ["architecture report", "cycle detection", "local HTML output"],
    tags: ["architecture", "typescript", "proof", "local"],
    color: "#2457ff"
  },
  {
    id: "changeproof",
    name: "ChangeProof / ClaimProof",
    type: "proof",
    x: 0.8,
    y: 0.28,
    radius: 21,
    link: "https://github.com/dicnunz/changeproof",
    summary:
      "Small proof tools for code changes and product claims before ship or handoff.",
    proof: ["claim checks", "change packets", "CI-backed repos"],
    tags: ["proof", "claims", "ci", "developer"],
    color: "#2457ff"
  },
  {
    id: "agent-marketplace-evals",
    name: "Agent Marketplace Evals",
    type: "eval",
    x: 0.5,
    y: 0.13,
    radius: 22,
    link: "https://github.com/dicnunz/agent-marketplace-evals",
    summary:
      "Synthetic marketplace benchmark harness with deterministic demo mode and a bounded Codex GPT-5.5 pilot workflow.",
    proof: ["69 synthetic participants", "paired comparisons", "claim-safety files", "local demo"],
    tags: ["eval", "marketplace", "research", "codex"],
    color: "#c28d1a"
  },
  {
    id: "llm-eval-harness",
    name: "LLM Eval Harness",
    type: "eval",
    x: 0.66,
    y: 0.16,
    radius: 19,
    link: "https://github.com/dicnunz/llm-eval-harness",
    summary:
      "Practical local eval harness for comparing local LLM behavior through OpenAI-compatible APIs.",
    proof: ["fixed task packs", "run history", "Markdown reports"],
    tags: ["eval", "ollama", "local", "python"],
    color: "#c28d1a"
  },
  {
    id: "satintent",
    name: "Autonomy SatIntent",
    type: "eval",
    x: 0.34,
    y: 0.16,
    radius: 19,
    link: "https://github.com/dicnunz/autonomy-llm-satintent",
    summary:
      "Research scaffold for turning scenario text into validated satellite behavior scripts before fine-tuning or paid inference.",
    proof: ["JSON contract", "validator loop", "scenario bank", "repair loop"],
    tags: ["eval", "research", "autonomy", "schema"],
    color: "#c28d1a"
  },
  {
    id: "codex-commons",
    name: "Codex Commons",
    type: "experiment",
    x: 0.84,
    y: 0.68,
    radius: 21,
    link: "https://dicnunz.github.io/codex-commons/",
    summary:
      "Public rescue feed for Codex agents: real blockers, concrete fixes, and saved unblocks.",
    proof: ["agent-native feed", "public static site", "blocker-first framing"],
    tags: ["codex", "social", "agents", "experiment"],
    color: "#e84f45"
  },
  {
    id: "glassbox",
    name: "DevDay Glassbox",
    type: "experiment",
    x: 0.17,
    y: 0.72,
    radius: 21,
    link: "https://dicnunz.github.io/devday-glassbox/",
    summary:
      "Seven-level Codex-built browser puzzle about routing light through a black-glass lab.",
    proof: ["static game", "hand-built levels", "generated atmosphere only", "$0 runtime"],
    tags: ["game", "javascript", "codex", "experiment"],
    color: "#e84f45"
  },
  {
    id: "ai-rollout-radar",
    name: "AI Rollout Radar",
    type: "experiment",
    x: 0.63,
    y: 0.78,
    radius: 19,
    link: "https://dicnunz.github.io/ai-feature-rollout-radar/",
    summary:
      "Community-reported AI feature rollout signals with segment-aware reporting and aggregate-only public reads.",
    proof: ["source-backed catalog", "anonymous reports", "aggregate views"],
    tags: ["ai", "rollout", "signals", "public"],
    color: "#e84f45"
  }
];

const routes = {
  x: {
    title: "Start with the work that explains the feed.",
    body:
      "If you came from X, open Codex Commons and Mission Control first. They explain why the account keeps talking about Codex, Chrome, proof, and agents that need real operating discipline.",
    links: [
      ["Codex Commons", "https://dicnunz.github.io/codex-commons/"],
      ["Mission Control", "https://github.com/dicnunz/codex-mission-control"],
      ["X profile", "https://x.com/nicdunz"]
    ]
  },
  builder: {
    title: "Start with proof tools.",
    body:
      "For builders, the highest-signal path is TaskProof, AgentProof, Boundary Atlas, and Traceboard. They turn agent work into artifacts that can be inspected instead of trusted.",
    links: [
      ["TaskProof", "https://github.com/dicnunz/taskproof"],
      ["AgentProof", "https://github.com/dicnunz/agentproof"],
      ["Traceboard", "https://github.com/dicnunz/traceboard"]
    ]
  },
  recruiter: {
    title: "Start with operating range.",
    body:
      "The useful signal is not one stack. It is the ability to ship local-first products, write research scaffolds, test claims, design browser surfaces, and keep public work honest.",
    links: [
      ["GitHub profile", "https://github.com/dicnunz"],
      ["Agent Marketplace Evals", "https://github.com/dicnunz/agent-marketplace-evals"],
      ["LLM Eval Harness", "https://github.com/dicnunz/llm-eval-harness"]
    ]
  },
  research: {
    title: "Start with harnesses and constraints.",
    body:
      "The research lane is strongest when it stays testable: schema contracts, deterministic demos, local backends, clear limitations, and claim-safety files.",
    links: [
      ["Agent Marketplace Evals", "https://github.com/dicnunz/agent-marketplace-evals"],
      ["Autonomy SatIntent", "https://github.com/dicnunz/autonomy-llm-satintent"],
      ["LLM Eval Harness", "https://github.com/dicnunz/llm-eval-harness"]
    ]
  }
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeFilter = "all";
let selectedId = "mission-control";
let hoveredId = null;
let mouse = { x: 0.5, y: 0.5 };

const byId = (id) => document.getElementById(id);
const mapCanvas = byId("workMap");
const mapCtx = mapCanvas.getContext("2d");
const fieldCanvas = byId("fieldCanvas");
const fieldCtx = fieldCanvas.getContext("2d");
const detail = byId("mapDetail");
const routePanel = byId("routePanel");
const search = byId("signalSearch");
const searchResults = byId("searchResults");

function visibleWork() {
  return work.filter((item) => activeFilter === "all" || item.type === activeFilter);
}

function setDetail(item) {
  detail.innerHTML = `
    <span class="type">${item.type}</span>
    <h3>${item.name}</h3>
    <p>${item.summary}</p>
    <ul>${item.proof.map((line) => `<li>${line}</li>`).join("")}</ul>
    <a href="${item.link}">Open ${item.name}</a>
  `;
}

function drawField(time) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (fieldCanvas.width !== Math.floor(width * dpr) || fieldCanvas.height !== Math.floor(height * dpr)) {
    fieldCanvas.width = Math.floor(width * dpr);
    fieldCanvas.height = Math.floor(height * dpr);
    fieldCanvas.style.width = `${width}px`;
    fieldCanvas.style.height = `${height}px`;
  }
  fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fieldCtx.clearRect(0, 0, width, height);

  const points = 34;
  for (let i = 0; i < points; i += 1) {
    const phase = i * 1.618;
    const x = (Math.sin(phase * 1.7 + time * 0.00009) * 0.5 + 0.5) * width;
    const y = (Math.cos(phase * 1.2 + time * 0.00007) * 0.5 + 0.5) * height;
    const size = 1.1 + (i % 5) * 0.22;
    fieldCtx.fillStyle = i % 7 === 0 ? "rgba(21,181,109,0.28)" : "rgba(16,18,15,0.13)";
    fieldCtx.beginPath();
    fieldCtx.arc(x, y, size, 0, Math.PI * 2);
    fieldCtx.fill();
  }
}

function drawMap() {
  const rect = mapCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (mapCanvas.width !== Math.floor(rect.width * dpr) || mapCanvas.height !== Math.floor(rect.height * dpr)) {
    mapCanvas.width = Math.floor(rect.width * dpr);
    mapCanvas.height = Math.floor(rect.height * dpr);
  }
  mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  mapCtx.clearRect(0, 0, rect.width, rect.height);

  const nodes = visibleWork();
  const center = work.find((item) => item.id === "mission-control");

  mapCtx.fillStyle = "#0d0f0d";
  mapCtx.fillRect(0, 0, rect.width, rect.height);

  const grid = 40;
  mapCtx.strokeStyle = "rgba(244,245,239,0.055)";
  mapCtx.lineWidth = 1;
  for (let x = 0; x < rect.width; x += grid) {
    mapCtx.beginPath();
    mapCtx.moveTo(x, 0);
    mapCtx.lineTo(x, rect.height);
    mapCtx.stroke();
  }
  for (let y = 0; y < rect.height; y += grid) {
    mapCtx.beginPath();
    mapCtx.moveTo(0, y);
    mapCtx.lineTo(rect.width, y);
    mapCtx.stroke();
  }

  for (const item of nodes) {
    if (item.id === center.id) continue;
    const from = point(center, rect);
    const to = point(item, rect);
    mapCtx.strokeStyle = `${item.color}55`;
    mapCtx.lineWidth = selectedId === item.id || hoveredId === item.id ? 2.2 : 1.1;
    mapCtx.beginPath();
    mapCtx.moveTo(from.x, from.y);
    mapCtx.lineTo(to.x, to.y);
    mapCtx.stroke();
  }

  for (const item of nodes) {
    const p = point(item, rect);
    const active = selectedId === item.id;
    const hovered = hoveredId === item.id;
    const pulse = active || hovered ? 1.28 : 1;
    mapCtx.fillStyle = `${item.color}${active ? "55" : "24"}`;
    mapCtx.beginPath();
    mapCtx.arc(p.x, p.y, item.radius * pulse + 14, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = item.color;
    mapCtx.beginPath();
    mapCtx.arc(p.x, p.y, item.radius * pulse, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = "#f4f5ef";
    mapCtx.beginPath();
    mapCtx.arc(p.x - item.radius * 0.18, p.y - item.radius * 0.18, Math.max(4, item.radius * 0.22), 0, Math.PI * 2);
    mapCtx.fill();

    mapCtx.font = active ? "800 15px Inter, system-ui" : "720 13px Inter, system-ui";
    mapCtx.fillStyle = "#f4f5ef";
    mapCtx.textBaseline = "top";
    wrapLabel(item.name, p.x + item.radius + 10, p.y - 10, rect.width - p.x - item.radius - 20);
  }
}

function point(item, rect) {
  const driftX = prefersReducedMotion ? 0 : (mouse.x - 0.5) * (item.radius * 0.32);
  const driftY = prefersReducedMotion ? 0 : (mouse.y - 0.5) * (item.radius * 0.32);
  return {
    x: item.x * rect.width + driftX,
    y: item.y * rect.height + driftY
  };
}

function wrapLabel(text, x, y, maxWidth) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (mapCtx.measureText(next).width > Math.max(92, maxWidth) && line) {
      mapCtx.fillText(line, x, lineY);
      line = word;
      lineY += 17;
    } else {
      line = next;
    }
  }
  mapCtx.fillText(line, x, lineY);
}

function hitTest(event) {
  const rect = mapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  mouse = { x: x / rect.width, y: y / rect.height };
  let hit = null;
  for (const item of visibleWork()) {
    const p = point(item, rect);
    const distance = Math.hypot(p.x - x, p.y - y);
    if (distance < item.radius + 18) hit = item;
  }
  hoveredId = hit?.id || null;
  mapCanvas.style.cursor = hit ? "pointer" : "default";
  drawMap();
  return hit;
}

function setRoute(key) {
  const route = routes[key];
  routePanel.innerHTML = `
    <h3>${route.title}</h3>
    <p>${route.body}</p>
    <div class="route-links">
      ${route.links
        .map(([label, href], index) => `<a class="${index === 0 ? "primary-link" : ""}" href="${href}">${label}</a>`)
        .join("")}
    </div>
  `;
}

function renderSearch(query = "") {
  const q = query.trim().toLowerCase();
  const results = work
    .filter((item) => {
      const haystack = `${item.name} ${item.type} ${item.summary} ${item.tags.join(" ")} ${item.proof.join(" ")}`.toLowerCase();
      return !q || haystack.includes(q);
    })
    .slice(0, 8);

  searchResults.innerHTML = results
    .map(
      (item) => `
      <div class="result-row">
        <div>
          <strong>${item.name}</strong>
          <span>${item.summary}</span>
        </div>
        <a href="${item.link}">Open</a>
      </div>`
    )
    .join("");
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === button));
    const stillVisible = visibleWork().some((item) => item.id === selectedId);
    if (!stillVisible) selectedId = visibleWork()[0]?.id || "mission-control";
    setDetail(work.find((item) => item.id === selectedId));
    drawMap();
  });
});

document.querySelectorAll("[data-route]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-route]").forEach((b) => b.classList.toggle("active", b === button));
    setRoute(button.dataset.route);
  });
});

mapCanvas.addEventListener("mousemove", hitTest);
mapCanvas.addEventListener("mouseleave", () => {
  hoveredId = null;
  drawMap();
});
mapCanvas.addEventListener("click", (event) => {
  const hit = hitTest(event);
  if (!hit) return;
  selectedId = hit.id;
  setDetail(hit);
  drawMap();
});

search.addEventListener("input", (event) => renderSearch(event.target.value));
window.addEventListener("resize", drawMap);

function tick(time = 0) {
  drawField(time);
  if (!prefersReducedMotion) requestAnimationFrame(tick);
}

setDetail(work.find((item) => item.id === selectedId));
setRoute("x");
renderSearch("");
drawMap();
tick();
