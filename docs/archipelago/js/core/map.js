/* ASCII map parsing + tile queries. Entity collision lives in entities.js. */
(function () {
'use strict';

G.map = {
  current: null,   // { w, h, rows:[string], island }

  load: function (island) {
    var lines = island.map.replace(/\r/g, '').split('\n');
    // trim leading/trailing blank lines but PRESERVE indentation-free content:
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    // strip the common leading indentation of the template literal
    var indent = Infinity;
    lines.forEach(function (l) {
      if (!l.trim()) return;
      var m = l.match(/^ */)[0].length;
      if (m < indent) indent = m;
    });
    if (!isFinite(indent)) indent = 0;
    lines = lines.map(function (l) { return l.slice(indent); });
    var w = 0;
    lines.forEach(function (l) { if (l.length > w) w = l.length; });
    lines = lines.map(function (l) { return l + new Array(w - l.length + 1).join(' '); });
    G.map.current = { w: w, h: lines.length, rows: lines, island: island };
    return G.map.current;
  },

  charAt: function (x, y) {
    var m = G.map.current;
    if (!m) return ' ';
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return m.island.border || '~';
    return m.rows[y].charAt(x);
  },

  tileAt: function (x, y) {
    return G.TILES[G.map.charAt(x, y)] || G.TILES[' '];
  },

  tileWalkable: function (x, y) {
    return !!G.map.tileAt(x, y).walk;
  },
};

})();
