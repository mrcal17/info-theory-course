/* THE QUIET ARCHIPELAGO — sprite + portrait drawing.
   Contract: ../DESIGN.md (Sprite contract). Pure Canvas 2D, vector only.
   G.sprites = { draw(ctx,name,px,py,t,opts), portrait(name) }.
   px,py = top-left of a 32px tile in world coords (canvas already transformed).
   Character occupies x in [4,28], feet ~ y+28. Deterministic from t only. */
(function () {
'use strict';

var TAU = Math.PI * 2;

/* ---------------- tiny drawing helpers ---------------- */

function ell(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function circ(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
// soft rounded "blob" body via a roundrect-ish path
function blob(ctx, x, y, w, h, r, fill) {
  var l = x - w / 2, rt = x + w / 2, tp = y - h / 2, bt = y + h / 2;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(l + r, tp);
  ctx.lineTo(rt - r, tp);
  ctx.quadraticCurveTo(rt, tp, rt, tp + r);
  ctx.lineTo(rt, bt - r);
  ctx.quadraticCurveTo(rt, bt, rt - r, bt);
  ctx.lineTo(l + r, bt);
  ctx.quadraticCurveTo(l, bt, l, bt - r);
  ctx.lineTo(l, tp + r);
  ctx.quadraticCurveTo(l, tp, l + r, tp);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}
function shadow(ctx, cx, fy, rx) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, cx, fy, rx, rx * 0.36, 'rgba(0,0,0,0.22)');
}
// deterministic 0..1 wobble
function wob(t, s, ph) { return Math.sin(t * s + (ph || 0)); }

/* Eyes: facing-aware. dir 's' = face (two eyes), 'n' = back (none),
   'e'/'w' = one eye shifted. cx,cy = eye band center. blink closes eyes.
   sp = spacing, r = eye radius. Returns nothing; draws. */
function eyes(ctx, dir, cx, cy, sp, r, blink) {
  if (dir === 'n') return;
  ctx.fillStyle = '#1b2233';
  var L = cx - sp, R = cx + sp;
  if (dir === 'e') { L = cx + sp * 0.15; R = cx + sp * 1.15; }
  else if (dir === 'w') { L = cx - sp * 1.15; R = cx - sp * 0.15; }
  var xs = (dir === 'e' || dir === 'w') ? [dir === 'e' ? R : L] : [L, R];
  for (var i = 0; i < xs.length; i++) {
    var ex = xs[i];
    if (blink) {
      ctx.strokeStyle = '#1b2233';
      ctx.lineWidth = r * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.9, cy);
      ctx.lineTo(ex + r * 0.9, cy);
      ctx.stroke();
    } else {
      circ(ctx, ex, cy, r, '#1b2233');
      circ(ctx, ex - r * 0.32, cy - r * 0.36, r * 0.34, 'rgba(255,255,255,0.92)');
    }
  }
}

function isBlink(t) { return (t % 3.7) < 0.12; }

/* ---------------- character sprites ---------------- */
/* Each fn receives (ctx, x, y, t, opts) where x = tile-center (px+16),
   y = tile-top (py), bob = vertical idle offset already factored where
   the body is drawn relative to a "center" cy. feet sit at y+28. */

function pip(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var moving = opts.moving;
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.5;
  var waddle = moving ? wob(t, 14) * 1.4 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 9 + (moving ? wob(t, 14) * 0.6 : 0));

  var cy = y + 16 + bob;
  // legs / feet shuffle
  ctx.fillStyle = '#7c8aa0';
  ell(ctx, x - 4.5 + waddle, fy - 2, 3.2, 2.4, '#7c8aa0');
  ell(ctx, x + 4.5 - waddle, fy - 2, 3.2, 2.4, '#7c8aa0');

  // antenna (behind head)
  var antx = x + (dir === 'e' ? 3 : dir === 'w' ? -3 : 0);
  ctx.strokeStyle = '#9fb2c8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(antx, cy - 8);
  ctx.quadraticCurveTo(antx + wob(t, 2.3) * 1.6, cy - 14, antx + wob(t, 2.3) * 2.2, cy - 18);
  ctx.stroke();
  var glow = 0.6 + wob(t, 4) * 0.4;
  ctx.save();
  ctx.globalAlpha = glow;
  circ(ctx, antx + wob(t, 2.3) * 2.2, cy - 18.5, 3.2, '#67e8f9');
  ctx.restore();
  circ(ctx, antx + wob(t, 2.3) * 2.2, cy - 18.5, 1.8, '#bef6ff');

  // body: round white robot
  blob(ctx, x, cy, 21, 22, 9, '#f4f7fb');
  // subtle shade
  ctx.save();
  ctx.beginPath(); ctx.arc(x, cy, 11, 0, TAU); ctx.clip();
  ell(ctx, x + 5, cy + 6, 12, 10, 'rgba(120,150,180,0.16)');
  ctx.restore();

  // blue-cyan trim: belly band low on the body (below the face)
  ctx.strokeStyle = '#27b3d4';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, cy + 1, 9.6, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();
  // little chest light
  circ(ctx, x, cy + 7, 1.6, '#27b3d4');

  // satchel strap: a thin band over the shoulder to the hip pouch
  var sd = (dir === 'w') ? -1 : 1;          // pouch hangs on this side
  ctx.strokeStyle = '#8a5a32';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - sd * 8, cy - 2);
  ctx.lineTo(x + sd * 7, cy + 8);
  ctx.stroke();
  // satchel pouch hugging the lower-side of the body (not floating off it)
  ctx.save();
  var sgx = x + sd * 8;
  blob(ctx, sgx, cy + 8, 7, 6.5, 2.4, '#9c6638');
  ctx.fillStyle = '#7a4d28';                // flap
  blob(ctx, sgx, cy + 5.6, 7, 3, 1.8, '#7a4d28');
  ctx.fillStyle = '#caa06a';                // buckle
  circ(ctx, sgx, cy + 7.5, 1, '#caa06a');
  ctx.restore();

  // face: big dark eyes (high on the head, clear of the strap)
  var ec = cy - 4;
  eyes(ctx, dir, x, ec, 4.6, 2.7, blink);
  // tiny cheek blush when facing front
  if (dir === 's' && !blink) {
    ctx.fillStyle = 'rgba(255,150,170,0.4)';
    ell(ctx, x - 7.5, ec + 3, 2, 1.3, 'rgba(255,150,170,0.4)');
    ell(ctx, x + 7.5, ec + 3, 2, 1.3, 'rgba(255,150,170,0.4)');
  }

  // hats
  drawHat(ctx, opts.hat, x, cy - 9.5, dir);
}

function drawHat(ctx, hat, x, topY, dir) {
  if (!hat) return;
  if (hat === 'cap') {
    ctx.fillStyle = '#2b6cb0';
    blob(ctx, x, topY - 1, 18, 9, 4.5, '#2b6cb0');
    // brim toward facing
    ctx.fillStyle = '#2356a0';
    var bx = dir === 'w' ? x - 11 : x + 4;
    ell(ctx, bx + 3, topY + 2.5, 7, 2.4, '#2356a0');
    circ(ctx, x, topY - 5, 1.8, '#9fd0f0');
  } else if (hat === 'sunhat') {
    ctx.fillStyle = '#e7c878';
    ell(ctx, x, topY + 4, 17, 5.5, '#e7c878');
    ctx.fillStyle = '#d8b25a';
    ell(ctx, x, topY + 4, 17, 5.5, null); ctx.lineWidth = 1; ctx.strokeStyle = '#bd9743'; ctx.stroke();
    blob(ctx, x, topY - 1, 13, 9, 5, '#efd896');
    ctx.strokeStyle = '#c79a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 6, topY + 1); ctx.lineTo(x + 6, topY + 1); ctx.stroke();
  } else if (hat === 'crown') {
    ctx.fillStyle = '#f4c430';
    var by = topY + 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, by);
    ctx.lineTo(x - 8, by - 5); ctx.lineTo(x - 4, by - 1);
    ctx.lineTo(x, by - 7); ctx.lineTo(x + 4, by - 1);
    ctx.lineTo(x + 8, by - 5); ctx.lineTo(x + 8, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c99a17'; ctx.lineWidth = 1; ctx.stroke();
    circ(ctx, x, by - 6, 1.4, '#ff5d73');
    circ(ctx, x - 8, by - 5, 1.1, '#5ad0ff');
    circ(ctx, x + 8, by - 5, 1.1, '#5ad0ff');
  }
}

