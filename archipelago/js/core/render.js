/* Canvas renderer: camera, tiles + decor, y-sorted tall tiles & entities,
   particles, weather, glow, darkness, fade, quake. All vector-drawn. */
(function () {
'use strict';

var T = G.TILE;
var canvas, ctx;
var cam = { x: 0, y: 0 };
var zoom = 2;
var fade = { a: 1, target: 0, speed: 2.5, cb: null }; // start black, fade in
var quakeT = 0;
var particles = [];
var rain = [];

function resize() {
  if (!canvas) return;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  zoom = G.util.clamp(Math.min(window.innerWidth, window.innerHeight * 1.5) / 560, 1.25, 2.4);
}

G.render = {
  init: function (c) {
    canvas = c;
    ctx = c.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
  },
  zoom: function () { return zoom; },
  cam: cam,

  fadeOut: function (cb, speed) { fade.target = 1; fade.speed = speed || 3; fade.cb = cb || null; },
  fadeIn: function (cb, speed) { fade.target = 0; fade.speed = speed || 2.2; fade.cb = cb || null; },
  fadeAlpha: function () { return fade.a; },
  quake: function (ms) { quakeT = Math.max(quakeT, (ms || 400) / 1000); },

  follow: function (wx, wy, snap) {
    var vw = window.innerWidth / zoom, vh = window.innerHeight / zoom;
    var m = G.map.current;
    var tx = wx - vw / 2, ty = wy - vh / 2;
    if (m) {
      tx = G.util.clamp(tx, -T * 2, Math.max(-T * 2, m.w * T - vw + T * 2));
      ty = G.util.clamp(ty, -T * 2, Math.max(-T * 2, m.h * T - vh + T * 2));
    }
    if (snap) { cam.x = tx; cam.y = ty; }
    else { cam.x += (tx - cam.x) * 0.12; cam.y += (ty - cam.y) * 0.12; }
  },

  draw: draw,
};

/* ---------------- particles ---------------- */

G.fx = {
  dust: function (wx, wy) {
    for (var i = 0; i < 3; i++) particles.push({
      x: wx + (Math.random() - 0.5) * 10, y: wy + Math.random() * 4,
      vx: (Math.random() - 0.5) * 14, vy: -8 - Math.random() * 10,
      life: 0.4 + Math.random() * 0.2, t: 0, size: 2.4, color: 'rgba(220,210,180,0.55)',
    });
  },
  sparkle: function (wx, wy, color, n) {
    for (var i = 0; i < (n || 10); i++) {
      var a = Math.random() * Math.PI * 2, sp = 26 + Math.random() * 50;
      particles.push({
        x: wx, y: wy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 22,
        life: 0.5 + Math.random() * 0.45, t: 0, size: 2.6,
        color: color || '#fbbf24', glow: true, grav: 36,
      });
    }
  },
  splash: function (wx, wy) {
    for (var i = 0; i < 5; i++) particles.push({
      x: wx + (Math.random() - 0.5) * 12, y: wy,
      vx: (Math.random() - 0.5) * 26, vy: -30 - Math.random() * 24,
      life: 0.45, t: 0, size: 2.2, color: 'rgba(160,200,255,0.75)', grav: 130,
    });
  },
};

function stepParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.t += dt;
    if (p.t >= p.life) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.grav) p.vy += p.grav * dt;
  }
}

/* ---------------- tile decor ---------------- */

