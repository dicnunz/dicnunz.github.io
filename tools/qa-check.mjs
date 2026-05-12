#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build"]);

const failures = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(path.join(dir, entry.name)));
      }
      continue;
    }

    if (entry.isFile()) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function rel(file) {
  return path.relative(rootDir, file) || ".";
}

function lineFor(text, index) {
  return text.slice(0, index).split("\n").length;
}

function fail(check, file, line, message) {
  failures.push({ check, file, line, message });
}

function printResult(name, checkFailures, passMessage) {
  if (checkFailures.length === 0) {
    console.log(`PASS ${name}: ${passMessage}`);
    return;
  }

  console.log(`FAIL ${name}: ${checkFailures.length} issue${checkFailures.length === 1 ? "" : "s"}`);
  for (const issue of checkFailures) {
    const location = issue.line ? `${rel(issue.file)}:${issue.line}` : rel(issue.file);
    console.log(`  - ${location} ${issue.message}`);
  }
}

function stripQueryAndHash(value) {
  const hashIndex = value.indexOf("#");
  const queryIndex = value.indexOf("?");
  const cutPoints = [hashIndex, queryIndex].filter((index) => index >= 0);
  return cutPoints.length > 0 ? value.slice(0, Math.min(...cutPoints)) : value;
}

function isExternalReference(value) {
  return /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)
    || /^(?:mailto|tel|sms|javascript|data|blob):/i.test(value);
}

function isSkippableReference(value) {
  const trimmed = value.trim();
  return trimmed === "" || trimmed.startsWith("#") || isExternalReference(trimmed);
}

function resolveLocalReference(fromFile, rawValue) {
  const trimmed = rawValue.trim();
  const withoutQuery = stripQueryAndHash(trimmed);

  if (!withoutQuery) {
    return null;
  }

  if (withoutQuery.startsWith("/")) {
    return path.resolve(rootDir, `.${withoutQuery}`);
  }

  return path.resolve(path.dirname(fromFile), withoutQuery);
}

function localReferenceExists(resolvedPath) {
  if (!resolvedPath || !resolvedPath.startsWith(rootDir)) {
    return false;
  }

  if (fs.existsSync(resolvedPath)) {
    return true;
  }

  if (fs.existsSync(`${resolvedPath}.html`)) {
    return true;
  }

  return fs.existsSync(path.join(resolvedPath, "index.html"));
}

function parseAttributes(rawAttributes) {
  const attrs = new Map();
  const attrPattern = /([:@\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of rawAttributes.matchAll(attrPattern)) {
    attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attrs;
}

function parseTags(html) {
  const tags = [];
  const tagPattern = /<([a-z][a-z0-9-]*)(\s[^<>]*)?>/gi;

  for (const match of html.matchAll(tagPattern)) {
    tags.push({
      name: match[1].toLowerCase(),
      attrs: parseAttributes(match[2] ?? ""),
      index: match.index,
    });
  }

  return tags;
}

function splitSrcset(srcset) {
  return srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function cssUrlReferences(css) {
  const refs = [];
  const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*?))\s*\)/gi;

  for (const match of css.matchAll(urlPattern)) {
    refs.push({ value: match[1] ?? match[2] ?? match[3] ?? "", index: match.index });
  }

  return refs;
}

function metaContent(tags, key, value) {
  const loweredValue = value.toLowerCase();
  const tag = tags.find((candidate) => {
    const attrValue = candidate.attrs.get(key);
    return attrValue && attrValue.toLowerCase() === loweredValue;
  });

  return tag?.attrs.get("content")?.trim() ?? "";
}

const allFiles = walk(rootDir);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html")).sort();
const cssFiles = allFiles.filter((file) => file.endsWith(".css")).sort();
const checkNames = [
  "file discovery",
  "empty href/src",
  "duplicate ids",
  "local references",
  "basic SEO tags",
  "image alt coverage",
];

if (htmlFiles.length === 0) {
  fail("file discovery", rootDir, null, "no HTML files found");
}

