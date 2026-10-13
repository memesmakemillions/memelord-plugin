#!/usr/bin/env node
// Validate plugins/memelord against the OpenAI plugin directory submission rules
// and package it as a ZIP for upload. No dependencies; Node.js 18 or later.
//
//   node scripts/build-openai-zip.mjs            # validate and write dist/memelord-openai-<version>.zip
//   node scripts/build-openai-zip.mjs --check    # validate only
//   node scripts/build-openai-zip.mjs --out path/to/file.zip
//
// Rules come from https://developers.openai.com/plugins/deploy/submission,
// https://developers.openai.com/plugins/deploy/submission-errors and
// https://developers.openai.com/plugins/build/plugins.

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const repoRoot = process.cwd();
const pluginDir = path.join(repoRoot, "plugins", "memelord");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const outIndex = args.indexOf("--out");
const outOverride = outIndex !== -1 ? args[outIndex + 1] : null;

const errors = [];
const warnings = [];
const addError = (message) => errors.push(message);
const addWarning = (message) => warnings.push(message);

// Files and folders that ship in the OpenAI ZIP. Everything else in the plugin
// folder (Cursor manifest, commands/, README, CHANGELOG) is client-specific or
// repo documentation and stays out.
const INCLUDE_FILES = ["plugin.json", "mcp.json", "LICENSE"];
const INCLUDE_DIRS = ["skills", "assets"];
const EXCLUDE_DIRS = ["commands", ".cursor-plugin", ".codex-plugin", "hooks", "scripts"];
const EXCLUDE_FILES = [".app.json", ".mcp.json", "README.md", "CHANGELOG.md"];

const PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";
const MCP_URL = "https://www.memelord.com/api/mcp";

const CATEGORIES = [
  "Productivity",
  "Creativity",
  "Developer Tools",
  "Business & Operations",
  "Data & Analytics",
  "Communication",
  "Education & Research",
  "Security",
  "Finance",
  "Healthcare",
  "Travel",
  "Entertainment",
  "Other",
];

// Tool names published at https://www.memelord.com/hackers/mcp. tools_triggered
// in the review cases must only reference these.
const KNOWN_TOOLS = new Set([
  "search_memes",
  "get_meme_template",
  "get_trending_memes",
  "list_image_tools",
  "upload_media",
  "create_media_upload_url",
  "generate_caption_meme",
  "generate_ai_meme",
  "edit_meme",
  "generate_video_meme",
  "edit_video_meme",
  "check_video_status",
  "list_video_jobs",
  "list_video_models",
  "run_video_model",
  "run_genjutsu",
  "run_agent",
  "run_image_tool",
  "get_account",
]);

const LIMITS = {
  name: 64,
  version: 64,
  description: 1024,
  authorName: 120,
  authorEmail: 320,
  authorUrl: 2048,
  homepage: 2048,
  displayName: 30,
  shortDescription: 30,
  longDescription: 4000,
  developerName: 80,
  capabilities: 20,
  capability: 120,
  defaultPrompts: 3,
  defaultPrompt: 128,
  listingUrl: 1024,
  positiveCases: 5,
  negativeCases: 3,
  caseDescription: 4000,
  imageBytes: 5 * 1024 * 1024,
  imageMinPx: 48,
  imageMaxPx: 4096,
  skillDescription: 1024,
  skillIdentity: 64,
};

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PACKAGE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/;
const SECRET_PATTERNS = [
  /mlord_live_[A-Za-z0-9]/,
  /\bsk-[A-Za-z0-9]{8,}/,
  /Bearer\s+[A-Za-z0-9._~+/-]{16,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
];
const FORBIDDEN_KEYS = new Set([
  "test_credentials",
  "reviewer_instructions",
  "clientSecret",
  "client_secret",
  "password",
  "apiKey",
  "api_key",
  "token",
  "accessToken",
  "access_token",
]);

// ---------- helpers ----------

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, label) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    addError(`${label} is missing: ${path.relative(repoRoot, filePath)}`);
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      addError(`${label} must contain a JSON object at the top level.`);
      return null;
    }
    return parsed;
  } catch (error) {
    addError(`${label} contains invalid JSON: ${error.message}`);
    return null;
  }
}