function decorTile(x, y, tile, pal, sx, sy, t) {
  var h = G.util.hash;
  switch (tile.decor) {
    case 'speckle':
      if (h(x, y, 1) < 0.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(sx + 6 + h(x, y, 2) * 18, sy + 6 + h(x, y, 3) * 18, 3, 3);
        ctx.fillRect(sx + 4 + h(x, y, 4) * 22, sy + 4 + h(x, y, 5) * 22, 2, 2);
      }
      break;
    case 'blades':
      if (h(x, y, 6) < 0.6) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1.4;
        var bx = sx + 6 + h(x, y, 7) * 20, by = sy + 10 + h(x, y, 8) * 14;
        ctx.beginPath();
        ctx.moveTo(bx, by + 5); ctx.lineTo(bx + 1.5, by);
        ctx.moveTo(bx + 5, by + 5); ctx.lineTo(bx + 6, by + 1);
        ctx.stroke();
      }
      break;
    case 'tall':
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1.8;
      var sway = Math.sin(t * 1.8 + x * 1.7 + y) * 1.6;
      for (var i = 0; i < 3; i++) {
        var gx = sx + 6 + i * 9 + h(x, y, 9 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(gx, sy + 28);
        ctx.quadraticCurveTo(gx + sway, sy + 16, gx + sway * 1.6, sy + 8);
        ctx.stroke();
      }
      break;
    case 'pebble':
      if (h(x, y, 10) < 0.45) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.beginPath();
        ctx.ellipse(sx + 8 + h(x, y, 11) * 16, sy + 8 + h(x, y, 12) * 16, 2.6, 1.8, 0, 0, 7);
        ctx.fill();
      }
      break;
    case 'plank':
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 10.5); ctx.lineTo(sx + T, sy + 10.5);
      ctx.moveTo(sx, sy + 21.5); ctx.lineTo(sx + T, sy + 21.5);
      ctx.stroke();
      break;
    case 'crack':
      if (h(x, y, 13) < 0.3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        ctx.lineWidth = 1;
        var cx0 = sx + 6 + h(x, y, 14) * 18, cy0 = sy + 6 + h(x, y, 15) * 18;
        ctx.beginPath();
        ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 6, cy0 + 3); ctx.lineTo(cx0 + 9, cy0 + 8);
        ctx.stroke();
      }
      break;
    case 'wave':
      var ph = (t * 0.7 + h(x, y, 16)) % 1;
      if (h(x, y, 17) < 0.18 && ph > 0.5) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 * Math.sin((ph - 0.5) * 2 * Math.PI)) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx + 6, sy + 14 + Math.sin(t + x) * 2);
        ctx.quadraticCurveTo(sx + 16, sy + 11 + Math.sin(t + x) * 2, sx + 26, sy + 14 + Math.sin(t + x) * 2);
        ctx.stroke();
      }
      break;
    case 'ripple':
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.2;
      var rp = (t * 0.9 + h(x, y, 18) * 3) % 3;
      if (rp < 1) {
        ctx.beginPath();
        ctx.arc(sx + 16, sy + 16, 4 + rp * 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
  }
}

/* ---------------- tall terrain (drawn y-sorted with entities) ---------------- */

