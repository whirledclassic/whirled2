#!/usr/bin/env node
/**
 * qa-flash-check.js — headless smoke for ?v=20260906ay Flash loft + room chrome.
 * Beginner: run `node scripts/qa-flash-check.js` — no browser needed.
 * ENGINE DEV: asserts CSS/config for transparent stage, PE none, hybrid, no brown bars.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
let failed = 0;
function ok(cond, msg) {
  if (cond) console.log("  PASS", msg);
  else { console.error("  FAIL", msg); failed++; }
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

console.log("QA-FLASH check (?v=20260906ay)");

const classic = read("src/classic-avatar.js");
ok(classic.includes('VERSION = "20260906ay"'), "classic-avatar VERSION ay");
ok(classic.includes('wmode: opts.wmode || "transparent"'), "mountRuffle wmode transparent");
ok(classic.includes("shouldMountRuffleInLoft"), "hybrid gate shouldMountRuffleInLoft");
ok(classic.includes("forceRuffleInLoft"), "Force Ruffle helper/flag");
ok(classic.includes("pointerEvents") || classic.includes("pointer-events"), "loft pointer-events handling");
ok(classic.includes("describeAvatarControlNextSteps"), "AvatarControl next-steps doc helper");
ok(classic.includes("Hybrid (smooth)"), "Hybrid (smooth) label");
ok(classic.includes("backgroundColor: null") || classic.includes("? null"), "transparent/null backgroundColor path");

const app = read("app.js");
ok(app.includes('LOGO_V = "20260906ay"'), "app LOGO_V ay");
ok(app.includes("is-hybrid-smooth") || app.includes("Hybrid (smooth)"), "app hybrid loft mode");
ok(app.includes("forceRuffleLoft") || app.includes("forceRuffleInLoft"), "app Force Ruffle wiring");

const css = read("src/styles.css");
ok(css.includes("20260906ay"), "styles.css ay block");
ok(css.includes("pointer-events: none !important"), "CSS PE none on loft ruffle");
ok(css.includes("classic-hybrid-badge"), "hybrid badge styles");
ok(css.includes("Kill brown/black room bars") || css.includes("no brown"), "room bar kill block");
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const brownActive = (cssNoComments.match(/#5c4030/g) || []).length + (cssNoComments.match(/#8b6914/g) || []).length;
ok(brownActive === 0, "no active brown band hexes outside comments (count=" + brownActive + ")");

const index = read("index.html");
ok(index.includes("20260906ay"), "index.html cache ay");
ok(!index.includes("20260906ax"), "index.html no stale ax");

const docs = ["AVATAR-IMPORT.md", "FLA-TEST-AVATAR.md", "DEV-HUB.md", "STATUS.md", "QA-FLASH.md"];
for (const d of docs) {
  ok(fs.existsSync(path.join(root, d)), "doc exists " + d);
}

if (failed) {
  console.error("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed.");