function shannon(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.4;
  var waddle = opts.moving ? wob(t, 14) * 1.3 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  var cy = y + 15 + bob;

  // feet
  ctx.fillStyle = '#e0a23c';
  ell(ctx, x - 4 + waddle, fy - 1.5, 3, 2, '#e0a23c');
  ell(ctx, x + 4 - waddle, fy - 1.5, 3, 2, '#e0a23c');

  // body: gray feathers, rounded
  blob(ctx, x, cy, 22, 24, 10, '#8b909c');
  ell(ctx, x, cy + 6, 8.5, 7.5, '#a6abb6'); // belly lighter

  // wing tucks
  ctx.fillStyle = '#787d89';
  ell(ctx, x - 9, cy + 2, 4, 9, '#787d89');
  ell(ctx, x + 9, cy + 2, 4, 9, '#787d89');

  if (dir !== 'n') {
    // cream heart-shaped face disc
    ctx.fillStyle = '#f4ecd8';
    ctx.beginPath();
    ctx.moveTo(x, cy - 11);
    ctx.bezierCurveTo(x - 11, cy - 12, x - 11, cy + 4, x, cy + 7);
    ctx.bezierCurveTo(x + 11, cy + 4, x + 11, cy - 12, x, cy - 11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9cba8'; ctx.lineWidth = 1; ctx.stroke();
    // center ridge
    ctx.strokeStyle = '#e2d4b2'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, cy - 8); ctx.lineTo(x, cy - 1); ctx.stroke();

    // big amber eyes
    var ec = cy - 4;
    var L = dir === 'e' ? x + 1 : dir === 'w' ? x - 6.5 : x - 5;
    var R = dir === 'e' ? x + 6.5 : dir === 'w' ? x - 1 : x + 5;
    var es = (dir === 's') ? [L, R] : [dir === 'e' ? R : L];
    for (var i = 0; i < es.length; i++) {
      circ(ctx, es[i], ec, 4.2, '#f4ecd8');
      if (blink) {
        ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(es[i] - 3.4, ec); ctx.lineTo(es[i] + 3.4, ec); ctx.stroke();
      } else {
        circ(ctx, es[i], ec, 3.4, '#e0a73c');
        circ(ctx, es[i], ec, 1.9, '#22262f');
        circ(ctx, es[i] - 0.8, ec - 0.9, 0.8, 'rgba(255,255,255,0.9)');
      }
    }
    // beak
    ctx.fillStyle = '#e0a23c';
    ctx.beginPath();
    ctx.moveTo(x, cy - 1); ctx.lineTo(x - 2.4, cy + 1.5); ctx.lineTo(x + 2.4, cy + 1.5);
    ctx.closePath(); ctx.fill();
  } else {
    // back: ear tufts
    ctx.fillStyle = '#787d89';
    ell(ctx, x - 6, cy - 9, 2.4, 4, '#787d89');
    ell(ctx, x + 6, cy - 9, 2.4, 4, '#787d89');
  }
}

function gull(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.4;
  var waddle = opts.moving ? wob(t, 14) * 1.3 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  var cy = y + 15 + bob;

  ctx.fillStyle = '#f0a23a';
  ell(ctx, x - 4 + waddle, fy - 1.5, 3.2, 2.1, '#f0a23a');
  ell(ctx, x + 4 - waddle, fy - 1.5, 3.2, 2.1, '#f0a23a');

  // plump white body
  blob(ctx, x, cy, 22, 24, 11, '#eef2f6');
  ctx.fillStyle = '#dfe6ee';
  ell(ctx, x - 9, cy + 1, 4, 9, '#dfe6ee');
  ell(ctx, x + 9, cy + 1, 4, 9, '#dfe6ee');

  // beak + pouch
  if (dir !== 'n') {
    var ec = cy - 4;
    ctx.fillStyle = '#f4a032';
    // upper beak
    ctx.beginPath();
    ctx.moveTo(x - 6, ec + 4);
    ctx.quadraticCurveTo(x, ec + 6, x + 7, ec + 5);
    ctx.quadraticCurveTo(x + 2, ec + 8, x - 6, ec + 6.5);
    ctx.closePath(); ctx.fill();
    // orange pouch (bobbing fullness)
    ctx.fillStyle = '#ef8b2e';
    ctx.beginPath();
    ctx.moveTo(x - 5, ec + 5);
    ctx.quadraticCurveTo(x + 1, ec + 13 + Math.abs(wob(t, 2)) * 1.5, x + 6, ec + 5.5);
    ctx.closePath(); ctx.fill();

    eyes(ctx, dir, x, ec, 4, 2.4, blink);
  }

  // captain's cap
  var capY = cy - 11;
  ctx.fillStyle = '#23344e';
  blob(ctx, x, capY, 17, 7, 3.4, '#23344e');
  ctx.fillStyle = '#e9eef4';
  ctx.fillRect(x - 8.5, capY + 1.5, 17, 2.4);
  // brim
  ctx.fillStyle = '#1a2740';
  var bx = dir === 'w' ? x - 12 : x + 1;
  ell(ctx, bx + 4, capY + 4.5, 8, 2.2, '#1a2740');
  // gold badge
  circ(ctx, x, capY - 0.5, 1.7, '#f4c430');
}

