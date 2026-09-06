#!/usr/bin/env node

// CI smoke checks use the published snapshots unchanged, including the labeled
// synthetic Mission Control example. No app engines or credentials are needed.
import assert from "node:assert/strict";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = path.resolve(process.env.BROWSER_SMOKE_ARTIFACTS || path.join(tmpdir(), "portfolio-browser-smoke"));
const timeout = 10_000;
const viewports = [
  { name: "desktop", viewport: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false },
  { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const projects = [
  ["Boundary Atlas links", "/demos/boundary-atlas/", "boundary-atlas"],
  ["Counterexample Studio links", "/demos/counterexample/", "counterexample-studio"],
  ["PixelMelt links", "/demos/pixelmelt/", "pixelmelt"],
  ["Asyncio experiment links", "/demos/asyncio/", "asyncio-thread-timeout-lab"],
  ["Mission Control links", "/demos/mission-control/", "codex-mission-control"],
  ["Coloring certificate links", "/demos/crumby/", "crumby-minimum-18"],
];
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

async function serve(request, response) {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 500).end("File unavailable");
  }
}

// Retry only asynchronous state assertions; a failed scenario is never rerun.
async function eventually(assertion) {
  const deadline = Date.now() + timeout;
  for (;;) {
    try { return await assertion(); }
    catch (error) {
      if (Date.now() >= deadline) throw error;
      await delay(100);
    }
  }
}

async function textEquals(locator, expected) {
  await eventually(async () => assert.equal((await locator.innerText()).trim(), expected));
}

async function countEquals(locator, expected) {
  await eventually(async () => assert.equal(await locator.count(), expected));
}

async function noOverflow(page) {
  const dimensions = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return {
      width,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      outside: [...document.body.querySelectorAll("*")].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > width + 1);
      }).slice(0, 12).map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${String(element.className).slice(0, 100)}`),
    };
  });
  assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `Horizontal page overflow: ${JSON.stringify(dimensions)}`);
}

async function imagesLoad(page) {
  const images = page.locator("img");
  for (const image of await images.all()) {
    // Scroll as a visitor would so loading="lazy" is exercised, not removed.
    if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
    await eventually(async () => {
      const state = await image.evaluate((element) => ({
        src: element.currentSrc || element.src,
        loaded: element.complete && element.naturalWidth > 0 && element.naturalHeight > 0,
      }));
      assert.ok(state.loaded, `Image did not load: ${state.src}`);
    });
  }
}

async function homepage(page) {
  for (const [label, demo, repository] of projects) {
    const links = await page.getByRole("navigation", { name: label, exact: true }).getByRole("link").evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
    assert.deepEqual(links, [demo, `https://github.com/dicnunz/${repository}`], `${label} must link to its demo and source`);
  }
  await countEquals(page.locator(".projects .preview img"), 3);
  await countEquals(page.locator("img.portrait"), 1);
}

async function boundary(page) {
  const modules = page.locator(".module-table tbody tr");
  const query = page.getByRole("searchbox", { name: "Search modules or import specifiers" });
  await textEquals(page.locator(".result-count"), "9 of 9 nodes · 10 edges");
  await query.fill("no-match-for-browser-smoke");
  await textEquals(page.locator(".result-count"), "0 of 9 nodes · 0 edges");
  await page.getByText("No modules in this view", { exact: true }).waitFor({ state: "visible" });
  await countEquals(modules, 0);
  await query.fill("");
  await textEquals(page.locator(".result-count"), "9 of 9 nodes · 10 edges");
  await countEquals(modules, 9);
  await page.locator(".finding-list").getByRole("button", { name: /Cross-feature fan-out from src\/features\/checkout/ }).click();
  await page.getByRole("button", { name: "Isolate finding in graph", exact: true }).click();
  await textEquals(page.locator(".result-count"), "5 of 9 nodes · 4 edges");
  await page.getByRole("group", { name: /^file dependency graph: 5 nodes and 4 edges\./ }).waitFor({ state: "visible" });
  await countEquals(modules, 5);
  assert.deepEqual(await modules.locator("td:first-child button > span:nth-child(2)").allTextContents(), [
    "src/features/auth/index.ts",
    "src/features/checkout/submit-order.ts",
    "src/features/finance/index.ts",
    "src/features/marketing/index.ts",
    "src/features/support/index.ts",
  ]);
}