function isSupportedText(value) {
  return typeof value === "string" && value.trim().length > 0 && !CONTROL_CHARS.test(value);
}

function isOneLine(value) {
  return typeof value === "string" && !/[\r\n\t]/.test(value);
}

function checkText(value, label, { max, oneLine = false, required = true, multiline = false } = {}) {
  if (value === undefined || value === null) {
    if (required) addError(`${label} is required.`);
    return;
  }
  if (typeof value !== "string") {
    addError(`${label} must be a string.`);
    return;
  }
  if (value.trim().length === 0) {
    addError(`${label} must be non-empty.`);
    return;
  }
  const test = multiline ? value.replace(/\r?\n/g, "") : value;
  if (!isSupportedText(test)) {
    addError(`${label} contains unsupported control characters.`);
  }
  if (oneLine && !isOneLine(value)) {
    addError(`${label} must fit on one line.`);
  }
  if (max !== undefined && value.length > max) {
    addError(`${label} must be ${max} characters or fewer (got ${value.length}).`);
  }
}

function checkHttpsUrl(value, label, { max = LIMITS.listingUrl, required = true } = {}) {
  if (value === undefined || value === null) {
    if (required) addError(`${label} is required.`);
    return;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    addError(`${label} must be a non-empty string.`);
    return;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    addError(`${label} is not a valid URL: ${value}`);
    return;
  }
  if (url.protocol !== "https:") addError(`${label} must use HTTPS: ${value}`);
  if (!url.hostname) addError(`${label} must include a host: ${value}`);
  if (url.username || url.password) addError(`${label} must not contain embedded credentials.`);
  if (CONTROL_CHARS.test(value) || /\s/.test(value)) addError(`${label} contains unsupported characters.`);
  if (value.length > max) addError(`${label} must be ${max} characters or fewer.`);
}

function relativeLuminance(hex) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA, hexB) {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function checkBrandColor(value, label, against, againstLabel) {
  if (value === undefined) return;
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    addError(`${label} must be a six-digit hex color such as #1ABCFE.`);
    return;
  }
  const ratio = contrastRatio(value, against);
  if (ratio < 2) {
    addError(`${label} (${value}) has ${ratio.toFixed(2)}:1 contrast against ${againstLabel}; at least 2:1 is required.`);
  }
}

function normalizePrompt(value) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function isSafeAssetPath(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value !== value.trim()) return false;
  if (CONTROL_CHARS.test(value) || /[\u0000-\u001F]/.test(value)) return false;
  if (!value.startsWith("./")) return false;
  if (value.includes("\\") || path.posix.isAbsolute(value.slice(2)) || /^[A-Za-z]:/.test(value.slice(2))) return false;
  const segments = value.slice(2).split("/");
  return !segments.some((segment) => segment === ".." || segment === "");
}

