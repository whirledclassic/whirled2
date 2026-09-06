#!/usr/bin/env node
/**
 * qa-flash-check.cjs — headless smoke for ?v=20260906cf
 * Companion host SWF nest + Classic Flash loft walk/emote + dual Wear + bt never-tofu.
 * Beginner: run `node scripts/qa-flash-check.cjs` — no browser needed.
 * ENGINE DEV: hostWalk/hostLoadUrl, WhirledAvatarHostBridge, Hybrid gate, Smooth intact.
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

console.log("QA-FLASH check (?v=20260906cf — DIRECT-stable; companion auto-upgrade OFF)");

const classic = read("src/classic-avatar.js");
ok(classic.includes('VERSION = "20260906cf"'), "classic-avatar VERSION cf");
ok(classic.includes("COMPANION_HOST_SWF") || classic.includes("avatar-host.swf"), "companion host SWF path");
ok(classic.includes("installWhirledAvatarHostBridge"), "WhirledAvatarHostBridge installer");
ok(classic.includes("hostLoadUrl"), "hostLoadUrl wiring");
ok(classic.includes("hostLoadBytes") || classic.includes("callHostLoadBytes"), "hostLoadBytes wiring");
ok(classic.includes("prepareCompanionStrategy") || classic.includes("prepareCompanionPayload"), "prepareCompanionStrategy");
ok(classic.includes("resolveSwfBytes"), "resolveSwfBytes");
ok(classic.includes("getRufflePublicPath"), "getRufflePublicPath");
ok(classic.includes("applyOfficialRuffleConfig"), "applyOfficialRuffleConfig");
ok(classic.includes("publicPath"), "publicPath config");
ok(classic.includes("swfData") && classic.includes("swfFileName"), "DataLoadOptions swfData/swfFileName");
ok(/api\.load\(loadOpts\)/.test(classic) || classic.includes("ruffle().load"), "preferred ruffle().load");
ok(classic.includes("callExternalInterface"), "callExternalInterface");
ok(fs.existsSync(path.join(root, "RUFFLE-INTEGRATION.md")), "RUFFLE-INTEGRATION.md");
ok(classic.includes("remountDirectAvatar"), "remountDirectAvatar fallback");
ok(classic.includes("WEAR_AUTO_COMPANION_UPGRADE = false") || classic.includes("direct-stable-visible") || classic.includes("companion auto-upgrade OFF"), "DIRECT-stable skip auto companion");
ok(classic.includes("is-companion-connected") || classic.includes("data-mount-mode"), "companion-connected / mount-mode markers");
ok(classic.includes("hostWalk"), "hostWalk wiring");
ok(classic.includes("hostEmote"), "hostEmote wiring");
ok(classic.includes("callHostWalk") || classic.includes("tryCallHostMethod"), "callHostWalk / tryCallHostMethod");
ok(classic.includes("getCompanionHostSwfUrl"), "getCompanionHostSwfUrl");
ok(classic.includes("ROOT CAUSE FIX") || classic.includes("Do NOT put thumb"), "thumb-idle Hybrid fix");
ok(classic.includes("classic-swf-stand-thumb"), "stand thumb fallback");
ok(classic.includes('data-auto-ruffle="1"'), "Classic Flash default radio");
var pngWalkFn = classic.split("function itemHasPngWalk")[1].split("function itemHasStandThumb")[0];
ok(pngWalkFn.includes("states.walk"), "itemHasPngWalk checks walk");
ok(!/item\.frames && item\.frames\.length/.test(pngWalkFn), "itemHasPngWalk ignores bare frames");
ok(classic.includes('wmode: opts.wmode || "transparent"'), "mountRuffle wmode transparent");
ok(classic.includes("shouldMountRuffleInLoft"), "hybrid gate shouldMountRuffleInLoft");
ok(classic.includes("setLoftWalkMotion"), "SWF bob walk helper");
ok(classic.includes("notifyLoftWalk"), "notifyLoftWalk API");
ok(classic.includes("notifyLoftEmote"), "notifyLoftEmote API");
ok(classic.includes("WhirledAvatarHost"), "WhirledAvatarHost shim");
ok(classic.includes("attachLoftAvatarHost"), "attachLoftAvatarHost");
ok(classic.includes("ensureStandFallback") || classic.includes("classic-swf-placeholder"), "stand/glyph fallback");
ok(classic.includes("data-swf-sha1"), "data-swf-sha1 on host");
ok(classic.includes("is-mounting") || classic.includes("is-playing"), "mount state classes");
ok(classic.includes("CRITICAL") || classic.includes("do NOT wipe stand"), "mountRuffle preserve stand");
ok(classic.includes("savedStand") && classic.includes("keepBits"), "mountRuffle restores stand via savedStand/keepBits");
ok(classic.includes("allowScriptAccess"), "allowScriptAccess for loft EI");
ok(classic.includes("tryCallIntoSwf"), "tryCallIntoSwf EI probe");
ok(classic.includes("getLoftHostDebug"), "getLoftHostDebug");
ok(classic.includes("avatarDebug"), "avatarDebug flag");
ok(classic.includes("appearanceChanged"), "appearanceChanged probe names");
ok(classic.includes("fallback") || classic.includes("companion host mount failed"), "host→direct fallback");
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

const hostSwf = path.join(root, "assets/avatar-host/avatar-host.swf");
ok(fs.existsSync(hostSwf), "assets/avatar-host/avatar-host.swf exists");
ok(fs.statSync(hostSwf).size > 1000, "avatar-host.swf size>1k");
const hostHx = read("tools/avatar-host/AvatarHost.hx");
ok(hostHx.includes("controlConnect"), "AvatarHost.hx listens controlConnect");
ok(hostHx.includes("appearanceChanged_v2"), "AvatarHost.hx calls appearanceChanged_v2");
ok(hostHx.includes("hostWalk"), "AvatarHost.hx hostWalk");
ok(hostHx.includes("hostLoadUrl"), "AvatarHost.hx hostLoadUrl");
ok(hostHx.includes("hostLoadBytes"), "AvatarHost.hx hostLoadBytes");
ok(hostHx.includes("loadBytes"), "AvatarHost.hx Loader.loadBytes");
ok(hostHx.includes("WhirledAvatarHostBridge"), "AvatarHost.hx bridge name");
ok(!/com\.threerings\.msoy/.test(hostHx), "AvatarHost.hx no msoy package (no AGPL copy)");

const app = read("app.js");
ok(app.includes('LOGO_V = "20260906cf"'), "app LOGO_V cf");
ok(app.includes("classicRuffleWearHtml"), "app classicRuffleWearHtml never-tofu");
ok(app.includes("data-swf-sha1"), "app data-swf-sha1");
ok(app.includes("classic-swf-placeholder"), "app placeholder glyph");
ok(app.includes("playModeEarly"), "app playbackMode-first loft");
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
ok(app.includes("I'm away from the keyboard.") || app.includes("away from the keyboard"), "away default message");

const css = read("src/styles.css");
ok(css.includes("avatar-hitbox"), "CSS avatar-hitbox");
ok(css.includes("20260906cf") || css.includes("20260906ca") || css.includes("is-ruffle-billboard") || css.includes("avatar-hitbox"), "styles cf / hitbox");
ok(css.includes("whirled-swf-walk-bob") || css.includes("is-swf-walking"), "SWF bob keyframes/class");
ok(css.includes("pointer-events: none !important"), "CSS PE none on loft ruffle");
ok(css.includes("classic-swf-stand-thumb"), "CSS stand thumb under Ruffle");
ok(css.includes("classic-swf-placeholder"), "CSS placeholder glyph");
ok(css.includes("--wear-face") && css.includes("whirled-swf-host-bob"), "CSS face flip in host bob");
ok(css.includes("classic-ruffle-callout") || css.includes("classic-hybrid-badge") || css.includes("classic-mode-card"), "hybrid/callout/mode styles");
const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const brownActive = (cssNoComments.match(/#5c4030/g) || []).length + (cssNoComments.match(/#8b6914/g) || []).length;
ok(brownActive === 0, "no active brown band hexes outside comments (count=" + brownActive + ")");

const index = read("index.html");
ok(index.includes("20260906cf"), "index.html cache cf");
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
ok(how.includes("20260906cf") || how.includes("20260906ca") || how.includes("hitbox") || how.includes("RUFFLE-INTEGRATION"), "how-doc cf / Ruffle");
ok(how.includes("appearanceChanged_v2") || how.includes("sharedEvents"), "how-doc protocol");
ok(how.includes("avatar-host") || how.includes("companion host") || how.includes("hostWalk"), "how-doc companion host");
ok(how.includes("What works in Classic Flash") || how.includes("WhirledAvatarHost"), "how-doc honest Ruffle table");

const status = read("STATUS.md");
ok(status.includes("20260906cf"), "STATUS cf");
ok(status.includes("companion host") || status.includes("avatar-host") || status.includes("hostWalk"), "STATUS companion host");

if (failed) {
  console.error("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed.");