async function counterexample(page) {
  const link = page.getByRole("link", { name: "Download JSON", exact: true });
  const response = await page.request.get(new URL(await link.getAttribute("href"), page.url()).href);
  assert.equal(response.status(), 200, "Saved report JSON must be downloadable");
  const report = await response.json();
  assert.equal(report.cases.length, 1);
  const entry = report.cases[0];
  assert.equal(entry.status, "fail");
  await textEquals(page.locator(".status-fail"), "Failed");
  const metrics = await page.locator(".metrics > div").evaluateAll((elements) => Object.fromEntries(elements.map((element) => [element.querySelector("dt").textContent, element.querySelector("dd").textContent])));
  assert.deepEqual(metrics, { Seed: String(entry.seed), "Runs before failure": String(entry.numRuns), "Accepted shrinks": String(entry.numShrinks), "Shrink path": entry.counterexamplePath });
  for (const [label, value] of [["Failing input", entry.failingInput.json], ["Expected", entry.expected.value.json], ["Actual", entry.actual.value.json]]) {
    const panel = page.locator(".code-frame").filter({ has: page.getByText(label, { exact: true }) });
    assert.deepEqual(JSON.parse(await panel.locator("pre").textContent()), value, `${label} must match the saved report`);
  }
  await textEquals(page.locator(".replay-section pre"), entry.rerunCommand);
  await countEquals(page.locator(".details-section tbody tr"), entry.shrinkTrace.length);
  await page.getByText(/Saved report from the local engine\./).waitFor({ state: "visible" });
}

async function pixelmelt(page) {
  const canvas = page.getByLabel("Material simulation canvas", { exact: true });
  await canvas.waitFor({ state: "visible" });
  await textEquals(page.getByTestId("tick-count"), "0");
  await textEquals(page.locator(".simulation-state"), "Paused");
  const pixels = await canvas.evaluate((element) => {
    const data = element.getContext("2d").getImageData(0, 0, element.width, element.height).data;
    const colors = new Set();
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 0) colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
    }
    return { width: element.width, height: element.height, colors: colors.size };
  });
  assert.ok(pixels.width > 0 && pixels.height > 0 && pixels.colors > 1, `Initial material canvas is blank or unpainted: ${JSON.stringify(pixels)}`);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await textEquals(page.getByTestId("tick-count"), "1");
  await textEquals(page.locator(".simulation-state"), "Paused");
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await textEquals(page.getByTestId("tick-count"), "2");
}

async function mission(page) {
  await countEquals(page.locator("[data-lane-state]:visible"), 7);
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await textEquals(page.locator("#lane-count"), "1 lane");
  await countEquals(page.locator("[data-lane-state]:visible"), 1);
  await page.locator('[data-lane-state="stale"]').waitFor({ state: "visible" });
  const copy = page.getByRole("button", { name: "Copy claim command" });
  assert.ok(await copy.isDisabled(), "An empty owner must not create a claim command");
  await page.getByLabel("Surface", { exact: true }).selectOption("DESKTOP");
  await page.getByLabel("Session owner", { exact: true }).fill("CI REVIEW");
  await page.getByLabel("What are you doing?", { exact: true }).fill("Review Nic's demo");
  await page.getByLabel("Lease (seconds)", { exact: true }).fill("600");
  assert.equal(await page.getByLabel("Generated claim command", { exact: true }).inputValue(), "/Users/example/Developer/codex-mission-control/cmc --hub '/Users/example/Codex Mission Control' claim DESKTOP 'CI REVIEW' 'Review Nic'\"'\"'s demo' --ttl 600");
  assert.ok(await copy.isEnabled(), "Valid input must enable copying the generated command");
}

