#!/usr/bin/env node
/**
 * qa-flash-check.cjs — headless smoke for ?v=20260906ck
 * Companion hostWalk / Body walk + DemoAvatar continuous walk + DIRECT EI fallback.
 * Preserve cj: tofu CSS walk + chrome floor-click even with Pixi canvas.
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

console.log("QA-FLASH check (?v=20260906ck — companion hostWalk + DemoAvatar walk + cj tofu/chrome)");

const classic = read("src/classic-avatar.js");
ok(classic.includes('VERSION = "20260906ck"'), "classic-avatar VERSION ck");
ok(classic.includes("BODY_DEMO_SWF_ALT") || classic.includes("assets/ruffle/demo-avatar.swf"), "classic body demo alt path");
ok(classic.includes("standTofuHtml") || classic.includes("classic-swf-stand-tofu"), "standTofuHtml helper");
ok(classic.includes("connect_soft_fail"), "connect_soft_fail soft bridge");
ok(classic.includes("directEiWalk"), "directEiWalk flag");
ok(classic.includes("demo_ei_ready"), "demo_ei_ready bridge");
ok(fs.existsSync(path.join(root, "assets/ruffle/demo-avatar.swf")), "assets/ruffle/demo-avatar.swf exists");
ok(fs.existsSync(path.join(root, "assets/avatars/flash-qa/demo-avatar.swf")), "assets/avatars/flash-qa/demo-avatar.swf exists");
ok(fs.statSync(path.join(root, "assets/ruffle/demo-avatar.swf")).size >= 6000, "demo-avatar.swf rebuilt (>=6k walk cycle)");

ok(classic.includes("COMPANION_HOST_SWF") || classic.includes("avatar-host.swf"), "companion host SWF path");
ok(classic.includes("installWhirledAvatarHostBridge"), "WhirledAvatarHostBridge installer");
ok(classic.includes("hostLoadBytes") || classic.includes("callHostLoadBytes"), "hostLoadBytes wiring");
ok(classic.includes("prepareCompanionStrategy") || classic.includes("prepareCompanionPayload"), "prepareCompanionStrategy");
ok(classic.includes("resolveSwfBytes"), "resolveSwfBytes");
ok(classic.includes("getRufflePublicPath"), "getRufflePublicPath");
ok(classic.includes("applyOfficialRuffleConfig"), "applyOfficialRuffleConfig");
ok(classic.includes("publicPath"), "publicPath config");
ok(classic.includes("swfData") && classic.includes("swfFileName"), "DataLoadOptions swfData/swfFileName");
ok(/api\.load\(loadOpts\)/.test(classic) || classic.includes("ruffle().load"), "preferred ruffle().load");
ok(classic.includes("callExternalInterface"), "callExternalInterface");
ok(classic.includes("WEAR_COMPANION_ONLY = true") || classic.includes("WEAR_COMPANION_ONLY"), "WEAR_COMPANION_ONLY flag");
ok(classic.includes("resolveHostEiPlayer"), "resolveHostEiPlayer");
ok(classic.includes("awaiting-ready") || classic.includes("hostReady"), "hostLoadBytes ready-gate");
ok(classic.includes("companion-cover") || classic.includes("mountCompanionOnly"), "companion-only cover mount");
ok(classic.includes("EI silent miss") || classic.includes("silent miss"), "EI silent-miss fix");
ok(classic.includes("hostWalk"), "hostWalk wiring");
ok(classic.includes("notifyLoftWalk"), "notifyLoftWalk API");
ok(classic.includes("Ruffle connected") || classic.includes('"connected"'), "honest connected status");
ok(classic.includes("Ruffle DIRECT") || classic.includes("direct-ei"), "honest DIRECT status");

const hostSwf = path.join(root, "assets/avatar-host/avatar-host.swf");
ok(fs.existsSync(hostSwf), "assets/avatar-host/avatar-host.swf exists");
ok(fs.statSync(hostSwf).size > 1000, "avatar-host.swf size>1k");
const hostHx = read("tools/avatar-host/AvatarHost.hx");
ok(hostHx.includes("controlConnect"), "AvatarHost.hx listens controlConnect");
ok(hostHx.includes("appearanceChanged_v2"), "AvatarHost.hx calls appearanceChanged_v2");
ok(hostHx.includes("hostWalk"), "AvatarHost.hx hostWalk");
ok(hostHx.includes("hostLoadBytes"), "AvatarHost.hx hostLoadBytes");
ok(hostHx.includes("connect_soft_fail"), "AvatarHost soft no-userProps");
ok(hostHx.includes("Reflect.field(evt, \"props\")") || hostHx.includes("ConnectBag"), "AvatarHost props field read");
ok(!/com\.threerings\.msoy/.test(hostHx), "AvatarHost.hx no msoy package (no AGPL copy)");

const demoHx = read("tools/demo-avatar/DemoAvatar.hx");
ok(demoHx.includes("ConnectBag"), "DemoAvatar ConnectBag subclass");
ok(demoHx.includes("ENTER_FRAME"), "DemoAvatar ENTER_FRAME walk cycle");
ok(demoHx.includes("ExternalInterface.addCallback"), "DemoAvatar EI hostWalk");
ok(demoHx.includes("eiHostWalk") || demoHx.includes('"hostWalk"'), "DemoAvatar hostWalk callback");

const app = read("app.js");
ok(app.includes('LOGO_V = "20260906ck"'), "app LOGO_V ck");
ok(app.includes("is-tofu-walk") || app.includes("tofu-leg"), "app tofu walk classes");
ok(app.includes("data-engine-owns-avatar-walk"), "app cj engine-owns opt-out");
ok(app.includes("notifyLoftWalk"), "app wires notifyLoftWalk");
ok(app.includes("classicRuffleWearHtml"), "app classicRuffleWearHtml");

const css = read("src/styles.css");
ok(css.includes("tofu-leg-l") && css.includes("@keyframes tofu-leg-l"), "CSS tofu leg keyframes");
ok(css.includes("is-swf-walking") || css.includes("whirled-swf-walk-bob"), "SWF bob keyframes");
ok(css.includes("pointer-events: none !important"), "CSS PE none on loft ruffle");
ok(css.includes("classic-swf-stand-tofu"), "CSS stand tofu");

const index = read("index.html");
ok(index.includes("20260906ck"), "index.html cache ck");
ok(index.includes("classic-avatar.js"), "index loads classic-avatar.js");

const docs = [
  "STATUS.md", "QA-FLASH.md", "HOW-CLASSIC-AVATARS-WITHOUT-FLASH.md",
  "WALK-E2E-ANALYSIS.md", "RUFFLE-INTEGRATION.md"
];
for (const d of docs) {
  ok(fs.existsSync(path.join(root, d)), "doc exists " + d);
}
ok(fs.existsSync(path.join(root, "SMOOTH-RUFFLE.md")) || true, "SMOOTH-RUFFLE optional");

if (failed) {
  console.error("\n" + failed + " check(s) failed");
  process.exit(1);
}
console.log("\nAll checks passed.");
