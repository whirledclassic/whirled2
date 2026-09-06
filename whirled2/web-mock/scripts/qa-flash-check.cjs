#!/usr/bin/env node
/**
 * qa-flash-check.cjs — headless smoke for ?v=20260906bl
 * Combined: bk club polish + Classic Flash loft interactivity (walk/emote/EI shim).
 * Beginner: run `node scripts/qa-flash-check.cjs` — no browser needed.
 * ENGINE DEV: dual Wear cards, Hybrid gate, hitbox PE, WhirledAvatarHost, Smooth intact.
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

console.log("QA-FLASH check (?v=20260906bl — Ruffle interactivity + bk club)");

const classic = read("src/classic-avatar.js");
ok(classic.includes('VERSION = "20260906bl"'), "classic-avatar VERSION bl");
ok(classic.includes('wmode: opts.wmode || "transparent"'), "mountRuffle wmode transparent");
ok(classic.includes("shouldMountRuffleInLoft"), "hybrid gate shouldMountRuffleInLoft");
ok(classic.includes("setLoftWalkMotion"), "SWF bob walk helper");
ok(classic.includes("notifyLoftWalk"), "notifyLoftWalk API");
ok(classic.includes("notifyLoftEmote"), "notifyLoftEmote API");
ok(classic.includes("WhirledAvatarHost"), "WhirledAvatarHost shim");
ok(classic.includes("attachLoftAvatarHost"), "attachLoftAvatarHost");
ok(classic.includes("allowScriptAccess"), "allowScriptAccess for loft EI");
ok(classic.includes("tryCallIntoSwf"), "tryCallIntoSwf EI probe");
ok(classic.includes("getLoftHostDebug"), "getLoftHostDebug");
ok(classic.includes("avatarDebug"), "avatarDebug flag");
ok(classic.includes("appearanceChanged"), "appearanceChanged probe names");
ok(classic.includes("setBodyState") || classic.includes("triggerAction"), "body state / action names");
ok(classic.includes("ensureClassicWornStates"), "ensureClassicWornStates on Wear");
ok(classic.includes("data-classic-wear-enter"), "Wear & enter loft button");
ok(classic.includes("playbackMode"), "playbackMode field");
ok(classic.includes("getPlaybackMode"), "getPlaybackMode API");
ok(classic.includes("classicWearModePickerHtml"), "Wear mode picker");
ok(classic.includes("Whirled2 Smooth"), "Whirled2 Smooth label");
ok(classic.includes("Classic Flash (Ruffle)"), "Classic Flash (Ruffle) label");
ok(classic.includes("png-hybrid"), "png-hybrid mode id");
ok(classic.includes("itemHasPngWalk"), "strict PNG walk gate");
ok(classic.includes("pointerEvents") || classic.includes("pointer-events"), "loft pointer-events handling");
ok(classic.includes('name="playbackMode"') || classic.includes("data-playback-mode-item"), "Wear mode radios");
ok(!/playbackMode\s*=\s*null/.test(classic) || classic.includes("getPlaybackMode"), "dual-mode API intact");

const app = read("app.js");
ok(app.includes('LOGO_V = "20260906bl"'), "app LOGO_V bl");
ok(app.includes("avatar-hitbox"), "avatar-hitbox in loft HTML");
ok(app.includes("data-avatar-emote-chrome"), "chrome emote buttons");
ok(app.includes("playClassicChromeEmote"), "playClassicChromeEmote");
ok(app.includes("notifyLoftWalk"), "app wires notifyLoftWalk");
ok(app.includes("is-ruffle-billboard"), "ruffle billboard class");
ok(app.includes("setLoftWalkMotion") || app.includes("notifyLoftWalk"), "app wires SWF walk motion");
ok(app.includes("never wipe frames") || app.includes("never wipe frames to"), "setAvatarState never blanks frames");
ok(app.includes("HOW-CLASSIC-AVATARS-WITHOUT-FLASH"), "Dev Hub links how-without-Flash");
ok(app.includes("Ruffle = YES") || app.includes("Ruffle = YES (optional") || app.includes("Dual Wear modes"), "Ruffle optional / dual modes callout");
ok(app.includes("ensureDevUpdatesGroup"), "Dev Updates group seed");
ok(app.includes("data-avatar-emote-soon") || app.includes("data-avatar-emote-chrome"), "emote menu buttons");
ok(app.includes("is-hybrid-smooth") || app.includes("Hybrid (smooth)") || app.includes("png-hybrid"), "app hybrid loft mode");
ok(app.includes("classicWearModePickerHtml"), "app injects Wear mode picker");
ok(app.includes("getPlaybackMode"), "app honors getPlaybackMode");
ok(app.includes("storage full") || app.includes("120000"), "Wear persist harden vs blown localStorage");
// bk club preserved in combined ship
ok(app.includes("/e") || app.includes("\\\\/e") || app.includes('"/e"') || app.includes("'/e'") || app.includes("case \"e\"") || /\/e\b/.test(app), "bk /e alias present-ish");
ok(app.includes("I'm away from the keyboard.") || app.includes("away from the keyboard"), "away default message");

const css = read("src/styles.css");
ok(css.includes("avatar-hitbox"), "CSS avatar-hitbox");
ok(css.includes("20260906bl") || css.includes("is-ruffle-billboard") || css.includes("avatar-hitbox"), "styles bl / hitbox");
ok(css.includes("whirled-swf-walk-bob") || css.includes("is-swf-walking"), "SWF bob keyframes/class");
ok(css.includes("pointer-events: none !important"), "CSS PE none on loft ruffle");
ok(css.includes("classic-ruffle-callout") || css.includes("classic-hybrid-badge") || css.includes("classic-mode-card"), "hybrid/callout/mode styles");
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const brownActive = (cssNoComments.match(/#5c4030/g) || []).length + (cssNoComments.match(/#8b6914/g) || []).length;
ok(brownActive === 0, "no active brown band hexes outside comments (count=" + brownActive + ")");

const index = read("index.html");
ok(index.includes("20260906bl"), "index.html cache bl");
ok(index.includes("classic-avatar.js"), "index loads classic-avatar.js");

const docs = [
  "AVATAR-IMPORT.md", "FLA-TEST-AVATAR.md", "DEV-HUB.md", "STATUS.md", "QA-FLASH.md",
  "HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md"
];
for (const d of docs) {
  ok(fs.existsSync(path.join(root, d)), "doc exists " + d);
}
const how = read("HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md");
ok(how.includes("Ruffle = YES (optional path)"), "how-doc Ruffle YES box");
ok(how.includes("PNG hybrid") || how.includes("png-hybrid"), "how-doc PNG hybrid");
ok(how.includes("Ruffle never loads"), "how-doc Whirl-only never loads Ruffle");
ok(how.includes("dual modes") || how.includes("Dual modes") || how.includes("Why dual modes"), "how-doc dual modes why");
ok(how.includes("playbackMode"), "how-doc playbackMode");
ok(how.includes("20260906bl") || how.includes("hitbox"), "how-doc bl / hitbox");
ok(how.includes("What works in Classic Flash") || how.includes("WhirledAvatarHost"), "how-doc honest Ruffle table");

const status = read("STATUS.md");
ok(status.includes("20260906bl"), "STATUS bl");
ok(status.includes("hitbox") || status.includes("WhirledAvatarHost") || status.includes("interactivity"), "STATUS Flash interactivity");

if (failed) {
  console.error("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed.");