if (cssFiles.length === 0) {
  fail("file discovery", rootDir, null, "no CSS files found");
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const tags = parseTags(html);
  const ids = new Map();

  for (const tag of tags) {
    for (const attrName of ["href", "src"]) {
      if (tag.attrs.has(attrName) && tag.attrs.get(attrName).trim() === "") {
        fail("empty href/src", file, lineFor(html, tag.index), `<${tag.name}> has empty ${attrName}`);
      }
    }

    if (tag.attrs.has("id")) {
      const id = tag.attrs.get("id").trim();
      if (ids.has(id)) {
        const firstLine = ids.get(id);
        fail("duplicate ids", file, lineFor(html, tag.index), `duplicate id "${id}" first appears on line ${firstLine}`);
      } else {
        ids.set(id, lineFor(html, tag.index));
      }
    }

    if (tag.name === "img") {
      const alt = tag.attrs.get("alt");
      const isDecorative = tag.attrs.get("role") === "presentation" || tag.attrs.get("aria-hidden") === "true";
      if (alt === undefined || (alt.trim() === "" && !isDecorative)) {
        fail("image alt coverage", file, lineFor(html, tag.index), `<img> missing descriptive alt text`);
      }
    }

    for (const attrName of ["href", "src", "poster"]) {
      if (!tag.attrs.has(attrName)) {
        continue;
      }

      const value = tag.attrs.get(attrName);
      if (isSkippableReference(value)) {
        continue;
      }

      const resolved = resolveLocalReference(file, value);
      if (!localReferenceExists(resolved)) {
        fail("local references", file, lineFor(html, tag.index), `${attrName}="${value}" does not resolve to a local file`);
      }
    }

    if (tag.attrs.has("srcset")) {
      for (const source of splitSrcset(tag.attrs.get("srcset"))) {
        if (!isSkippableReference(source)) {
          const resolved = resolveLocalReference(file, source);
          if (!localReferenceExists(resolved)) {
            fail("local references", file, lineFor(html, tag.index), `srcset entry "${source}" does not resolve to a local file`);
          }
        }
      }
    }
  }

  for (const tag of tags.filter((candidate) => candidate.attrs.has("href"))) {
    const value = tag.attrs.get("href").trim();
    if (!value.startsWith("#")) {
      continue;
    }

    const targetId = decodeURIComponent(value.slice(1));
    if (targetId && !ids.has(targetId)) {
      fail("local references", file, lineFor(html, tag.index), `href="${value}" points to a missing in-page id`);
    }
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const seoRequirements = [
    ["<title>", title],
    ['meta name="description"', metaContent(tags, "name", "description")],
    ['meta name="viewport"', metaContent(tags, "name", "viewport")],
    ['meta property="og:title"', metaContent(tags, "property", "og:title")],
    ['meta property="og:description"', metaContent(tags, "property", "og:description")],
  ];

  for (const [label, content] of seoRequirements) {
    if (!content) {
      fail("basic SEO tags", file, null, `missing non-empty ${label}`);
    }
  }
}

for (const file of cssFiles) {
  const css = fs.readFileSync(file, "utf8");

  for (const ref of cssUrlReferences(css)) {
    const value = ref.value.trim();
    if (isSkippableReference(value)) {
      continue;
    }

    const resolved = resolveLocalReference(file, value);
    if (!localReferenceExists(resolved)) {
      fail("local references", file, lineFor(css, ref.index), `url("${value}") does not resolve to a local file`);
    }
  }
}

for (const checkName of checkNames) {
  const checkFailures = failures.filter((failure) => failure.check === checkName);
  const passMessage = checkName === "file discovery"
    ? `${htmlFiles.length} HTML file${htmlFiles.length === 1 ? "" : "s"}, ${cssFiles.length} CSS file${cssFiles.length === 1 ? "" : "s"}`
    : "no issues found";
  printResult(checkName, checkFailures, passMessage);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