function readPngSize(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return null;
  if (buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

function readSvgSize(buffer) {
  const text = buffer.toString("utf8");
  if (!/<svg[\s>]/i.test(text)) return null;
  const viewBox = text.match(/viewBox\s*=\s*"([^"]+)"/i);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const width = text.match(/<svg[^>]*\swidth\s*=\s*"([0-9.]+)"/i);
  const height = text.match(/<svg[^>]*\sheight\s*=\s*"([0-9.]+)"/i);
  if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
  return null;
}

async function checkImageAsset(fieldLabel, assetPath) {
  if (!isSafeAssetPath(assetPath)) {
    addError(`${fieldLabel} must be a ./-prefixed relative path inside the plugin without ".." (got ${JSON.stringify(assetPath)}).`);
    return;
  }
  const resolved = path.join(pluginDir, assetPath.slice(2));
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    addError(`${fieldLabel} references a missing file: ${assetPath}`);
    return;
  }
  if (!stat.isFile()) {
    addError(`${fieldLabel} must reference a regular file: ${assetPath}`);
    return;
  }
  if (stat.size > LIMITS.imageBytes) {
    addError(`${fieldLabel} image exceeds 5 MiB: ${assetPath}`);
  }
  const ext = path.extname(assetPath).toLowerCase();
  const buffer = await fs.readFile(resolved);
  let size = null;
  let detected = null;
  if (readPngSize(buffer)) {
    detected = ".png";
    size = readPngSize(buffer);
  } else if (readJpegSize(buffer)) {
    detected = ".jpg";
    size = readJpegSize(buffer);
  } else if (readWebpSize(buffer)) {
    detected = ".webp";
    size = readWebpSize(buffer);
  } else if (readSvgSize(buffer)) {
    detected = ".svg";
    size = readSvgSize(buffer);
  }
  if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) {
    addError(`${fieldLabel} must end in .png, .jpg, .jpeg, .webp, or .svg: ${assetPath}`);
    return;
  }
  if (!detected) {
    addError(`${fieldLabel} could not be decoded as PNG, JPEG, WebP, or SVG: ${assetPath}`);
    return;
  }
  const extMatches = detected === ".jpg" ? [".jpg", ".jpeg"].includes(ext) : detected === ext;
  if (!extMatches) {
    addError(`${fieldLabel} extension ${ext} does not match detected format ${detected}: ${assetPath}`);
  }
  if (!size || !(size.width > 0) || !(size.height > 0)) {
    addError(`${fieldLabel} has unreadable dimensions: ${assetPath}`);
    return;
  }
  if (size.width !== size.height) {
    addError(`${fieldLabel} must be square (got ${size.width}x${size.height}): ${assetPath}`);
  }
  if (size.width < LIMITS.imageMinPx) {
    addError(`${fieldLabel} must be at least 48x48 pixels (got ${size.width}x${size.height}): ${assetPath}`);
  }
  if (detected !== ".svg" && size.width > LIMITS.imageMaxPx) {
    addError(`${fieldLabel} must not exceed 4096x4096 pixels: ${assetPath}`);
  }
}

function walkKeys(value, visit, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkKeys(entry, visit, [...trail, String(index)]));
  } else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      visit(key, entry, [...trail, key]);
      walkKeys(entry, visit, [...trail, key]);
    }
  }
}

function scanForSecrets(text, label) {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      addError(`${label} appears to contain a secret or token (matched ${pattern}). Keep credentials out of the package.`);
    }
  }
}

// ---------- validators ----------