function maren(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.3;
  var waddle = opts.moving ? wob(t, 14) * 1.6 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  var cy = y + 17 + bob;

  // legs (little crab legs)
  ctx.strokeStyle = '#e26b8a';
  ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (var s = -1; s <= 1; s += 2) {
    for (var k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x + s * 5, cy + 6);
      ctx.lineTo(x + s * (10 + k * 2) + s * waddle, fy - 1 + k);
      ctx.stroke();
    }
  }

  // spiral shell sits BEHIND and to one side, up high
  var sd = (dir === 'w') ? -1 : 1;   // shell side
  var shx = x + sd * 7, shy = cy - 4;
  ctx.fillStyle = '#d9b48a';
  circ(ctx, shx, shy, 10, '#d9b48a');
  ctx.strokeStyle = '#a87c4e'; ctx.lineWidth = 1.4;
  circ(ctx, shx, shy, 10, null); ctx.stroke();
  // spiral
  ctx.strokeStyle = '#9a6f44'; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (var a = 0; a < TAU * 1.8; a += 0.3) {
    var rr = 1 + a * 1.35;
    var px = shx + Math.cos(a) * rr, py = shy + Math.sin(a) * rr;
    if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // tiny mail-slot painted on the shell (white card peeking)
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(shx - 2.6, shy - 8, 5.2, 1.8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(shx - 1.2, shy - 8.6, 2.4, 1);

  // pink head/body pokes out the FRONT (opposite the shell side)
  var hx = x - sd * 4;
  ctx.fillStyle = '#f48aa8';
  blob(ctx, hx, cy + 3, 13, 12, 6, '#f48aa8');
  // claws low
  ctx.fillStyle = '#ef7a9c';
  ell(ctx, hx - 7, cy + 6, 3.2, 2.4, '#ef7a9c');
  ell(ctx, hx + 7, cy + 6, 3.2, 2.4, '#ef7a9c');
  // eyes on little stalks, clear of the shell
  if (dir !== 'n') {
    var ec = cy - 1;
    ctx.strokeStyle = '#f48aa8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(hx - 3.5, ec + 1); ctx.lineTo(hx - 3.5, ec - 2.5);
    ctx.moveTo(hx + 3.5, ec + 1); ctx.lineTo(hx + 3.5, ec - 2.5); ctx.stroke();
    eyes(ctx, dir, hx, ec - 2.5, 3.5, 2.1, blink);
    // smile
    ctx.strokeStyle = '#d4567a'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(hx, cy + 3, 2.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
}

function sift(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.4;
  var waddle = opts.moving ? wob(t, 14) * 1.5 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 9.5);
  var cy = y + 16 + bob;
  var tilt = Math.sin(t * 0.8) * 0.06; // curious head tilt

  // tail (fluffy, behind)
  ctx.fillStyle = '#e8cfa0';
  ell(ctx, x + (dir === 'w' ? 10 : -10), cy + 5, 5, 8, '#e8cfa0');
  circ(ctx, x + (dir === 'w' ? 11 : -11), cy + 9, 3.2, '#f5ead2');

  // feet
  ctx.fillStyle = '#d9b87e';
  ell(ctx, x - 4 + waddle, fy - 1.5, 3, 2, '#d9b87e');
  ell(ctx, x + 4 - waddle, fy - 1.5, 3, 2, '#d9b87e');

  // body sandy
  blob(ctx, x, cy + 2, 17, 18, 8, '#eccf99');
  ctx.fillStyle = '#f7eccf';
  ell(ctx, x, cy + 6, 6, 7, '#f7eccf');

  ctx.save();
  ctx.translate(x, cy - 3);
  ctx.rotate(tilt);
  // huge ears
  ctx.fillStyle = '#e6c98e';
  ctx.beginPath();
  ctx.moveTo(-3, -4); ctx.quadraticCurveTo(-13, -16, -7, -3); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3, -4); ctx.quadraticCurveTo(13, -16, 7, -3); ctx.closePath(); ctx.fill();
  // inner ears
  ctx.fillStyle = '#f6e2c2';
  ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-9, -11, -6.5, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, -4); ctx.quadraticCurveTo(9, -11, 6.5, -4); ctx.closePath(); ctx.fill();
  // head
  circ(ctx, 0, 1, 9, '#eccf99');
  // muzzle
  ctx.fillStyle = '#faf2e2';
  ell(ctx, 0, 4, 5, 4, '#faf2e2');
  ctx.restore();

  var ec = cy - 2;
  eyes(ctx, dir, x, ec, 3.8, 2.3, blink);
  if (dir !== 'n') circ(ctx, x, cy + 1, 1.4, '#3a2a1a'); // nose
}

function huff(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.3;
  var waddle = opts.moving ? wob(t, 14) * 1.4 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 11);
  var cy = y + 16 + bob;

  // flat tail visible behind
  ctx.fillStyle = '#7a5230';
  ctx.save();
  ctx.translate(x + (dir === 'w' ? 11 : -11), cy + 7);
  ell(ctx, 0, 0, 6, 8, '#7a5230');
  ctx.strokeStyle = '#5f3e22'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(-4, 0); ctx.lineTo(4, 4); ctx.stroke();
  ctx.restore();

  // feet
  ctx.fillStyle = '#5f3e22';
  ell(ctx, x - 4 + waddle, fy - 1.5, 3.2, 2, '#5f3e22');
  ell(ctx, x + 4 - waddle, fy - 1.5, 3.2, 2, '#5f3e22');

  // brown round body
  blob(ctx, x, cy + 1, 20, 21, 9, '#9a6a3e');
  ctx.fillStyle = '#b3855a';
  ell(ctx, x, cy + 6, 7, 7, '#b3855a');

  if (dir !== 'n') {
    var ec = cy - 3;
    eyes(ctx, dir, x, ec, 4, 2.4, blink);
    // big front teeth
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 2.2, cy + 2, 1.9, 3);
    ctx.fillRect(x + 0.3, cy + 2, 1.9, 3);
    ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 0.6;
    ctx.strokeRect(x - 2.2, cy + 2, 4.2, 3);
    // nose
    ell(ctx, x, cy, 2.2, 1.6, '#3a2418');
  }

  // tiny hardhat (yellow)
  var hy = cy - 10;
  ctx.fillStyle = '#f2c200';
  blob(ctx, x, hy + 1, 18, 7, 3, '#f2c200');
  ctx.fillStyle = '#e0b000';
  ell(ctx, x, hy + 4, 11, 2.4, '#e0b000');
  // ridge
  ctx.strokeStyle = '#caa000'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x, hy - 2.5); ctx.lineTo(x, hy + 2); ctx.stroke();
}

// cormorant sisters share a body; scarf color varies
function cormorant(scarf) {
  return function (ctx, x, y, t, opts) {
    var dir = opts.dir || 's';
    var blink = isBlink(t);
    var bob = wob(t, 3) * 1.4;
    var waddle = opts.moving ? wob(t, 14) * 1.3 : 0;
    var fy = y + 28;
    shadow(ctx, x, fy, 9);
    var cy = y + 15 + bob;

    // dark feet
    ctx.fillStyle = '#2a2f3a';
    ell(ctx, x - 3.5 + waddle, fy - 1.5, 2.8, 1.9, '#2a2f3a');
    ell(ctx, x + 3.5 - waddle, fy - 1.5, 2.8, 1.9, '#2a2f3a');

    // slender dark body
    blob(ctx, x, cy + 2, 16, 22, 8, '#33424f');
    ctx.fillStyle = '#3d4e5c';
    ell(ctx, x, cy + 6, 5.5, 8, '#3d4e5c');

    // short neck + rounder head
    ctx.fillStyle = '#33424f';
    ell(ctx, x, cy - 8, 4.5, 6, '#33424f');
    circ(ctx, x, cy - 12, 6.5, '#33424f');

    // crown band accent (parity ring) sits AROUND the head, not floating
    ctx.strokeStyle = scarf; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, cy - 12, 6.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();

    // scarf around neck base
    ctx.fillStyle = scarf;
    blob(ctx, x, cy - 5, 14, 5, 2.4, scarf);
    // scarf tail
    ctx.fillStyle = scarf;
    ctx.beginPath();
    ctx.moveTo(x + 5, cy - 5); ctx.lineTo(x + 9, cy + 2); ctx.lineTo(x + 5, cy + 2);
    ctx.closePath(); ctx.fill();

    if (dir !== 'n') {
      var ec = cy - 12;
      // thin hooked beak
      ctx.fillStyle = '#e6b84c';
      var bd = dir === 'w' ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(x + bd * 5, ec + 2);
      ctx.lineTo(x + bd * 11, ec + 3);
      ctx.lineTo(x + bd * 5, ec + 4.4);
      ctx.closePath(); ctx.fill();
      // eyes centered in the head
      eyes(ctx, dir, x, ec - 1, 3.4, 2.1, blink);
    }
  };
}

// mole twins; part = -1 left tuft, +1 right tuft
function mole(part) {
  return function (ctx, x, y, t, opts) {
    var dir = opts.dir || 's';
    var blink = isBlink(t);
    var bob = wob(t, 3) * 1.3;
    var waddle = opts.moving ? wob(t, 14) * 1.5 : 0;
    var fy = y + 28;
    shadow(ctx, x, fy, 9.5);
    var cy = y + 17 + bob;

    // little pink paws / digging claws
    ctx.fillStyle = '#f2c6cf';
    ell(ctx, x - 7 + waddle, cy + 7, 3.2, 2.4, '#f2c6cf');
    ell(ctx, x + 7 - waddle, cy + 7, 3.2, 2.4, '#f2c6cf');

    // round gray body
    blob(ctx, x, cy + 1, 19, 19, 9, '#8a8794');
    ctx.fillStyle = '#9b98a6';
    ell(ctx, x, cy + 5, 6.5, 6, '#9b98a6');

    // velvety face highlight
    ctx.fillStyle = '#a7a4b2';
    ell(ctx, x, cy - 1, 8, 7, '#a7a4b2');

    // hair tuft, parted to the side
    ctx.strokeStyle = '#5f5c68'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 2.4, cy - 8);
      ctx.quadraticCurveTo(x + i * 2.4 + part * 3, cy - 12, x + i * 2.4 + part * 5, cy - 11);
      ctx.stroke();
    }

    var ec = cy - 2;
    eyes(ctx, dir, x, ec, 3.6, 2.1, blink);
    // big pink nose
    if (dir !== 'n') {
      ell(ctx, x, cy + 2.5, 3, 2.3, '#f08fae');
      circ(ctx, x - 0.8, cy + 1.8, 0.7, 'rgba(255,255,255,0.7)');
    }
  };
}

