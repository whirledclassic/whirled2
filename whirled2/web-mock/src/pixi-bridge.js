/* Uses window.PIXI from the classic script tag in index.html. */
(function (root) {
  function canvasMount(host) {
    if (host.querySelector("canvas[data-whirled-stage]")) return host._whirledApp;
    var canvas = document.createElement("canvas");
    canvas.setAttribute("data-whirled-stage", "1");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
    host.replaceChildren(canvas);
    host.setAttribute("data-whirled-engine", "1");
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
      var s = size(), w = s.w, h = s.h;
      ctx.fillStyle = "#6eb7d8"; ctx.fillRect(0, 0, w, h * 0.58);
      ctx.fillStyle = "#c9a36a"; ctx.fillRect(0, h * 0.58, w, h * 0.42);
      ctx.fillStyle = "#f4f0e4"; ctx.font = "700 14px Trebuchet MS, sans-serif"; ctx.fillText(name, 10, 22);
      var x = ax * w, y = ay * h;
      ctx.fillStyle = "#16324a"; ctx.beginPath(); ctx.arc(x, y - 16, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e6fa8"; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    }
    function tick() { ax += (tx - ax) * 0.14; ay += (ty - ay) * 0.14; draw(); requestAnimationFrame(tick); }
    canvas.addEventListener("pointerdown", function (ev) {
      var r = canvas.getBoundingClientRect();
      tx = (ev.clientX - r.left) / r.width;
      ty = Math.max(0.6, (ev.clientY - r.top) / r.height);
    });
    host._whirledApp = { canvas: canvas, applyRoom: function (room) { if (room && room.name) name = String(room.name); } };
    requestAnimationFrame(tick);
    return host._whirledApp;
  }

  function pixiMount(host) {
    var PIXI = root.PIXI;
    if (!PIXI || !PIXI.Application) return canvasMount(host);
    if (host.querySelector("canvas")) return host._whirledApp;
    var app = new PIXI.Application({
      background: 0x5fa8cc,
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2)
    });
    var view = app.view || app.canvas;
    if (view) {
      view.setAttribute("data-whirled-stage", "1");
      view.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
      host.replaceChildren(view);
    }
    host.setAttribute("data-whirled-engine", "1");
    host.setAttribute("data-engine-owns-avatar-walk", "1");
    var sky = new PIXI.Graphics();
    var floor = new PIXI.Graphics();
    var label = new PIXI.Text("Studio Loft", { fill: 0xf4f0e4, fontSize: 14, fontFamily: "Trebuchet MS", fontWeight: "700" });
    label.x = 10; label.y = 8;
    var avatar = new PIXI.Graphics();
    var ax = 0.5, ay = 0.78, tx = 0.5, ty = 0.78;
    function layout() {
      var w = app.screen.width, h = app.screen.height;
      sky.clear().beginFill(0x6eb7d8).drawRect(0, 0, w, h * 0.58).endFill();
      floor.clear().beginFill(0xc9a36a).drawRect(0, h * 0.58, w, h * 0.42).endFill();
    }
    function drawAvatar() {
      var w = app.screen.width, h = app.screen.height;
      var x = ax * w, y = ay * h;
      avatar.clear();
      avatar.beginFill(0x16324a).drawCircle(x, y - 16, 8).endFill();
      avatar.beginFill(0x1e6fa8).drawCircle(x, y, 12).endFill();
    }
    app.stage.addChild(sky, floor, label, avatar);
    layout(); drawAvatar();
    app.ticker.add(function () {
      ax += (tx - ax) * 0.14;
      ay += (ty - ay) * 0.14;
      drawAvatar();
    });
    if (view) view.addEventListener("pointerdown", function (ev) {
      var r = view.getBoundingClientRect();
      tx = (ev.clientX - r.left) / r.width;
      ty = Math.max(0.6, (ev.clientY - r.top) / r.height);
    });
    function applyRoom(room) { if (room && room.name) label.text = String(room.name); }
    root.__whirledEngine = { applyRoom: applyRoom, app: app };
    document.addEventListener("whirled:roomChanged", function (ev) { applyRoom((ev && ev.detail) || {}); });
    host._whirledApp = app;
    return app;
  }

  root.mountWhirledEngine = function (host) {
    if (!host) return;
    try { return pixiMount(host); } catch (e) { return canvasMount(host); }
  };
})(typeof window !== "undefined" ? window : this);