async function validatePluginManifest() {
  const manifest = await readJson(path.join(pluginDir, "plugin.json"), "plugin.json");
  if (!manifest) return null;

  const allowedRoot = new Set(["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"]);
  for (const key of Object.keys(manifest)) {
    if (!allowedRoot.has(key)) addError(`plugin.json: unknown root field "${key}" (the Agent Plugins schema forbids additional properties).`);
  }

  if (manifest.$schema !== PLUGIN_SCHEMA) {
    addError(`plugin.json: "$schema" must be ${PLUGIN_SCHEMA}.`);
  }
  checkText(manifest.name, 'plugin.json "name"', { max: LIMITS.name, oneLine: true });
  if (typeof manifest.name === "string") {
    if (!PACKAGE_NAME.test(manifest.name)) {
      addError('plugin.json "name" must start with an ASCII letter or digit and contain only ASCII letters, digits, "_" or "-".');
    }
    if (manifest.name !== manifest.name.toLowerCase() || /[._]/.test(manifest.name) || /--/.test(manifest.name)) {
      addWarning('plugin.json "name": use lowercase letters, digits, and single hyphens for packages you plan to submit.');
    }
  }
  checkText(manifest.version, 'plugin.json "version"', { max: LIMITS.version, oneLine: true });
  if (typeof manifest.version === "string" && !SEMVER.test(manifest.version)) {
    addError(`plugin.json "version" must be a semantic version such as 1.0.0 (got ${manifest.version}).`);
  }
  checkText(manifest.description, 'plugin.json "description"', { max: LIMITS.description, multiline: true });

  if (!manifest.author || typeof manifest.author !== "object" || Array.isArray(manifest.author)) {
    addError('plugin.json "author" must be an object with a "name".');
  } else {
    for (const key of Object.keys(manifest.author)) {
      if (!["name", "email", "url"].includes(key)) addError(`plugin.json "author.${key}" is not allowed by the schema.`);
    }
    checkText(manifest.author.name, 'plugin.json "author.name"', { max: LIMITS.authorName, oneLine: true });
    checkText(manifest.author.email, 'plugin.json "author.email"', { max: LIMITS.authorEmail, oneLine: true, required: false });
    checkHttpsUrl(manifest.author.url, 'plugin.json "author.url"', { max: LIMITS.authorUrl, required: false });
  }
  checkHttpsUrl(manifest.homepage, 'plugin.json "homepage"', { max: LIMITS.homepage, required: false });
  if (manifest.repository !== undefined) checkHttpsUrl(manifest.repository, 'plugin.json "repository"', { max: LIMITS.homepage, required: false });
  if (manifest.license !== undefined && typeof manifest.license !== "string") addError('plugin.json "license" must be a string.');
  if (manifest.keywords !== undefined && (!Array.isArray(manifest.keywords) || !manifest.keywords.every((k) => typeof k === "string"))) {
    addError('plugin.json "keywords" must be an array of strings.');
  }

  const openai = manifest.extensions?.["com.openai"];
  if (!openai || typeof openai !== "object") {
    addError('plugin.json must define "extensions.com.openai" with "interface", "review", and "publication".');
    return manifest;
  }
  for (const key of Object.keys(openai)) {
    if (["hooks", "apps"].includes(key)) {
      addError(`plugin.json "extensions.com.openai.${key}" blocks public directory submission. Remove it.`);
    } else if (!["interface", "review", "publication", "onboardingSkill", "id"].includes(key)) {
      addWarning(`plugin.json "extensions.com.openai.${key}" is not a documented field.`);
    }
  }

  await validateInterface(openai.interface);
  validateReview(openai.review);
  validatePublication(openai.publication);

  if (openai.onboardingSkill !== undefined) {
    if (!isSafeAssetPath(openai.onboardingSkill) || !/\/SKILL\.md$/.test(openai.onboardingSkill)) {
      addError('"onboardingSkill" must be a ./-prefixed path to a packaged skills/<skill>/SKILL.md.');
    } else if (!(await pathExists(path.join(pluginDir, openai.onboardingSkill.slice(2))))) {
      addError(`"onboardingSkill" references a missing file: ${openai.onboardingSkill}`);
    }
  }

  walkKeys(manifest, (key, _value, trail) => {
    if (FORBIDDEN_KEYS.has(key)) {
      addError(`plugin.json must not contain "${trail.join(".")}". Credentials and reviewer instructions go in the portal, never in the package.`);
    }
  });
  scanForSecrets(JSON.stringify(manifest), "plugin.json");

  return manifest;
}

async function validateInterface(ui) {
  const label = "extensions.com.openai.interface";
  if (!ui || typeof ui !== "object") {
    addError(`${label} is required.`);
    return;
  }
  checkText(ui.displayName, `${label}.displayName`, { max: LIMITS.displayName, oneLine: true });
  checkText(ui.shortDescription, `${label}.shortDescription`, { max: LIMITS.shortDescription, oneLine: true });
  checkText(ui.longDescription, `${label}.longDescription`, { max: LIMITS.longDescription, multiline: true });
  checkText(ui.developerName, `${label}.developerName`, { max: LIMITS.developerName, oneLine: true });

  if (typeof ui.category !== "string" || !CATEGORIES.includes(ui.category)) {
    addError(`${label}.category must be one of: ${CATEGORIES.join(", ")}.`);
  }

  if (ui.capabilities !== undefined) {
    if (!Array.isArray(ui.capabilities)) {
      addError(`${label}.capabilities must be an array of strings.`);
    } else {
      if (ui.capabilities.length > LIMITS.capabilities) addError(`${label}.capabilities must have ${LIMITS.capabilities} entries or fewer.`);
      ui.capabilities.forEach((entry, index) =>
        checkText(entry, `${label}.capabilities[${index}]`, { max: LIMITS.capability, oneLine: true })
      );
    }
  }

  for (const field of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
    checkHttpsUrl(ui[field], `${label}.${field}`);
  }

  if (ui.defaultPrompt !== undefined) {
    const prompts = Array.isArray(ui.defaultPrompt) ? ui.defaultPrompt : [ui.defaultPrompt];
    if (prompts.length > LIMITS.defaultPrompts) addError(`${label}.defaultPrompt must contain at most ${LIMITS.defaultPrompts} prompts.`);
    const seen = new Set();
    prompts.forEach((prompt, index) => {
      checkText(prompt, `${label}.defaultPrompt[${index}]`, { max: LIMITS.defaultPrompt, oneLine: true });
      if (typeof prompt !== "string") return;
      if (/(^|\s)@\w/.test(prompt)) addError(`${label}.defaultPrompt[${index}] must not contain an @mention.`);
      const normalized = normalizePrompt(prompt);
      if (seen.has(normalized)) addError(`${label}.defaultPrompt[${index}] duplicates another prompt.`);
      seen.add(normalized);
    });
  }

  checkBrandColor(ui.brandColor, `${label}.brandColor`, "#FFFFFF", "white");
  checkBrandColor(ui.brandColorDark, `${label}.brandColorDark`, "#212121", "#212121");

  for (const field of ["logo", "composerIcon"]) {
    if (ui[field] === undefined) {
      addError(`${label}.${field} is required and must reference a square image.`);
    }
  }
  for (const field of ["logo", "logoDark", "composerIcon", "composerIconDark"]) {
    if (ui[field] !== undefined) await checkImageAsset(`${label}.${field}`, ui[field]);
  }

  if (ui.screenshots !== undefined) {
    // Screenshots are only accepted when the MCP tool scan reports a UI output
    // template. Memelord's server returns URLs, not UI, so they'd be rejected.
    addError(`${label}.screenshots is set, but screenshots are only allowed when the MCP server provides custom UI (screenshots_not_allowed).`);
  }
}