function warden(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var bob = wob(t, 3) * 1.2;
  var waddle = opts.moving ? wob(t, 14) * 1.2 : 0;
  var fy = y + 28;
  // faint purple aura ring
  ctx.save();
  ctx.globalAlpha = 0.4 + wob(t, 1.4) * 0.12;
  ctx.strokeStyle = '#a98bff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, fy - 2, 13, 5.5, 0, 0, TAU); ctx.stroke();
  ctx.restore();
  shadow(ctx, x, fy, 9.5);
  var cy = y + 16 + bob;

  // bushy tail
  ctx.fillStyle = '#cfd4dd';
  ell(ctx, x + (dir === 'w' ? 10 : -10), cy + 5, 5, 8, '#cfd4dd');
  circ(ctx, x + (dir === 'w' ? 11 : -11), cy + 9, 3, '#eef1f6');

  ctx.fillStyle = '#b9bfc9';
  ell(ctx, x - 4 + waddle, fy - 1.5, 3, 2, '#b9bfc9');
  ell(ctx, x + 4 - waddle, fy - 1.5, 3, 2, '#b9bfc9');

  // silver body
  blob(ctx, x, cy + 1, 18, 19, 8, '#d4d9e2');
  ctx.fillStyle = '#eef1f6';
  ell(ctx, x, cy + 5, 6.5, 6.5, '#eef1f6');

  // ears
  ctx.fillStyle = '#c4cad4';
  ctx.beginPath(); ctx.moveTo(x - 7, cy - 6); ctx.lineTo(x - 10, cy - 14); ctx.lineTo(x - 3, cy - 8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 7, cy - 6); ctx.lineTo(x + 10, cy - 14); ctx.lineTo(x + 3, cy - 8); ctx.closePath(); ctx.fill();
  // head
  circ(ctx, x, cy - 4, 9, '#d4d9e2');
  ctx.fillStyle = '#f3f5f9';
  ell(ctx, x, cy - 1, 5, 4, '#f3f5f9'); // muzzle

  // calm half-closed eyes (drawn as soft arcs regardless of blink)
  if (dir !== 'n') {
    var ec = cy - 5;
    var xs = (dir === 's') ? [x - 4, x + 4] : [dir === 'e' ? x + 4 : x - 4];
    ctx.strokeStyle = '#3a3550'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (var i = 0; i < xs.length; i++) {
      ctx.beginPath();
      ctx.arc(xs[i], ec + 1.5, 3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    circ(ctx, x, cy - 2.5, 1.3, '#5a4a6a'); // nose
  }
}

// generic small villagers
function crab(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.3;
  var waddle = opts.moving ? wob(t, 14) * 1.8 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 9);
  var cy = y + 18 + bob;

  ctx.strokeStyle = '#e06a2a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x + s * 6, cy + 3);
    ctx.lineTo(x + s * (11 + k * 2) + s * waddle, fy - 1 + k * 1.5);
    ctx.stroke();
  }
  // body
  blob(ctx, x, cy, 18, 12, 6, '#f07a32');
  ctx.fillStyle = '#e06a2a';
  ell(ctx, x, cy + 3, 7, 3, '#e06a2a');
  // claws
  ctx.fillStyle = '#f07a32';
  circ(ctx, x - 10, cy + 1, 3.6, '#f07a32');
  circ(ctx, x + 10, cy + 1, 3.6, '#f07a32');
  ctx.strokeStyle = '#d05f22'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 12, cy + 1); ctx.lineTo(x - 8, cy + 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 8, cy + 1); ctx.lineTo(x + 12, cy + 1); ctx.stroke();
  // eyestalks
  if (dir !== 'n') {
    ctx.strokeStyle = '#f07a32'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x - 3.5, cy - 5); ctx.lineTo(x - 3.5, cy - 9);
    ctx.moveTo(x + 3.5, cy - 5); ctx.lineTo(x + 3.5, cy - 9); ctx.stroke();
    eyes(ctx, dir, x, cy - 9, 3.5, 2, blink);
  }
}

function turtle(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.1;
  var waddle = opts.moving ? wob(t, 14) * 1.4 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  var cy = y + 18 + bob;

  // feet
  ctx.fillStyle = '#5c8a3a';
  ell(ctx, x - 8 + waddle, fy - 1.5, 3, 2, '#5c8a3a');
  ell(ctx, x + 8 - waddle, fy - 1.5, 3, 2, '#5c8a3a');

  // head pokes out
  if (dir !== 'n') {
    circ(ctx, x + (dir === 'w' ? -10 : 10), cy - 1, 4.5, '#6fa048');
    var hx = x + (dir === 'w' ? -10 : 10);
    eyes(ctx, dir === 'n' ? 's' : dir, hx, cy - 2, 2.4, 1.5, blink);
  }
  // green domed shell
  ctx.fillStyle = '#3f7a3a';
  ctx.beginPath(); ctx.ellipse(x, cy, 12, 9, 0, Math.PI, TAU); ctx.fill();
  ctx.fillRect(x - 12, cy, 24, 4);
  ctx.fillStyle = '#356a32';
  ctx.fillRect(x - 12, cy + 2, 24, 2);
  // shell hex pattern
  ctx.strokeStyle = '#2c5a2a'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, cy - 8); ctx.lineTo(x, cy);
  ctx.moveTo(x - 6, cy - 5); ctx.lineTo(x, cy - 2); ctx.lineTo(x + 6, cy - 5);
  ctx.moveTo(x - 4, cy); ctx.lineTo(x - 6, cy - 5);
  ctx.moveTo(x + 4, cy); ctx.lineTo(x + 6, cy - 5);
  ctx.stroke();
  ctx.fillStyle = '#5c9450';
  ell(ctx, x - 4, cy - 5, 1.8, 1.6, '#5c9450');
  ell(ctx, x + 4, cy - 5, 1.8, 1.6, '#5c9450');
  ell(ctx, x, cy - 3, 1.8, 1.6, '#5c9450');
}

function gullsmall(ctx, x, y, t, opts) {
  var dir = opts.dir || 's';
  var blink = isBlink(t);
  var bob = wob(t, 3) * 1.3;
  var waddle = opts.moving ? wob(t, 14) * 1.4 : 0;
  var fy = y + 28;
  shadow(ctx, x, fy, 8);
  var cy = y + 17 + bob;

  ctx.fillStyle = '#f0a23a';
  ell(ctx, x - 3 + waddle, fy - 1.5, 2.6, 1.7, '#f0a23a');
  ell(ctx, x + 3 - waddle, fy - 1.5, 2.6, 1.7, '#f0a23a');

  // white body
  blob(ctx, x, cy, 16, 17, 8, '#f3f6fa');
  // wing tips gray
  ctx.fillStyle = '#c7ced8';
  ell(ctx, x - 7, cy + 1, 3, 6, '#c7ced8');
  ell(ctx, x + 7, cy + 1, 3, 6, '#c7ced8');
  // head
  circ(ctx, x, cy - 6, 6, '#f3f6fa');
  if (dir !== 'n') {
    // beak
    ctx.fillStyle = '#f4a032';
    var bd = dir === 'w' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x + bd * 4, cy - 6); ctx.lineTo(x + bd * 9, cy - 5); ctx.lineTo(x + bd * 4, cy - 4);
    ctx.closePath(); ctx.fill();
    eyes(ctx, dir, x, cy - 7, 3, 1.8, blink);
  }
}

/* ---------------- props ---------------- */

