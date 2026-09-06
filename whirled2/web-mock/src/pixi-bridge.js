/* Public room mount for GitHub Pages.
 * No top-level Pixi import — iPhone Safari often fails jsDelivr ESM.
 * Canvas loft always draws. Pixi upgrades if CDN works.
 */
export function mountWhirledEngine(host) {
  if (!host) throw new Error("mountWhirledEngine needs a host");
  if (host.querySelector("canvas[data-whirled-stage]")) return host._whirledApp || true;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("data-whirled-stage", "1");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
  host.replaceChildren(canvas);
  host.setAttribute("data-whirled-engine", "1");
  host.setAttribute("data-engine-owns-avatar-walk", "1");

  var ctx = canvas.getContext("2d");
  var name = "Studio Loft";
  var ax = 0.5, ay = 0.78, tx = 0.5, ty = 0.78;

  function size() {
    var r = host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(160, r.width || 320);
    var h = Math.max(160, r.height || 240);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  function draw() {
    var s = size();
    var w = s.w, h = s.h;
    ctx.fillStyle = "#6eb7d8";
    ctx.fillRect(0, 0, w, h * 0.58);
    ctx.fillStyle = "#8ec8e4";
    ctx.beginPath(); ctx.moveTo(0, h * 0.58); ctx.lineTo(w * 0.16, h * 0.22); ctx.lineTo(w * 0.16, h * 0.58); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, h * 0.58); ctx.lineTo(w * 0.84, h * 0.22); ctx.lineTo(w * 0.84, h * 0.58); ctx.fill();
    ctx.fillStyle = "#c9a36a";
    ctx.fillRect(0, h * 0.58, w, h * 0.42);
    ctx.fillStyle = "#f4f0e4";
    ctx.font = "700 14px Trebuchet MS, sans-serif";
    ctx.fillText(name, 10, 22);
    var x = ax * w, y = ay * h;
    ctx.fillStyle = "#16324a";
    ctx.beginPath(); ctx.arc(x, y - 16, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e6fa8";
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  }

  function tick() {
    ax += (tx - ax) * 0.14;
    ay += (ty - ay) * 0.14;
    draw();
    requestAnimationFrame(tick);
  }

  canvas.addEventListener("pointerdown", function (ev) {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    tx = (ev.clientX - r.left) / r.width;
    ty = Math.max(0.6, (ev.clientY - r.top) / r.height);
  });

  function applyRoom(room) {
    if (room && room.name) name = String(room.name);
  }

  window.__whirledEngine = window.__whirledEngine || {};
  window.__whirledEngine.applyRoom = applyRoom;
  window.__whirledEngine.app = { canvas: canvas };
  document.addEventListener("whirled:roomChanged", function (ev) { applyRoom(ev.detail || {}); });

  requestAnimationFrame(tick);
  host._whirledApp = { canvas: canvas, applyRoom: applyRoom };
  return host._whirledApp;
}

export default mountWhirledEngine;