function validateReview(review) {
  const label = "extensions.com.openai.review";
  if (!review || typeof review !== "object") {
    addError(`${label} is required for MCP review (test cases, demo recording, commerce).`);
    return;
  }
  const cases = review.test_cases;
  if (!cases || typeof cases !== "object") {
    addError(`${label}.test_cases must define "positive" and "negative" arrays.`);
  } else {
    const positive = Array.isArray(cases.positive) ? cases.positive : [];
    const negative = Array.isArray(cases.negative) ? cases.negative : [];
    if (!Array.isArray(cases.positive) || positive.length !== LIMITS.positiveCases) {
      addError(`${label}.test_cases.positive must contain exactly ${LIMITS.positiveCases} cases (got ${positive.length}).`);
    }
    if (!Array.isArray(cases.negative) || negative.length !== LIMITS.negativeCases) {
      addError(`${label}.test_cases.negative must contain exactly ${LIMITS.negativeCases} cases (got ${negative.length}).`);
    }
    positive.forEach((entry, index) => validateTestCase(entry, `${label}.test_cases.positive[${index}]`, true));
    negative.forEach((entry, index) => validateTestCase(entry, `${label}.test_cases.negative[${index}]`, false));
  }

  checkHttpsUrl(review.demo_recording_url, `${label}.demo_recording_url`);
  if (typeof review.demo_recording_url === "string" && /example\.com|REPLACE|PLACEHOLDER|TODO/i.test(review.demo_recording_url)) {
    addWarning(`${label}.demo_recording_url is still a placeholder. Replace it with the reviewer-accessible walkthrough before submitting.`);
  }
  if (typeof review.commerce !== "boolean") {
    addError(`${label}.commerce must be true or false.`);
  }
  checkText(review.commerce_description, `${label}.commerce_description`, { multiline: true, required: false });
  if (typeof review.commerce_description === "string" && /PLACEHOLDER|REPLACE|TODO|pending owner/i.test(review.commerce_description)) {
    addWarning(`${label}.commerce_description is marked as a placeholder. Confirm the commerce declaration with the owner before submitting.`);
  }
}