function mailbox(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 8);
  var bob = wob(t, 2) * 0.6;
  // post
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(x - 2, y + 14, 4, 14);
  // round-top red postbox
  var by = y + 9 + bob;
  ctx.fillStyle = '#d23b3b';
  ctx.beginPath();
  ctx.moveTo(x - 9, by + 9);
  ctx.lineTo(x - 9, by - 2);
  ctx.arc(x, by - 2, 9, Math.PI, 0);
  ctx.lineTo(x + 9, by + 9);
  ctx.closePath(); ctx.fill();
  // shading
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x + 4, by - 9, 5, 18);
  // mail slot
  ctx.fillStyle = '#2a1414';
  ctx.fillRect(x - 5, by - 4, 10, 2.4);
  // collar band
  ctx.fillStyle = '#f3d24a';
  ctx.fillRect(x - 9, by + 4, 18, 2.4);
  // little white envelope flag
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 8, by - 2, 4, 3.5);
}

function boat(ctx, x, y, t) {
  var fy = y + 28;
  var bob = wob(t, 1.4) * 1.4; // gentle float
  shadow(ctx, x, fy, 13);
  var by = y + 16 + bob;
  // hull (side view dinghy)
  ctx.fillStyle = '#9a6b3c';
  ctx.beginPath();
  ctx.moveTo(x - 14, by);
  ctx.quadraticCurveTo(x - 16, by + 9, x - 8, by + 10);
  ctx.lineTo(x + 8, by + 10);
  ctx.quadraticCurveTo(x + 16, by + 9, x + 14, by);
  ctx.closePath(); ctx.fill();
  // inner
  ctx.fillStyle = '#b9874f';
  ctx.beginPath();
  ctx.moveTo(x - 11, by + 1);
  ctx.quadraticCurveTo(x - 12, by + 6, x - 6, by + 7);
  ctx.lineTo(x + 6, by + 7);
  ctx.quadraticCurveTo(x + 12, by + 6, x + 11, by + 1);
  ctx.closePath(); ctx.fill();
  // plank lines
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 13, by + 3.5); ctx.lineTo(x + 13, by + 3.5); ctx.stroke();
  // bench
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(x - 4, by + 1, 8, 2);
  // little oar
  ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 4, by + 1); ctx.lineTo(x + 14, by - 7); ctx.stroke();
}

function beacon(on) {
  return function (ctx, x, y, t) {
    var fy = y + 28;
    shadow(ctx, x, fy, 11);
    // stone tower
    ctx.fillStyle = '#8b8f99';
    ctx.beginPath();
    ctx.moveTo(x - 8, fy);
    ctx.lineTo(x - 6, y + 8);
    ctx.lineTo(x + 6, y + 8);
    ctx.lineTo(x + 8, fy);
    ctx.closePath(); ctx.fill();
    // stone shading + courses
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 8); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x + 8, fy); ctx.lineTo(x + 4, fy);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6.6, y + 15); ctx.lineTo(x + 6.6, y + 15);
    ctx.moveTo(x - 7.3, y + 22); ctx.lineTo(x + 7.3, y + 22);
    ctx.stroke();
    // lamp housing
    ctx.fillStyle = '#5a5e68';
    ctx.fillRect(x - 7, y + 2, 14, 7);
    ctx.fillStyle = '#3f434c';
    ctx.fillRect(x - 5, y + 3, 10, 5);
    // lamp
    if (on) {
      var pulse = 0.7 + wob(t, 3) * 0.3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      // animated rays
      ctx.globalAlpha = 0.25 + wob(t, 1.5) * 0.12;
      ctx.fillStyle = '#ffe39a';
      for (var r = 0; r < 6; r++) {
        var a = t * 0.6 + r * (TAU / 6);
        ctx.beginPath();
        ctx.moveTo(x, y + 5);
        ctx.lineTo(x + Math.cos(a) * 22, y + 5 + Math.sin(a) * 22);
        ctx.lineTo(x + Math.cos(a + 0.18) * 22, y + 5 + Math.sin(a + 0.18) * 22);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = pulse;
      circ(ctx, x, y + 5.5, 4.5, '#fff1b8');
      ctx.restore();
      circ(ctx, x, y + 5.5, 2.4, '#fffaf0');
    } else {
      circ(ctx, x, y + 5.5, 3.2, '#23262e');
    }
    // little roof cap
    ctx.fillStyle = '#6b4a2c';
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 2); ctx.lineTo(x, y - 4); ctx.lineTo(x + 8, y + 2);
    ctx.closePath(); ctx.fill();
  };
}

function chest(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  var by = fy - 4;
  // base box
  ctx.fillStyle = '#8a5a30';
  blob(ctx, x, by - 4, 22, 13, 2.5, '#8a5a30');
  // lid (domed)
  ctx.fillStyle = '#a06a38';
  ctx.beginPath();
  ctx.moveTo(x - 11, by - 9);
  ctx.arc(x, by - 9, 11, Math.PI, 0);
  ctx.closePath(); ctx.fill();
  // metal bands
  ctx.fillStyle = '#d4b24a';
  ctx.fillRect(x - 11, by - 6, 22, 2);
  ctx.fillRect(x - 7, by - 16, 2.6, 22);
  ctx.fillRect(x + 4.4, by - 16, 2.6, 22);
  // lock
  ctx.fillStyle = '#e8c860';
  blob(ctx, x, by - 4, 5, 5, 1.5, '#e8c860');
  circ(ctx, x, by - 4.5, 1.1, '#7a5a20');
}

function sign(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 7);
  // post
  ctx.fillStyle = '#6b4a2c';
  ctx.fillRect(x - 2, y + 12, 4, 16);
  // plank
  ctx.fillStyle = '#a9763f';
  blob(ctx, x, y + 11, 24, 14, 2.5, '#a9763f');
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 1.4; ctx.strokeRect(x - 11, y + 5, 22, 12);
  // text lines
  ctx.fillStyle = 'rgba(60,38,18,0.6)';
  ctx.fillRect(x - 7, y + 8.5, 14, 1.6);
  ctx.fillRect(x - 7, y + 12, 10, 1.6);
}

function door(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 9);
  // heavy wooden door standing free
  ctx.fillStyle = '#7a5230';
  blob(ctx, x, y + 15, 20, 26, 4, '#7a5230');
  // planks
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1.2;
  for (var i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 6, y + 3); ctx.lineTo(x + i * 6, y + 27); ctx.stroke();
  }
  // iron bands
  ctx.fillStyle = '#5a5e68';
  ctx.fillRect(x - 10, y + 8, 20, 3);
  ctx.fillRect(x - 10, y + 21, 20, 3);
  // studs
  ctx.fillStyle = '#3f434c';
  for (var s = -1; s <= 1; s++) {
    circ(ctx, x + s * 7, y + 9.5, 1, '#3f434c');
    circ(ctx, x + s * 7, y + 22.5, 1, '#3f434c');
  }
  // ring handle
  ctx.strokeStyle = '#2f333b'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(x + 6, y + 16, 2.4, 0, TAU); ctx.stroke();
}

function gate(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 11);
  // stone arch
  ctx.fillStyle = '#8b8f99';
  ctx.beginPath();
  ctx.moveTo(x - 13, fy);
  ctx.lineTo(x - 13, y + 12);
  ctx.arc(x, y + 12, 13, Math.PI, 0);
  ctx.lineTo(x + 13, fy);
  ctx.lineTo(x + 8, fy);
  ctx.lineTo(x + 8, y + 13);
  ctx.arc(x, y + 13, 8, 0, Math.PI, true);
  ctx.lineTo(x - 8, fy);
  ctx.closePath(); ctx.fill();
  // stone shading
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 18); ctx.lineTo(x - 8, y + 18);
  ctx.moveTo(x + 8, y + 18); ctx.lineTo(x + 13, y + 18);
  ctx.stroke();
  // iron bars across opening
  ctx.strokeStyle = '#3a3e46'; ctx.lineWidth = 1.8;
  for (var i = -1; i <= 1; i++) {
    ctx.beginPath(); ctx.moveTo(x + i * 4, y + 14); ctx.lineTo(x + i * 4, fy - 1); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(x - 7, y + 20); ctx.lineTo(x + 7, y + 20); ctx.stroke();
}

