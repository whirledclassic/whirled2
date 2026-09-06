#!/usr/bin/env node
/**
 * qa-flash-check.cjs — headless smoke for ?v=20260906bb Flash loft + Hybrid walk.
 * Beginner: run `node scripts/qa-flash-check.cjs` — no browser needed.
 * ENGINE DEV: asserts Hybrid gate, SWF bob, optional Ruffle docs, no tofu-on-SWF.
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

console.log("QA-FLASH check (?v=20260906bb)");

const classic = read("src/classic-avatar.js");
ok(classic.includes('VERSION = "20260906bb"'), "classic-avatar VERSION bb");
ok(classic.includes('wmode: opts.wmode || "transparent"'), "mountRuffle wmode transparent");
ok(classic.includes("shouldMountRuffleInLoft"), "hybrid gate shouldMountRuffleInLoft");
ok(classic.includes("setLoftWalkMotion"), "SWF bob walk helper");
ok(classic.includes("ensureClassicWornStates"), "ensureClassicWornStates on Wear");
ok(classic.includes("data-classic-wear-enter"), "Wear & enter loft button");
ok(classic.includes("preferHybrid"), "Prefer Hybrid checkbox");
ok(classic.includes("itemHasPngWalk"), "strict PNG walk gate");
ok(classic.includes("preview-only") || classic.includes("NOT preview") || classic.includes("not thumb/preview"), "preview-alone not Hybrid");
ok(classic.includes("Hybrid (smooth)"), "Hybrid (smooth) label");
ok(classic.includes("pointerEvents") || classic.includes("pointer-events"), "loft pointer-events handling");

const app = read("app.js");
ok(app.includes('LOGO_V = "20260906bb"'), "app LOGO_V bb");
ok(app.includes("setLoftWalkMotion"), "app wires SWF walk motion");
ok(app.includes("never wipe frames") || app.includes("never wipe frames to"), "setAvatarState never blanks frames");
ok(app.includes("HOW-CLASSIC-AVATARS-WITHOUT-FLASH"), "Dev Hub links how-without-Flash");
ok(app.includes("Ruffle = YES") || app.includes("Ruffle = YES (optional"), "Ruffle optional callout");
ok(app.includes("ensureDevUpdatesGroup"), "Dev Updates group seed");
ok(app.includes("data-avatar-emote-soon"), "emote Coming Soon stubs");
ok(app.includes("is-hybrid-smooth") || app.includes("Hybrid (smooth)"), "app hybrid loft mode");

const css = read("src/styles.css");
ok(css.includes("20260906bb"), "styles.css bb block");
ok(css.includes("whirled-swf-walk-bob") || css.includes("is-swf-walking"), "SWF bob keyframes/class");
ok(css.includes("pointer-events: none !important"), "CSS PE none on loft ruffle");
ok(css.includes("classic-ruffle-callout") || css.includes("classic-hybrid-badge"), "hybrid/callout styles");
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const brownActive = (cssNoComments.match(/#5c4030/g) || []).length + (cssNoComments.match(/#8b6914/g) || []).length;
ok(brownActive === 0, "no active brown band hexes outside comments (count=" + brownActive + ")");

const index = read("index.html");
ok(index.includes("20260906bb"), "index.html cache bb");
ok(!index.includes("20260906ba"), "index.html no stale ba");

const docs = [
  "AVATAR-IMPORT.md", "FLA-TEST-AVATAR.md", "DEV-HUB.md", "STATUS.md", "QA-FLASH.md",
  "HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md"
];
for (const d of docs) {
  ok(fs.existsSync(path.join(root, d)), "doc exists " + d);
}
const how = read("HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md");
ok(how.includes("Ruffle = YES (optional path)"), "how-doc Ruffle YES box");
ok(how.includes("PNG hybrid"), "how-doc PNG hybrid default");
ok(how.includes("Ruffle never loads"), "how-doc Whirl-only never loads Ruffle");

if (failed) {
  console.error("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed.");