function validateTestCase(entry, label, positive) {
  if (!entry || typeof entry !== "object") {
    addError(`${label} must be an object.`);
    return;
  }
  checkText(entry.description, `${label}.description`, { max: LIMITS.caseDescription, multiline: true });
  checkText(entry.prompt, `${label}.prompt`, { multiline: true });
  if (positive) {
    checkText(entry.tools_triggered, `${label}.tools_triggered`, { oneLine: true });
    checkText(entry.expected_behavior, `${label}.expected_behavior`, { multiline: true });
    if (typeof entry.tools_triggered === "string") {
      const tools = entry.tools_triggered.split(/[,\s]+/).filter(Boolean);
      if (tools.length === 0) addError(`${label}.tools_triggered must name at least one tool.`);
      for (const tool of tools) {
        if (!KNOWN_TOOLS.has(tool)) {
          addError(`${label}.tools_triggered names "${tool}", which is not a Memelord MCP tool. Known tools: ${[...KNOWN_TOOLS].join(", ")}.`);
        }
      }
    }
  } else if (entry.expected_behavior !== undefined) {
    checkText(entry.expected_behavior, `${label}.expected_behavior`, { multiline: true, required: false });
  }
  if (entry.file_attachment_urls !== undefined) {
    if (!Array.isArray(entry.file_attachment_urls)) addError(`${label}.file_attachment_urls must be an array.`);
    else entry.file_attachment_urls.forEach((url, index) => checkHttpsUrl(url, `${label}.file_attachment_urls[${index}]`, { max: 2048 }));
  }
  if (entry.expected_output_url !== undefined) checkHttpsUrl(entry.expected_output_url, `${label}.expected_output_url`, { max: 2048 });
}

function validatePublication(publication) {
  const label = "extensions.com.openai.publication";
  if (!publication || typeof publication !== "object") {
    addError(`${label} is required (release_notes).`);
    return;
  }
  checkText(publication.release_notes, `${label}.release_notes`, { multiline: true });
  if (publication.countries !== undefined) {
    if (!Array.isArray(publication.countries) || !publication.countries.every((c) => /^[A-Z]{2}$/.test(c))) {
      addError(`${label}.countries must be an array of uppercase two-letter country codes.`);
    }
  }
  if (publication.translations !== undefined && publication.translations !== null) {
    if (typeof publication.translations !== "object") {
      addError(`${label}.translations must be an object keyed by locale.`);
    } else {
      for (const [locale, entry] of Object.entries(publication.translations)) {
        if (!locale.trim()) addError(`${label}.translations has an empty locale key.`);
        if (!entry || typeof entry !== "object") {
          addError(`${label}.translations.${locale} must be an object.`);
          continue;
        }
        if (entry.subtitle !== undefined && entry.subtitle !== null) {
          checkText(entry.subtitle, `${label}.translations.${locale}.subtitle`, { max: 30, oneLine: true });
        }
        if (entry.description !== undefined && entry.description !== null) {
          checkText(entry.description, `${label}.translations.${locale}.description`, { max: 4000, multiline: true });
        }
      }
    }
  }
}

async function validateMcpConfig() {
  const config = await readJson(path.join(pluginDir, "mcp.json"), "mcp.json");
  if (!config) return;
  if (config.$schema !== MCP_SCHEMA) addError(`mcp.json: "$schema" must be ${MCP_SCHEMA}.`);
  for (const key of Object.keys(config)) {
    if (!["$schema", "mcpServers"].includes(key)) addError(`mcp.json: unknown root field "${key}".`);
  }
  const servers = config.mcpServers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    addError('mcp.json: "mcpServers" must be an object.');
    return;
  }
  const names = Object.keys(servers);
  if (names.length !== 1) {
    addError(`mcp.json must declare exactly one MCP server for plugin-level review cases (found ${names.length}).`);
  }
  for (const name of names) {
    const server = servers[name];
    if (!name.trim()) addError("mcp.json: server name must not be blank.");
    if (!server || typeof server !== "object") {
      addError(`mcp.json: server "${name}" must be an object.`);
      continue;
    }
    if (server.type !== "streamable-http") {
      addError(`mcp.json: server "${name}" must use type "streamable-http" for a remote submission (got ${JSON.stringify(server.type)}).`);
    }
    checkHttpsUrl(server.url, `mcp.json server "${name}" url`, { max: 2048 });
    if (server.url && server.url !== MCP_URL) {
      addWarning(`mcp.json: server "${name}" url is ${server.url}; the hosted Memelord MCP server is ${MCP_URL}.`);
    }
    if (server.headers !== undefined) {
      if (server.headers && typeof server.headers === "object" && Object.keys(server.headers).length > 0) {
        addError(`mcp.json: server "${name}" has non-empty headers. Public submission rejects server headers; use OAuth instead.`);
      } else {
        addWarning(`mcp.json: server "${name}" declares an empty headers object; remove it.`);
      }
    }
    for (const key of Object.keys(server)) {
      if (!["type", "url", "headers", "extensions"].includes(key)) addError(`mcp.json: server "${name}" has unknown field "${key}".`);
    }
    const auth = server.extensions?.["com.openai"]?.auth;
    if (auth) {
      if (!["none", "oauth", "mixed", "api_key"].includes(auth.type)) addError(`mcp.json: server "${name}" auth.type is invalid.`);
      if (auth.type === "api_key") addError(`mcp.json: server "${name}" declares api_key auth, which the submission portal cannot connect.`);
      if (auth.type === "none") addWarning(`mcp.json: server "${name}" declares auth "none" but the Memelord MCP server requires OAuth.`);
    }
  }
  walkKeys(config, (key, _value, trail) => {
    if (FORBIDDEN_KEYS.has(key)) addError(`mcp.json must not contain "${trail.join(".")}".`);
  });
  scanForSecrets(JSON.stringify(config), "mcp.json");
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { fields, body: normalized.slice(end + 5) };
}