function runedoor(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  // dark slab
  ctx.fillStyle = '#262b36';
  blob(ctx, x, y + 15, 22, 26, 4, '#262b36');
  ctx.fillStyle = '#1c212a';
  blob(ctx, x, y + 15, 17, 22, 3, '#1c212a');
  // glowing cyan runes
  var pulse = 0.55 + wob(t, 2) * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#3fe0ff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  // a few rune glyphs
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 7); ctx.lineTo(x - 5, y + 13); ctx.moveTo(x - 7, y + 10); ctx.lineTo(x - 3, y + 10);
  ctx.moveTo(x + 5, y + 7); ctx.lineTo(x + 5, y + 13); ctx.lineTo(x + 8, y + 10);
  ctx.moveTo(x - 4, y + 18); ctx.lineTo(x, y + 16); ctx.lineTo(x + 4, y + 18);
  ctx.moveTo(x, y + 16); ctx.lineTo(x, y + 23);
  ctx.stroke();
  // central rune circle
  ctx.beginPath(); ctx.arc(x, y + 15, 8, 0, TAU); ctx.stroke();
  ctx.restore();
}

function letter(ctx, x, y, t) {
  var bob = wob(t, 2.2) * 2; // bobbing
  var cy = y + 15 + bob;
  shadow(ctx, x, y + 27, 6 - bob * 0.2);
  // white envelope
  ctx.fillStyle = '#f6f4ee';
  blob(ctx, x, cy, 20, 13, 2, '#f6f4ee');
  ctx.strokeStyle = '#cfc8b8'; ctx.lineWidth = 1; ctx.strokeRect(x - 10, cy - 6.5, 20, 13);
  // flap
  ctx.strokeStyle = '#c0b8a4'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 10, cy - 6.5); ctx.lineTo(x, cy + 1); ctx.lineTo(x + 10, cy - 6.5);
  ctx.stroke();
  // red wax seal
  circ(ctx, x, cy + 1, 2.4, '#d23b3b');
  circ(ctx, x, cy + 1, 1.2, '#a82c2c');
}

function spark(ctx, x, y, t) {
  var bob = wob(t, 2.4) * 2;
  var cy = y + 14 + bob;
  var pulse = 0.8 + wob(t, 4) * 0.2;
  // glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 * pulse;
  circ(ctx, x, cy, 9, '#ffd86b');
  ctx.restore();
  // 4-point golden star
  ctx.save();
  ctx.translate(x, cy);
  ctx.rotate(t * 0.6);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#ffce4a';
  ctx.beginPath();
  var pts = 4, outer = 8, inner = 2.6;
  for (var i = 0; i < pts * 2; i++) {
    var rr = (i % 2 === 0) ? outer : inner;
    var a = (i / (pts * 2)) * TAU - Math.PI / 2;
    var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  circ(ctx, 0, 0, 2.4, '#fff6d8');
  ctx.restore();
}

function geyser(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 10);
  // rocky vent
  ctx.fillStyle = '#6b6f78';
  ctx.beginPath();
  ctx.moveTo(x - 11, fy);
  ctx.lineTo(x - 7, y + 16);
  ctx.quadraticCurveTo(x, y + 12, x + 7, y + 16);
  ctx.lineTo(x + 11, fy);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 6, 2.6, 0, 0, TAU); ctx.fill();
  // rock highlights
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ell(ctx, x - 5, y + 20, 2.6, 1.6, 'rgba(255,255,255,0.1)');
  // occasional puff: period ~3.4s, active for first ~1.1s
  var ph = t % 3.4;
  if (ph < 1.1) {
    var rise = ph / 1.1;
    ctx.save();
    ctx.globalAlpha = (1 - rise) * 0.7;
    ctx.fillStyle = '#e4e9f0';
    var puffY = y + 13 - rise * 16;
    circ(ctx, x, puffY, 4 + rise * 4, '#e4e9f0');
    circ(ctx, x - 4, puffY + 3, 3 + rise * 2, '#eef2f7');
    circ(ctx, x + 4, puffY + 2, 3 + rise * 2.5, '#eef2f7');
    ctx.restore();
  }
}

function stamp(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 9);
  // carved stone block
  ctx.fillStyle = '#9a9ea8';
  blob(ctx, x, y + 17, 22, 20, 3, '#9a9ea8');
  // top face (isometric-ish)
  ctx.fillStyle = '#aeb2bc';
  ctx.beginPath();
  ctx.moveTo(x - 11, y + 9);
  ctx.lineTo(x - 7, y + 5);
  ctx.lineTo(x + 11, y + 5);
  ctx.lineTo(x + 11, y + 9);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x + 6, y + 9, 5, 16);
  // carved glyph
  ctx.strokeStyle = '#4a4e58'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 13); ctx.lineTo(x + 5, y + 13);
  ctx.moveTo(x - 3, y + 13); ctx.lineTo(x - 3, y + 21);
  ctx.moveTo(x + 3, y + 13); ctx.lineTo(x + 3, y + 21);
  ctx.moveTo(x - 5, y + 21); ctx.lineTo(x + 5, y + 21);
  ctx.stroke();
}

function dial(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 7);
  // post
  ctx.fillStyle = '#5a5e68';
  ctx.fillRect(x - 2.5, y + 16, 5, 12);
  // round dial face
  circ(ctx, x, y + 12, 10, '#3b3f49');
  circ(ctx, x, y + 12, 8.5, '#cdd2db');
  ctx.strokeStyle = '#3b3f49'; ctx.lineWidth = 1; ctx.stroke();
  // ticks
  ctx.strokeStyle = '#6a6f79'; ctx.lineWidth = 1;
  for (var i = 0; i < 8; i++) {
    var a = i * (TAU / 8);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 6.5, y + 12 + Math.sin(a) * 6.5);
    ctx.lineTo(x + Math.cos(a) * 8, y + 12 + Math.sin(a) * 8);
    ctx.stroke();
  }
  // pointer needle (slowly sweeps)
  var na = wob(t, 0.5) * 1.2 - Math.PI / 2;
  ctx.strokeStyle = '#d23b3b'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + Math.cos(na) * 6, y + 12 + Math.sin(na) * 6);
  ctx.stroke();
  circ(ctx, x, y + 12, 1.6, '#23262e');
}

function lever(ctx, x, y, t) {
  var fy = y + 28;
  shadow(ctx, x, fy, 8);
  // base block
  ctx.fillStyle = '#5a5e68';
  blob(ctx, x, fy - 5, 18, 9, 2.5, '#5a5e68');
  ctx.fillStyle = '#43474f';
  ctx.fillRect(x - 7, fy - 6, 14, 2);
  // slot
  ctx.fillStyle = '#2a2d34';
  ctx.fillRect(x - 1.4, fy - 14, 2.8, 8);
  // lever arm (slight idle sway)
  var sway = wob(t, 1.6) * 0.12;
  ctx.save();
  ctx.translate(x, fy - 8);
  ctx.rotate(-0.5 + sway);
  ctx.strokeStyle = '#8a8f99'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.stroke();
  circ(ctx, 0, -15, 3.4, '#d23b3b');
  circ(ctx, -1, -16, 1.2, 'rgba(255,255,255,0.5)');
  ctx.restore();
}

/* ---------------- registry ---------------- */

var SPRITES = {
  pip: pip,
  shannon: shannon,
  gull: gull,
  maren: maren,
  sift: sift,
  huff: huff,
  ada: cormorant('#d94646'),
  bea: cormorant('#3fae53'),
  cee: cormorant('#4a7fd6'),
  lem: mole(-1),
  ziv: mole(1),
  warden: warden,
  crab: crab,
  turtle: turtle,
  gullsmall: gullsmall,
  mailbox: mailbox,
  boat: boat,
  'beacon-off': beacon(false),
  'beacon-on': beacon(true),
  chest: chest,
  sign: sign,
  door: door,
  gate: gate,
  runedoor: runedoor,
  letter: letter,
  spark: spark,
  geyser: geyser,
  stamp: stamp,
  dial: dial,
  lever: lever,
};