async function crumby(page) {
  const status = page.locator("#status");
  await textEquals(status, "Released witness: all three coloring rules hold.");
  await countEquals(page.locator("#vertices button"), 17);
  await countEquals(page.locator("#graph .edge"), 24);
  await page.locator("#vertices").getByRole("button", { name: "Vertex 0, blue. Change color.", exact: true }).click();
  await eventually(async () => assert.match(await status.innerText(), /^This coloring breaks [1-9]/));
  assert.match(await page.locator("#violations").innerText(), /four-vertex path/);
  assert.equal(await page.locator("#vertices").getByRole("button", { name: "Vertex 0, red. Change color.", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Restore witness", exact: true }).click();
  await textEquals(status, "Released witness: all three coloring rules hold.");
  await countEquals(page.locator("#violations li"), 0);
  assert.equal(await page.locator("#vertices").getByRole("button", { name: "Vertex 0, blue. Change color.", exact: true }).getAttribute("aria-pressed"), "false");
}

async function asyncio(page) {
  const scenarios = page.locator(".scenario");
  await countEquals(scenarios, 2);
  for (const [index, label] of ["Semaphore(1) + to_thread", "ThreadPoolExecutor(1)"].entries()) {
    const scenario = scenarios.nth(index);
    assert.equal(await scenario.getByRole("table").isVisible(), false, "Ledger starts collapsed");
    await scenario.locator("summary").click();
    await scenario.getByRole("table", { name: `${label}: measured event ledger`, exact: true }).waitFor({ state: "visible" });
    await countEquals(scenario.locator("tbody tr"), 12);
    await scenario.getByRole("cell", { name: "Awaiter cancelled", exact: true }).waitFor({ state: "visible" });
    await countEquals(scenario.getByRole("cell", { name: "Blocking call finished", exact: true }), 2);
    await textEquals(scenario.locator(".peak strong"), String(index === 0 ? 2 : 1));
  }
}

const pages = [
  { name: "home", route: "/", heading: "Nicholas Dunzelman", run: homepage },
  { name: "boundary-atlas", route: "/demos/boundary-atlas/", heading: "ts-cross-feature-portal", run: boundary },
  { name: "counterexample", route: "/demos/counterexample/", heading: "Chunk preserves all values", run: counterexample },
  { name: "pixelmelt", route: "/demos/pixelmelt/", heading: "Astral Sigil", run: pixelmelt },
  { name: "mission-control", route: "/demos/mission-control/", heading: "Check the handoff.", run: mission },
  { name: "crumby", route: "/demos/crumby/", heading: "A coloring you can inspect.", run: crumby },
  { name: "asyncio", route: "/demos/asyncio/", heading: "The awaiter stops. The worker keeps going.", run: asyncio },
];

await mkdir(artifacts, { recursive: true });
const server = createServer((request, response) => { void serve(request, response); });
await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const results = [];
let browser;

try {
  browser = await chromium.launch();
  for (const { name: viewportName, ...options } of viewports) {
    for (const target of pages) {
      const name = `${viewportName}-${target.name}`;
      const context = await browser.newContext({ ...options, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.setDefaultTimeout(timeout);
      const issues = [];
      page.on("pageerror", (error) => issues.push(`Runtime: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") issues.push(`Console: ${message.text()}`); });
      page.on("requestfailed", (request) => issues.push(`Request: ${request.url()} ${request.failure()?.errorText}`));
      page.on("response", (response) => { if (response.status() >= 400) issues.push(`HTTP ${response.status()}: ${response.url()}`); });
      const result = { name, route: target.route, viewport: options.viewport, status: "passed", checks: [], issues };
      let step = "page identity";
      try {
        const response = await page.goto(`${origin}${target.route}`, { waitUntil: "load" });
        assert.equal(response?.status(), 200);
        assert.equal(new URL(page.url()).pathname, target.route);
        await page.getByRole("heading", { level: 1, name: target.heading, exact: true }).waitFor({ state: "visible" });
        assert.ok((await page.title()).trim(), "Page title must not be empty");
        assert.equal(await page.locator("vite-error-overlay, nextjs-portal").count(), 0, "No framework error overlay");
        result.checks.push(step);
        step = "images load";
        await imagesLoad(page);
        result.checks.push(step);
        step = "initial page fits viewport";
        await noOverflow(page);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: path.join(artifacts, `${name}-initial.png`), fullPage: true });
        result.checks.push(step);
        step = "demo behavior";
        await target.run(page);
        result.checks.push(step);
        step = "page fits after interaction";
        await noOverflow(page);
        result.checks.push(step);
        if (target.name !== "home") await page.screenshot({ path: path.join(artifacts, `${name}-interaction.png`), fullPage: true });
        step = "runtime and asset health";
        assert.deepEqual(issues, [], "Page must have no runtime errors or failed asset requests");
        result.checks.push(step);
        console.log(`PASS ${name}: ${result.checks.join(", ")}`);
      } catch (error) {
        result.status = "failed";
        result.failedStep = step;
        result.error = error.stack || String(error);
        console.error(`FAIL ${name} (${step}): ${result.error}`);
        await page.screenshot({ path: path.join(artifacts, `${name}-failure.png`), fullPage: true }).catch(() => {});
        await writeFile(path.join(artifacts, `${name}-failure.html`), await page.content().catch(() => "")).catch(() => {});
      } finally {
        results.push(result);
        await context.close();
        await writeFile(path.join(artifacts, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
      }
    }
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const failures = results.filter((result) => result.status === "failed");
console.log(`${results.length - failures.length}/${pages.length * viewports.length} page/viewport checks passed. Evidence: ${artifacts}`);
if (failures.length > 0 || results.length !== pages.length * viewports.length) process.exitCode = 1;