function drawTall(kind, sx, sy, x, y, pal, t) {
  var h = G.util.hash(x, y, 20);
  switch (kind) {
    case 'tree':
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(sx + 16, sy + 27, 11, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a5236';
      ctx.fillRect(sx + 13, sy + 8, 6, 20);
      var sway = Math.sin(t * 1.1 + x * 2.1 + y * 0.7) * 1.2;
      var leaf = pal.grassDark;
      ctx.fillStyle = leaf;
      ctx.beginPath(); ctx.arc(sx + 16 + sway, sy - 2, 13, 0, 7); ctx.fill();
      ctx.fillStyle = pal.grass;
      ctx.beginPath(); ctx.arc(sx + 11 + sway, sy - 6, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 22 + sway, sy - 5, 8, 0, 7); ctx.fill();
      break;
    case 'bush':
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(sx + 16, sy + 26, 10, 3.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = pal.grassDark;
      ctx.beginPath(); ctx.arc(sx + 16, sy + 18, 10, 0, 7); ctx.fill();
      ctx.fillStyle = pal.grass;
      ctx.beginPath(); ctx.arc(sx + 11, sy + 15, 6.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 21, sy + 16, 6, 0, 7); ctx.fill();
      break;
    case 'boulder':
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(sx + 16, sy + 26, 11, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = pal.rock;
      ctx.beginPath(); ctx.arc(sx + 16, sy + 16, 11, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.beginPath(); ctx.arc(sx + 12, sy + 12, 4.5, 0, 7); ctx.fill();
      break;
    case 'crystal':
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(sx + 16, sy + 27, 9, 3.4, 0, 0, 7); ctx.fill();
      var glowPulse = 0.75 + Math.sin(t * 2.2 + h * 6) * 0.25;
      ctx.fillStyle = '#67e8f9';
      ctx.globalAlpha = glowPulse;
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy - 2); ctx.lineTo(sx + 24, sy + 16); ctx.lineTo(sx + 16, sy + 27);
      ctx.lineTo(sx + 8, sy + 16); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(sx + 16, sy + 1); ctx.lineTo(sx + 19, sy + 10); ctx.lineTo(sx + 16, sy + 8);
      ctx.closePath(); ctx.fill();
      break;
    case 'beaconbase':
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(sx + 16, sy + 28, 12, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = pal.stoneWall;
      ctx.fillRect(sx + 8, sy + 2, 16, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx + 8, sy + 20, 16, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(sx + 16, sy + 2, 5, 0, 7); ctx.fill();
      break;
  }
}

/* ---------------- main draw ---------------- */

function fallbackSprite(ctx2, name, sx, sy, t) {
  ctx2.fillStyle = 'rgba(0,0,0,0.2)';
  ctx2.beginPath(); ctx2.ellipse(sx + 16, sy + 27, 9, 3.4, 0, 0, 7); ctx2.fill();
  ctx2.fillStyle = '#9aa3b2';
  ctx2.beginPath(); ctx2.arc(sx + 16, sy + 16 + Math.sin(t * 3) * 1.2, 10, 0, 7); ctx2.fill();
  ctx2.fillStyle = '#0f172a';
  ctx2.beginPath(); ctx2.arc(sx + 12, sy + 14, 2, 0, 7); ctx2.arc(sx + 20, sy + 14, 2, 0, 7); ctx2.fill();
}

function draw(dt) {
  if (!canvas || !G.map.current) return;
  var m = G.map.current;
  var pal = G.PALETTES[m.island.palette] || G.PALETTES.shore;
  var t = G.time;
  var W = window.innerWidth, H = window.innerHeight;

  stepParticles(dt);
  if (quakeT > 0) quakeT -= dt;
  // fade easing
  if (fade.a !== fade.target) {
    var dir = fade.target > fade.a ? 1 : -1;
    fade.a = G.util.clamp(fade.a + dir * fade.speed * dt, 0, 1);
    if (fade.a === fade.target && fade.cb) { var cb = fade.cb; fade.cb = null; cb(); }
  }

  ctx.save();
  ctx.fillStyle = pal.sky || pal.void;
  ctx.fillRect(0, 0, W, H);
  if (quakeT > 0) ctx.translate((Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7);
  ctx.scale(zoom, zoom);
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  var x0 = Math.floor(cam.x / T) - 1, y0 = Math.floor(cam.y / T) - 1;
  var x1 = x0 + Math.ceil(W / zoom / T) + 3, y1 = y0 + Math.ceil(H / zoom / T) + 3;

  var talls = [];
  for (var y = y0; y <= y1; y++) {
    for (var x = x0; x <= x1; x++) {
      var ch = G.map.charAt(x, y);
      var tile = G.TILES[ch] || G.TILES[' '];
      var sx = x * T, sy = y * T;
      var role = tile.role;
      // tall props (trees, boulders, crystals…) stand on whatever surrounds
      // them: inherit the base color of the first walkable neighbor
      if (tile.tall) {
        var nb = [G.map.tileAt(x, y + 1), G.map.tileAt(x - 1, y), G.map.tileAt(x + 1, y), G.map.tileAt(x, y - 1)];
        for (var k = 0; k < 4; k++) if (nb[k].walk) { role = nb[k].role; break; }
      }
      var col = pal[role] || pal.void;
      ctx.fillStyle = col;
      // +1 overdraw hides antialiasing seams at non-integer zoom
      ctx.fillRect(sx, sy, T + 1, T + 1);
      // water gets a soft animated darker swell
      if (tile.role === 'water') {
        var wb = Math.sin(t * 0.6 + x * 0.45 + y * 0.7);
        if (wb > 0.2) {
          ctx.fillStyle = 'rgba(0,0,0,' + (0.05 * (wb - 0.2)).toFixed(3) + ')';
          ctx.fillRect(sx, sy, T + 1, T + 1);
        }
      }
      // edge shading: blocking 'edge' tiles get a top highlight + a darker
      // face when the tile below is not the same char (fake height)
      if (tile.edge) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(sx, sy, T, 3);
        if (G.map.charAt(x, y + 1) !== ch) {
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(sx, sy + T - 7, T, 7);
        }
      }
      // land/water foam line
      if ((tile.role === 'water' || tile.role === 'shallow')) {
        var up = G.map.tileAt(x, y - 1);
        if (up.walk && up.role !== 'water' && up.role !== 'shallow') {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + 0.1 * Math.sin(t * 2 + x)) + ')';
          ctx.fillRect(sx, sy, T, 3);
        }
      }
      if (tile.decor) decorTile(x, y, tile, pal, sx, sy, t);
      if (tile.tall) talls.push({ y: sy + T, kind: tile.kind || tile.tall, sx: sx, sy: sy, tx: x, ty: y });
    }
  }

  // collect entities + player into the y-sorted pass
  var ents = (G.world && G.world.drawList) ? G.world.drawList() : [];
  for (var i = 0; i < ents.length; i++) talls.push(ents[i]);
  talls.sort(function (a, b) { return a.y - b.y; });
  for (i = 0; i < talls.length; i++) {
    var d = talls[i];
    if (d.kind) drawTall(d.kind, d.sx, d.sy, d.tx, d.ty, pal, t);
    else if (d.draw) d.draw(ctx, t);
    else if (G.sprites && G.sprites.draw) G.sprites.draw(ctx, d.sprite, d.sx, d.sy, t, d.opts || {});
    else fallbackSprite(ctx, d.sprite, d.sx, d.sy, t);
  }

  // particles (world space)
  for (i = 0; i < particles.length; i++) {
    var p = particles[i];
    var a = 1 - p.t / p.life;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // darkness + glow
  if (pal.dark) {
    ctx.fillStyle = 'rgba(4,8,20,' + pal.dark + ')';
    ctx.fillRect(cam.x - T, cam.y - T, W / zoom + T * 2, H / zoom + T * 2);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (y = y0; y <= y1; y++) {
    for (x = x0; x <= x1; x++) {
      var tg = G.TILES[G.map.charAt(x, y)];
      if (tg && tg.glow) glowAt(x * T + 16, y * T + 14, 64, tg.glow, 0.32 + Math.sin(t * 2 + x + y) * 0.06);
    }
  }
  var glows = (G.world && G.world.glowList) ? G.world.glowList() : [];
  for (i = 0; i < glows.length; i++) glowAt(glows[i].x, glows[i].y, glows[i].r, glows[i].color, glows[i].a);
  // glowing particles
  for (i = 0; i < particles.length; i++) {
    if (particles[i].glow) glowAt(particles[i].x, particles[i].y, 14, particles[i].color, 0.5 * (1 - particles[i].t / particles[i].life));
  }
  ctx.globalCompositeOperation = 'source-over';

  // rain weather (screen space within world transform is fine)
  if (pal.weather === 'rain') drawRain(dt, x0 * T, y0 * T, (x1 - x0 + 1) * T, (y1 - y0 + 1) * T);

  ctx.restore();

  // vignette + fade (screen space)
  var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(2,4,12,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  if (fade.a > 0) {
    ctx.fillStyle = 'rgba(2,4,10,' + fade.a + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function glowAt(wx, wy, r, color, a) {
  var g = ctx.createRadialGradient(wx, wy, 2, wx, wy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a == null ? 0.3 : a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(wx, wy, r, 0, 7); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRain(dt, vx, vy, vw, vh) {
  while (rain.length < 70) rain.push({ x: Math.random(), y: Math.random(), s: 0.7 + Math.random() * 0.6 });
  ctx.strokeStyle = 'rgba(170,200,255,0.30)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (var i = 0; i < rain.length; i++) {
    var r = rain[i];
    r.y += dt * 1.1 * r.s; r.x -= dt * 0.18 * r.s;
    if (r.y > 1) { r.y -= 1; r.x = Math.random(); }
    if (r.x < 0) r.x += 1;
    var px = vx + r.x * vw, py = vy + r.y * vh;
    ctx.moveTo(px, py);
    ctx.lineTo(px + 2.4, py + 9 * r.s);
  }
  ctx.stroke();
}

})();
