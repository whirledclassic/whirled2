/* =============================================================================
   mock-app.js
   -----------------------------------------------------------------------------
   WHAT THIS FILE IS
   Browser JavaScript that makes the mock clickable. A later TypeScript app
   should split this into:

     src/shell.ts        tabs, feed, chat, landing dismiss
     src/room/RoomApp.ts Pixi application, camera, click-to-walk

   WHY IT IS ONE FILE TODAY
   A contractor can open index.html and see the whole loop without npm.

   WHAT IS INTENTIONAL
   - Pixi draws ONLY inside #room-stage.
   - HTML owns tabs, profile, feed, chat.
   - Click-to-walk is the first ship (repo issue #1).
   - No multiplayer, no shop, no auth.

   PIXI VERSION
   Loaded from jsDelivr as PixiJS v8. The v8 boot is async:
     const app = new PIXI.Application();
     await app.init({ canvas, width, height, background });
   If you upgrade Pixi, that init() call is the first thing to re-read.
   ============================================================================= */

(function () {
  "use strict";

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function bindTabs() {
    const tabs = $all(".tab[data-view]");
    const views = {
      rooms: $("#view-rooms"),
      me: $("#view-me"),
      stuff: $("#view-stuff"),
      games: $("#view-games"),
      groups: $("#view-groups"),
    };

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        const name = tab.getAttribute("data-view");

        tabs.forEach(function (t) {
          t.classList.toggle("is-on", t === tab);
        });

        const showRoom = name === "rooms" || name === "me";
        if (views.rooms) views.rooms.style.display = showRoom ? "grid" : "none";

        $all(".placeholder").forEach(function (p) {
          p.classList.toggle("is-on", p.id === "view-" + name && !showRoom);
        });

        if (name === "me") {
          const rail = $(".panel--rail");
          if (rail) rail.scrollIntoView({ block: "nearest" });
        }
      });
    });
  }

  function bindLanding() {
    const card = $("#landing");
    const enter = $("#enter-room");
    const stay = $("#stay-landing");
    if (!card || !enter) return;

    enter.addEventListener("click", function () {
      card.classList.add("hidden");
    });

    if (stay) {
      stay.addEventListener("click", function () {
        card.classList.remove("hidden");
      });
    }
  }

  function bindFeed() {
    const form = $("#status-form");
    const input = $("#status-input");
    const list = $("#feed-list");
    if (!form || !input || !list) return;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const item = document.createElement("div");
      item.className = "feed-item";
      item.innerHTML =
        "<b>Josh</b> " +
        escapeHtml(text) +
        "<time>just now \u00b7 home room</time>";
      list.insertBefore(item, list.firstChild);
      input.value = "";
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;" })[ch];
    });
  }

  function bindChat() {
    const form = $("#chat-form");
    const input = $("#chat-input");
    const list = $("#feed-list");
    if (!form || !input) return;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      if (list) {
        const item = document.createElement("div");
        item.className = "feed-item";
        item.innerHTML =
          "<b>Josh</b> said in the room: \u201c" +
          escapeHtml(text) +
          "\u201d<time>just now \u00b7 chat</time>";
        list.insertBefore(item, list.firstChild);
      }
      input.value = "";
    });
  }

  async function startRoom() {
    const canvas = $("#room-stage");
    if (!canvas) return;

    if (typeof PIXI === "undefined") {
      startCssFallback(canvas);
      return;
    }

    const host = canvas.parentElement;
    const width = Math.max(320, host.clientWidth || 640);
    const height = Math.max(320, host.clientHeight || 420);

    const app = new PIXI.Application();
    await app.init({
      canvas: canvas,
      width: width,
      height: height,
      background: 0x2a3340,
      antialias: true,
    });

    const floor = {
      x: 40,
      y: Math.floor(height * 0.58),
      w: width - 80,
      h: Math.floor(height * 0.32),
    };

    drawBackdrop(app, width, height, floor);

    const avatar = makeAvatar();
    avatar.x = floor.x + floor.w * 0.35;
    avatar.y = floor.y + floor.h * 0.55;
    app.stage.addChild(avatar);

    const nameTag = new PIXI.Text({
      text: "Josh",
      style: { fill: 0xf3eee4, fontSize: 13, fontFamily: "Segoe UI, sans-serif" },
    });
    nameTag.anchor.set(0.5, 1);
    app.stage.addChild(nameTag);

    let target = null;
    const speed = 160;

    canvas.style.cursor = "crosshair";

    app.stage.eventMode = "static";
    app.stage.hitArea = new PIXI.Rectangle(0, 0, width, height);
    app.stage.on("pointertap", function (ev) {
      const pos = ev.global;
      if (
        pos.x < floor.x ||
        pos.x > floor.x + floor.w ||
        pos.y < floor.y ||
        pos.y > floor.y + floor.h
      ) {
        return;
      }
      target = { x: pos.x, y: pos.y };
    });

    app.ticker.add(function () {
      const dt = app.ticker.deltaMS / 1000;

      if (target) {
        const dx = target.x - avatar.x;
        const dy = target.y - avatar.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          avatar.x = target.x;
          avatar.y = target.y;
          target = null;
        } else {
          avatar.x += (dx / dist) * speed * dt;
          avatar.y += (dy / dist) * speed * dt;
          avatar.scale.x = dx < 0 ? -1 : 1;
        }
      }

      nameTag.x = avatar.x;
      nameTag.y = avatar.y - 34;
    });

    window.addEventListener("resize", function () {
      const w = Math.max(320, host.clientWidth || 640);
      const h = Math.max(320, host.clientHeight || 420);
      app.renderer.resize(w, h);
    });
  }

  function drawBackdrop(app, width, height, floor) {
    const g = new PIXI.Graphics();

    g.rect(0, 0, width, floor.y);
    g.fill(0x3d4a5c);

    g.moveTo(0, 0);
    g.lineTo(40, floor.y);
    g.lineTo(0, floor.y);
    g.closePath();
    g.fill(0x323d4c);

    g.rect(floor.x, floor.y, floor.w, floor.h);
    g.fill(0x6b5340);

    g.setStrokeStyle({ width: 1, color: 0x5a4536, alpha: 0.7 });
    for (let x = floor.x; x < floor.x + floor.w; x += 28) {
      g.moveTo(x, floor.y);
      g.lineTo(x, floor.y + floor.h);
    }
    g.stroke();

    g.rect(floor.x + floor.w * 0.62, floor.y + 16, 70, 28);
    g.fill(0x8a6a4a);
    g.rect(floor.x + floor.w * 0.62 + 8, floor.y + 44, 8, 22);
    g.fill(0x6d5338);
    g.rect(floor.x + floor.w * 0.62 + 54, floor.y + 44, 8, 22);
    g.fill(0x6d5338);

    g.rect(width * 0.55, 40, 90, 70);
    g.fill(0x8fa8c2);
    g.setStrokeStyle({ width: 4, color: 0xdfe6c8 });
    g.stroke();

    app.stage.addChild(g);
  }

  function makeAvatar() {
    const g = new PIXI.Graphics();
    g.circle(0, -18, 10);
    g.fill(0xf3eee4);
    g.roundRect(-11, -8, 22, 28, 8);
    g.fill(0xd4533f);
    g.pivot.set(0, 0);
    return g;
  }

  function startCssFallback(canvas) {
    const host = canvas.parentElement;
    host.style.position = "relative";
    const avatar = document.createElement("div");
    avatar.textContent = "you";
    avatar.style.cssText =
      "position:absolute;left:30%;top:70%;width:28px;height:44px;" +
      "background:#d4533f;border-radius:14px 14px 6px 6px;color:#fff;" +
      "font:10px sans-serif;display:grid;place-items:center;transition:left .4s linear,top .4s linear;";
    host.appendChild(avatar);
    host.addEventListener("click", function (ev) {
      const r = host.getBoundingClientRect();
      avatar.style.left = ev.clientX - r.left - 14 + "px";
      avatar.style.top = ev.clientY - r.top - 22 + "px";
    });
  }

  bindTabs();
  bindLanding();
  bindFeed();
  bindChat();
  startRoom().catch(function (err) {
    console.warn("Pixi room failed, using CSS fallback.", err);
    startCssFallback($("#room-stage"));
  });
})();
