/* Public Pixi bridge for GitHub Pages.
 * Anyone on a phone can import this over HTTPS.
 * Local Vite WhirledClassicGame still wins if ?engineSrc= is set.
 */
import { Application, Container, Graphics, Text } from "https://cdn.jsdelivr.net/npm/pixi.js@8.8.1/+esm";

export async function mountWhirledEngine(host) {
  if (!host) throw new Error("mountWhirledEngine needs a host");

  const app = new Application();
  await app.init({
    background: "#5fa8cc",
    resizeTo: host,
    autoDensity: true,
    antialias: true
  });

  host.replaceChildren(app.canvas);
  host.setAttribute("data-whirled-engine", "1");
  host.setAttribute("data-engine-owns-avatar-walk", "1");
  host.setAttribute("data-remote-engine", "1");

  const world = new Container();
  app.stage.addChild(world);

  const sky = new Graphics();
  const floor = new Graphics();
  const wallL = new Graphics();
  const wallR = new Graphics();
  const label = new Text({ text: "Studio Loft", style: { fill: "#f4f0e4", fontSize: 14, fontFamily: "Trebuchet MS, sans-serif", fontWeight: "700" } });
  label.x = 10;
  label.y = 8;

  const avatar = new Graphics();
  let ax = 0.5;
  let ay = 0.78;
  let tx = ax;
  let ty = ay;

  function layout() {
    const w = app.screen.width;
    const h = app.screen.height;
    sky.clear().rect(0, 0, w, h * 0.58).fill(0x6eb7d8);
    floor.clear().rect(0, h * 0.58, w, h * 0.42).fill(0xc9a36a);
    wallL.clear().poly([0, h * 0.58, w * 0.16, h * 0.22, w * 0.16, h * 0.58]).fill(0x8ec8e4);
    wallR.clear().poly([w, h * 0.58, w * 0.84, h * 0.22, w * 0.84, h * 0.58]).fill(0x8ec8e4);
  }

  function drawAvatar() {
    const w = app.screen.width;
    const h = app.screen.height;
    const x = ax * w;
    const y = ay * h;
    avatar.clear();
    avatar.circle(x, y - 16, 8).fill(0x16324a);
    avatar.circle(x, y, 12).fill(0x1e6fa8);
  }

  world.addChild(sky, floor, wallL, wallR, label, avatar);
  layout();
  drawAvatar();

  app.ticker.add(() => {
    ax += (tx - ax) * 0.14;
    ay += (ty - ay) * 0.14;
    drawAvatar();
  });

  app.canvas.addEventListener("pointerdown", (ev) => {
    const r = app.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tx = (ev.clientX - r.left) / r.width;
    ty = Math.max(0.6, (ev.clientY - r.top) / r.height);
  });

  window.addEventListener("resize", layout);

  function applyRoom(room) {
    if (room && room.name) label.text = String(room.name);
  }

  window.__whirledEngine = window.__whirledEngine || {};
  window.__whirledEngine.applyRoom = applyRoom;
  window.__whirledEngine.app = app;
  document.addEventListener("whirled:roomChanged", (ev) => applyRoom(ev.detail || {}));

  return app;
}

export default mountWhirledEngine;