function unknown(ctx, x, y, t, opts) {
  var blink = isBlink(t);
  var fy = y + 28;
  shadow(ctx, x, fy, 9);
  var cy = y + 16 + wob(t, 3) * 1.5;
  blob(ctx, x, cy, 20, 20, 9, '#9aa3b2');
  ctx.fillStyle = '#8b94a4';
  ell(ctx, x, cy + 5, 6, 5, '#8b94a4');
  eyes(ctx, (opts && opts.dir) || 's', x, cy - 2, 4.4, 2.6, blink);
}

/* ---------------- public draw ---------------- */

function draw(ctx, name, px, py, t, opts) {
  opts = opts || {};
  var fn = SPRITES[name] || unknown;
  var x = px + 16;
  ctx.save();
  fn(ctx, x, py, t, opts);
  ctx.restore();
}

/* ---------------- portraits (cached 96x96 bust) ---------------- */

var portraitCache = {};

// per-character soft radial background tint
var TINTS = {
  pip: '#cdeefb', shannon: '#efe7d2', gull: '#dbe6f2', maren: '#fadbe6',
  sift: '#f6e8cf', huff: '#e7d6c0', ada: '#f6d8d8', bea: '#d8f0dd',
  cee: '#d6e2f6', lem: '#e2e0ea', ziv: '#e2e0ea', warden: '#e6def4',
  crab: '#fae0cf', turtle: '#d9ecd2', gullsmall: '#e6edf5',
};

function bgTint(pctx, color) {
  var g = pctx.createRadialGradient(48, 40, 6, 48, 50, 70);
  g.addColorStop(0, color || '#dde3ec');
  g.addColorStop(1, '#aeb6c4');
  pctx.fillStyle = g;
  pctx.fillRect(0, 0, 96, 96);
  // vignette
  var v = pctx.createRadialGradient(48, 48, 30, 48, 48, 60);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.18)');
  pctx.fillStyle = v;
  pctx.fillRect(0, 0, 96, 96);
}

// Each portrait painter draws a big front-facing bust into a 96x96 ctx.
function pBlob(pctx, cx, cy, w, h, r, fill) {
  blob(pctx, cx, cy, w, h, r, fill);
}
function pEyes(pctx, cx, cy, sp, r) {
  for (var s = -1; s <= 1; s += 2) {
    var ex = cx + s * sp;
    circ(pctx, ex, cy, r, '#1b2233');
    circ(pctx, ex - r * 0.3, cy - r * 0.34, r * 0.36, 'rgba(255,255,255,0.92)');
  }
}

var PORTRAITS = {
  pip: function (p) {
    pBlob(p, 48, 58, 56, 56, 22, '#f4f7fb');
    // shade
    p.save(); p.beginPath(); p.arc(48, 58, 28, 0, TAU); p.clip();
    ell(p, 58, 68, 30, 26, 'rgba(120,150,180,0.14)'); p.restore();
    // antenna
    p.strokeStyle = '#9fb2c8'; p.lineWidth = 3.5;
    p.beginPath(); p.moveTo(48, 30); p.quadraticCurveTo(52, 18, 54, 11); p.stroke();
    p.save(); p.globalAlpha = 0.8; circ(p, 54, 10, 7, '#67e8f9'); p.restore();
    circ(p, 54, 10, 4, '#bef6ff');
    // trim arc low on the body
    p.strokeStyle = '#27b3d4'; p.lineWidth = 4.5;
    p.beginPath(); p.arc(48, 60, 24, 0.12 * Math.PI, 0.88 * Math.PI); p.stroke();
    // strap over the shoulder to a hip pouch (well below the face)
    p.strokeStyle = '#8a5a32'; p.lineWidth = 5; p.lineCap = 'round';
    p.beginPath(); p.moveTo(28, 56); p.lineTo(66, 78); p.stroke();
    p.fillStyle = '#9c6638'; pBlob(p, 70, 78, 16, 14, 4, '#9c6638');
    p.fillStyle = '#7a4d28'; pBlob(p, 70, 72, 16, 6, 3, '#7a4d28');
    // eyes high on the face
    pEyes(p, 48, 48, 12, 7);
    // blush
    p.fillStyle = 'rgba(255,150,170,0.45)';
    ell(p, 30, 60, 5, 3, 'rgba(255,150,170,0.45)');
    ell(p, 66, 60, 5, 3, 'rgba(255,150,170,0.45)');
  },
  shannon: function (p) {
    pBlob(p, 48, 60, 58, 56, 22, '#8b909c');
    // face disc
    p.fillStyle = '#f4ecd8';
    p.beginPath();
    p.moveTo(48, 26);
    p.bezierCurveTo(16, 24, 16, 64, 48, 76);
    p.bezierCurveTo(80, 64, 80, 24, 48, 26);
    p.closePath(); p.fill();
    p.strokeStyle = '#d9cba8'; p.lineWidth = 1.5; p.stroke();
    p.strokeStyle = '#e2d4b2'; p.lineWidth = 2.5;
    p.beginPath(); p.moveTo(48, 34); p.lineTo(48, 52); p.stroke();
    // amber eyes
    for (var s = -1; s <= 1; s += 2) {
      var ex = 48 + s * 14;
      circ(p, ex, 48, 11, '#f4ecd8');
      circ(p, ex, 48, 9, '#e0a73c');
      circ(p, ex, 48, 5, '#22262f');
      circ(p, ex - 2, 45, 2, 'rgba(255,255,255,0.9)');
    }
    // beak
    p.fillStyle = '#e0a23c';
    p.beginPath(); p.moveTo(48, 56); p.lineTo(43, 62); p.lineTo(53, 62); p.closePath(); p.fill();
  },
  gull: function (p) {
    pBlob(p, 48, 60, 56, 54, 22, '#eef2f6');
    pEyes(p, 48, 46, 12, 6);
    // beak + pouch
    p.fillStyle = '#f4a032';
    p.beginPath(); p.moveTo(34, 56); p.quadraticCurveTo(48, 60, 64, 57); p.quadraticCurveTo(52, 64, 34, 60); p.closePath(); p.fill();
    p.fillStyle = '#ef8b2e';
    p.beginPath(); p.moveTo(36, 58); p.quadraticCurveTo(48, 78, 62, 58); p.closePath(); p.fill();
    // cap
    p.fillStyle = '#23344e'; pBlob(p, 48, 26, 50, 18, 8, '#23344e');
    p.fillStyle = '#e9eef4'; p.fillRect(23, 30, 50, 6);
    circ(p, 48, 22, 4, '#f4c430');
  },
  maren: function (p) {
    // shell
    circ(p, 60, 50, 30, '#d9b48a');
    p.strokeStyle = '#a87c4e'; p.lineWidth = 3; p.stroke();
    p.strokeStyle = '#9a6f44'; p.lineWidth = 3;
    p.beginPath();
    for (var a = 0; a < TAU * 1.8; a += 0.2) {
      var rr = 2 + a * 4; var px = 60 + Math.cos(a) * rr, py = 50 + Math.sin(a) * rr;
      if (a === 0) p.moveTo(px, py); else p.lineTo(px, py);
    }
    p.stroke();
    // mail slot
    p.fillStyle = '#5b3a1e'; p.fillRect(58, 36, 14, 4.5);
    // pink head
    p.fillStyle = '#f48aa8'; pBlob(p, 36, 58, 36, 34, 14, '#f48aa8');
    pEyes(p, 32, 54, 9, 5.5);
    // claws
    p.fillStyle = '#ef7a9c'; circ(p, 20, 68, 7, '#ef7a9c'); circ(p, 50, 70, 6, '#ef7a9c');
  },
  sift: function (p) {
    // ears
    p.fillStyle = '#e6c98e';
    p.beginPath(); p.moveTo(34, 36); p.quadraticCurveTo(8, 4, 24, 38); p.closePath(); p.fill();
    p.beginPath(); p.moveTo(62, 36); p.quadraticCurveTo(88, 4, 72, 38); p.closePath(); p.fill();
    p.fillStyle = '#f6e2c2';
    p.beginPath(); p.moveTo(32, 38); p.quadraticCurveTo(16, 12, 28, 40); p.closePath(); p.fill();
    p.beginPath(); p.moveTo(64, 38); p.quadraticCurveTo(80, 12, 68, 40); p.closePath(); p.fill();
    // head
    circ(p, 48, 54, 28, '#eccf99');
    p.fillStyle = '#faf2e2'; ell(p, 48, 62, 15, 12, '#faf2e2');
    pEyes(p, 48, 50, 13, 6.5);
    circ(p, 48, 62, 3.5, '#3a2a1a'); // nose
  },
  huff: function (p) {
    pBlob(p, 48, 58, 56, 54, 22, '#9a6a3e');
    p.fillStyle = '#b3855a'; ell(p, 48, 66, 18, 16, '#b3855a');
    pEyes(p, 48, 48, 12, 6.5);
    ell(p, 48, 60, 6, 4.5, '#3a2418'); // nose
    // teeth
    p.fillStyle = '#fff'; p.fillRect(44, 66, 4, 7); p.fillRect(49, 66, 4, 7);
    p.strokeStyle = '#cfcfcf'; p.lineWidth = 1; p.strokeRect(44, 66, 9, 7);
    // hardhat
    p.fillStyle = '#f2c200'; pBlob(p, 48, 26, 50, 18, 7, '#f2c200');
    p.fillStyle = '#e0b000'; ell(p, 48, 34, 28, 6, '#e0b000');
  },
  warden: function (p) {
    // aura
    p.save(); p.globalAlpha = 0.4; p.strokeStyle = '#a98bff'; p.lineWidth = 4;
    p.beginPath(); p.arc(48, 52, 38, 0, TAU); p.stroke(); p.restore();
    // ears
    p.fillStyle = '#c4cad4';
    p.beginPath(); p.moveTo(30, 36); p.lineTo(22, 14); p.lineTo(44, 32); p.closePath(); p.fill();
    p.beginPath(); p.moveTo(66, 36); p.lineTo(74, 14); p.lineTo(52, 32); p.closePath(); p.fill();
    circ(p, 48, 52, 28, '#d4d9e2');
    p.fillStyle = '#f3f5f9'; ell(p, 48, 60, 15, 12, '#f3f5f9');
    // half-closed eyes
    p.strokeStyle = '#3a3550'; p.lineWidth = 4; p.lineCap = 'round';
    for (var s = -1; s <= 1; s += 2) {
      p.beginPath(); p.arc(48 + s * 13, 52, 8, Math.PI * 1.12, Math.PI * 1.88); p.stroke();
    }
    circ(p, 48, 58, 3.5, '#5a4a6a');
  },
  crab: function (p) {
    pBlob(p, 48, 56, 56, 36, 16, '#f07a32');
    p.fillStyle = '#e06a2a'; ell(p, 48, 64, 20, 9, '#e06a2a');
    circ(p, 16, 56, 12, '#f07a32'); circ(p, 80, 56, 12, '#f07a32');
    // eyestalks
    p.strokeStyle = '#f07a32'; p.lineWidth = 5;
    p.beginPath(); p.moveTo(40, 40); p.lineTo(40, 26); p.moveTo(56, 40); p.lineTo(56, 26); p.stroke();
    pEyes(p, 48, 26, 8, 6);
  },
  turtle: function (p) {
    // head
    circ(p, 48, 66, 16, '#6fa048');
    pEyes(p, 48, 62, 8, 5);
    // shell dome
    p.fillStyle = '#3f7a3a';
    p.beginPath(); p.ellipse(48, 50, 34, 26, 0, Math.PI, TAU); p.fill();
    p.fillRect(14, 50, 68, 8);
    p.strokeStyle = '#2c5a2a'; p.lineWidth = 2.5;
    p.beginPath();
    p.moveTo(48, 26); p.lineTo(48, 50);
    p.moveTo(30, 40); p.lineTo(48, 48); p.lineTo(66, 40);
    p.stroke();
    p.fillStyle = '#5c9450';
    ell(p, 36, 40, 5, 4, '#5c9450'); ell(p, 60, 40, 5, 4, '#5c9450'); ell(p, 48, 44, 5, 4, '#5c9450');
  },
  gullsmall: function (p) {
    pBlob(p, 48, 58, 50, 48, 20, '#f3f6fa');
    p.fillStyle = '#c7ced8'; ell(p, 22, 58, 8, 16, '#c7ced8'); ell(p, 74, 58, 8, 16, '#c7ced8');
    pEyes(p, 48, 48, 11, 6);
    p.fillStyle = '#f4a032';
    p.beginPath(); p.moveTo(48, 56); p.lineTo(62, 60); p.lineTo(48, 64); p.closePath(); p.fill();
  },
  ada: pCormorant('#d94646'),
  bea: pCormorant('#3fae53'),
  cee: pCormorant('#4a7fd6'),
  lem: pMole(-1),
  ziv: pMole(1),
};