async function validateSkills(pluginName) {
  const skillsDir = path.join(pluginDir, "skills");
  if (!(await pathExists(skillsDir))) {
    addError("skills/ directory is missing; a public submission needs at least one skill.");
    return;
  }
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const names = new Set();
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      addWarning(`skills/${entry.name} is not a directory and will be ignored.`);
      continue;
    }
    if (entry.name.startsWith(".")) {
      addError(`skills/${entry.name}: skill directory names must not begin with ".".`);
      continue;
    }
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (!(await pathExists(skillFile))) {
      addError(`skills/${entry.name} has no SKILL.md.`);
      continue;
    }
    count += 1;
    const content = await fs.readFile(skillFile, "utf8");
    const parsed = parseFrontmatter(content);
    const relative = path.relative(repoRoot, skillFile);
    if (!parsed) {
      addError(`${relative}: SKILL.md must start with YAML front matter between --- lines.`);
      continue;
    }
    checkText(parsed.fields.name, `${relative} front matter "name"`, { oneLine: true });
    checkText(parsed.fields.description, `${relative} front matter "description"`, { max: LIMITS.skillDescription, oneLine: true });
    if (parsed.body.trim().length === 0) addError(`${relative}: skill instructions must not be empty.`);
    const name = parsed.fields.name;
    if (name) {
      if (names.has(name)) addError(`${relative}: duplicate skill name "${name}".`);
      names.add(name);
      if (name !== entry.name) addWarning(`${relative}: front matter name "${name}" differs from directory name "${entry.name}".`);
      if (pluginName && `${pluginName}:${name}`.length > LIMITS.skillIdentity) {
        addError(`${relative}: "${pluginName}:${name}" exceeds ${LIMITS.skillIdentity} characters.`);
      }
    }
    if (/\bCursor\b/.test(content)) {
      addWarning(`${relative} mentions Cursor; skills in the OpenAI package should be client-neutral.`);
    }
    scanForSecrets(content, relative);
    const nested = await fs.readdir(path.join(skillsDir, entry.name), { withFileTypes: true });
    for (const child of nested) {
      if (child.isDirectory() && (await pathExists(path.join(skillsDir, entry.name, child.name, "SKILL.md")))) {
        addError(`skills/${entry.name}/${child.name}/SKILL.md is nested; each skill must be an immediate child of skills/.`);
      }
    }
  }
  if (count === 0) addError("skills/ contains no skills.");
}

async function validateForbiddenFiles() {
  for (const name of ["hooks", ".app.json", ".mcp.json"]) {
    if (await pathExists(path.join(pluginDir, name))) {
      if (name === "hooks") addError("plugins/memelord/hooks exists; lifecycle hooks block public directory submission.");
      else if (name === ".app.json") addError("plugins/memelord/.app.json exists; app references block ZIP submission.");
      else addWarning("plugins/memelord/.mcp.json exists; the portable root mcp.json is canonical and .mcp.json is ignored.");
    }
  }
  if (await pathExists(path.join(pluginDir, ".codex-plugin", "plugin.json"))) {
    addWarning("plugins/memelord/.codex-plugin/plugin.json exists but is ignored because root plugin.json defines extensions.com.openai.");
  }
  if (!(await pathExists(path.join(pluginDir, "LICENSE")))) {
    addWarning("plugins/memelord/LICENSE is missing; the ZIP will not include a license file.");
  }
}

// ---------- packaging ----------

async function collectFiles() {
  const files = [];
  for (const file of INCLUDE_FILES) {
    const full = path.join(pluginDir, file);
    if (await pathExists(full)) files.push(file);
  }
  for (const dir of INCLUDE_DIRS) {
    const full = path.join(pluginDir, dir);
    if (!(await pathExists(full))) continue;
    const stack = [full];
    while (stack.length > 0) {
      const current = stack.pop();
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(current, entry.name);
        const relative = path.relative(pluginDir, entryPath).split(path.sep).join("/");
        if (entry.name.startsWith(".") || EXCLUDE_FILES.includes(entry.name)) continue;
        if (entry.isSymbolicLink()) {
          addWarning(`${relative} is a symbolic link and is skipped.`);
          continue;
        }
        if (entry.isDirectory()) {
          if (EXCLUDE_DIRS.includes(entry.name)) continue;
          stack.push(entryPath);
        } else if (entry.isFile()) {
          files.push(relative);
        }
      }
    }
  }
  files.sort();
  for (const file of files) {
    if (file.split("/").length > 20) addError(`${file}: archive paths may contain at most 20 segments.`);
    if (file !== file.trim() || /\\/.test(file)) addError(`${file}: archive paths must not have outer whitespace or backslashes.`);
  }
  const lowered = new Map();
  for (const file of files) {
    const key = file.normalize("NFKC").toLowerCase();
    if (lowered.has(key)) addError(`${file} collides with ${lowered.get(key)} after case/Unicode normalization.`);
    lowered.set(key, file);
  }
  return files;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getUTCFullYear());
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { dosTime, dosDate };
}

async function writeZip(files, outPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  // Fixed timestamp keeps builds reproducible.
  const { dosTime, dosDate } = dosDateTime(new Date(Date.UTC(2026, 0, 1)));

  for (const file of files) {
    const data = await fs.readFile(path.join(pluginDir, file));
    const nameBuffer = Buffer.from(file, "utf8");
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // made by: Unix, zip 3.0
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38); // regular file, rw-r--r--
    central.writeUInt32LE(offset, 42);

    localParts.push(local, nameBuffer, payload);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + payload.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, Buffer.concat([...localParts, ...centralParts, eocd]));
}

// ---------- main ----------

async function main() {
  if (!(await pathExists(pluginDir))) {
    addError(`Plugin directory not found: ${path.relative(repoRoot, pluginDir)}. Run from the repository root.`);
    report();
    return;
  }

  const manifest = await validatePluginManifest();
  await validateMcpConfig();
  await validateSkills(manifest?.name);
  await validateForbiddenFiles();
  const files = await collectFiles();

  if (!files.includes("plugin.json")) addError("plugin.json would not be included in the ZIP.");
  if (!files.includes("mcp.json")) addError("mcp.json would not be included in the ZIP.");
  if (files.some((file) => file.startsWith("commands/"))) addError("commands/ must not be included in the OpenAI ZIP.");

  report();

  console.log(`Files in package (${files.length}):`);
  for (const file of files) console.log(`- ${file}`);

  if (checkOnly) {
    console.log("\nCheck complete; no ZIP written (--check).");
    return;
  }

  const version = manifest?.version ?? "0.0.0";
  const outPath = outOverride
    ? path.resolve(repoRoot, outOverride)
    : path.join(repoRoot, "dist", `memelord-openai-${version}.zip`);
  await writeZip(files, outPath);
  const stat = await fs.stat(outPath);
  console.log(`\nWrote ${path.relative(repoRoot, outPath)} (${stat.size} bytes).`);
}

function report() {
  if (warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of warnings) console.log(`- ${warning}`);
    console.log("");
  }
  if (errors.length > 0) {
    console.error("Validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Validation passed.\n");
}

await main();