function pCormorant(scarf) {
  return function (p) {
    // dark body + head
    pBlob(p, 48, 64, 50, 50, 20, '#33424f');
    circ(p, 48, 44, 24, '#33424f');
    // crown band accent (parity ring)
    p.strokeStyle = scarf; p.lineWidth = 5;
    p.beginPath(); p.arc(48, 44, 24, Math.PI * 1.18, Math.PI * 1.82); p.stroke();
    // scarf
    p.fillStyle = scarf; pBlob(p, 48, 66, 50, 14, 6, scarf);
    p.beginPath(); p.moveTo(62, 66); p.lineTo(72, 86); p.lineTo(58, 84); p.closePath(); p.fill();
    // eyes
    pEyes(p, 48, 42, 11, 6.5);
    // hooked yellow beak
    p.fillStyle = '#e6b84c';
    p.beginPath(); p.moveTo(56, 50); p.lineTo(76, 53); p.lineTo(56, 57); p.closePath(); p.fill();
  };
}

function pMole(part) {
  return function (p) {
    pBlob(p, 48, 58, 54, 54, 22, '#8a8794');
    p.fillStyle = '#a7a4b2'; ell(p, 48, 54, 22, 19, '#a7a4b2');
    // hair tuft parted to one side
    p.strokeStyle = '#5f5c68'; p.lineWidth = 4; p.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      p.beginPath();
      p.moveTo(48 + i * 6, 30);
      p.quadraticCurveTo(48 + i * 6 + part * 10, 18, 48 + i * 6 + part * 16, 20);
      p.stroke();
    }
    pEyes(p, 48, 50, 12, 7);
    // big pink nose
    ell(p, 48, 64, 7, 5.5, '#f08fae');
    circ(p, 46, 62, 1.8, 'rgba(255,255,255,0.7)');
  };
}

function portrait(name) {
  if (portraitCache[name]) return portraitCache[name];
  var c = (typeof document !== 'undefined')
    ? document.createElement('canvas')
    : null;
  if (!c) return null;
  c.width = 96; c.height = 96;
  var p = c.getContext('2d');
  bgTint(p, TINTS[name]);
  // ground shadow under bust
  p.fillStyle = 'rgba(0,0,0,0.16)';
  ell(p, 48, 88, 30, 7, 'rgba(0,0,0,0.16)');
  var painter = PORTRAITS[name];
  if (painter) {
    painter(p);
  } else {
    // unknown: gray blob with eyes
    pBlob(p, 48, 54, 54, 54, 22, '#9aa3b2');
    p.fillStyle = '#8b94a4'; ell(p, 48, 64, 16, 13, '#8b94a4');
    pEyes(p, 48, 50, 12, 7);
  }
  portraitCache[name] = c;
  return c;
}

G.sprites = { draw: draw, portrait: portrait };

})();
