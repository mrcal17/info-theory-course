/* Tile legend + palettes. Chars are FROZEN in DESIGN.md. */
(function () {
'use strict';

/* role: color key in the palette. walk: passable. tall: drawn in the y-sorted
   entity pass (occludes things behind). glow: emits light. decor: renderer
   sprinkles deterministic detail. */
G.TILES = {
  '.': { role: 'sand',       walk: true,  decor: 'speckle' },
  ',': { role: 'grass',      walk: true,  decor: 'blades' },
  ';': { role: 'grassDark',  walk: true,  decor: 'blades' },
  '"': { role: 'tallGrass',  walk: true,  decor: 'tall' },
  '_': { role: 'path',       walk: true,  decor: 'pebble' },
  '=': { role: 'board',      walk: true,  decor: 'plank' },
  's': { role: 'stoneFloor', walk: true,  decor: 'crack' },
  '%': { role: 'caveFloor',  walk: true,  decor: 'crack' },
  '+': { role: 'doorway',    walk: true },
  '-': { role: 'shallow',    walk: true,  decor: 'ripple' },
  '~': { role: 'water',      walk: false, decor: 'wave' },
  '#': { role: 'rock',       walk: false, edge: true },
  '^': { role: 'cliff',      walk: false, edge: true },
  'S': { role: 'stoneWall',  walk: false, edge: true },
  'C': { role: 'caveWall',   walk: false, edge: true },
  'T': { role: 'grass',      walk: false, tall: 'tree' },
  't': { role: 'grass',      walk: false, tall: 'bush' },
  'o': { role: 'sand',       walk: false, tall: 'boulder' },
  '*': { role: 'caveFloor',  walk: false, tall: 'crystal', glow: '#7dd3fc' },
  '!': { role: 'stoneFloor', walk: false, tall: 'beaconbase', glow: '#fbbf24' },
  ' ': { role: 'void',       walk: false },
};

/* Palettes: one color per role + ambience. weather: 'rain' adds rainfall.
   dark: 0..1 darkens the scene (glows matter more). */
G.PALETTES = {
  shore: {
    water: '#1d4ed8', shallow: '#3b82f6', sand: '#e8d8a8', grass: '#7cbb5f',
    grassDark: '#5a9e49', tallGrass: '#6db054', path: '#cfb98a', board: '#a9805a',
    stoneFloor: '#9aa3b2', caveFloor: '#6b7280', doorway: '#3a3f4d',
    rock: '#8a8f9c', cliff: '#737a8a', stoneWall: '#7d8597', caveWall: '#4b5263',
    void: '#0b1426', dark: 0, sky: '#0f172a',
  },
  dunes: {
    water: '#2563eb', shallow: '#60a5fa', sand: '#f0d9a0', grass: '#c9c27a',
    grassDark: '#b0a960', tallGrass: '#bfb56e', path: '#dec488', board: '#b08a60',
    stoneFloor: '#b3a98f', caveFloor: '#857c66', doorway: '#3a3f4d',
    rock: '#c2a878', cliff: '#a88d5f', stoneWall: '#9c9176', caveWall: '#5d5644',
    void: '#0b1426', dark: 0, sky: '#13203a',
  },
  forest: {
    water: '#1e40af', shallow: '#3b82f6', sand: '#d8c894', grass: '#4f9e44',
    grassDark: '#3c8136', tallGrass: '#458f3c', path: '#c2a878', board: '#9a7350',
    stoneFloor: '#94a0ad', caveFloor: '#5d6472', doorway: '#2c3242',
    rock: '#76829a', cliff: '#5f6a82', stoneWall: '#6f7a91', caveWall: '#414a5e',
    void: '#091020', dark: 0.08, sky: '#0c1326',
  },
  strait: {
    water: '#16308a', shallow: '#2a4ab0', sand: '#b7b09a', grass: '#5c8a5a',
    grassDark: '#477246', tallGrass: '#517e4f', path: '#a39a82', board: '#84684e',
    stoneFloor: '#8b94a6', caveFloor: '#555d6e', doorway: '#272d3d',
    rock: '#6e7890', cliff: '#586278', stoneWall: '#66708a', caveWall: '#3a4257',
    void: '#070d1d', dark: 0.22, sky: '#0a1020', weather: 'rain',
  },
  cave: {
    water: '#102a6e', shallow: '#1c3c8f', sand: '#8d8470', grass: '#4a6e52',
    grassDark: '#3a5a42', tallGrass: '#41624a', path: '#6e6657', board: '#6e5640',
    stoneFloor: '#5e6470', caveFloor: '#4a4f5e', doorway: '#1d2230',
    rock: '#565d70', cliff: '#454c61', stoneWall: '#525a70', caveWall: '#303749',
    void: '#05080f', dark: 0.45, sky: '#05080f',
  },
  spires: {
    water: '#2b2a72', shallow: '#46449b', sand: '#cdb6a0', grass: '#6f8a78',
    grassDark: '#59755f', tallGrass: '#637e69', path: '#b39a90', board: '#8d6a5e',
    stoneFloor: '#9b93b5', caveFloor: '#665f80', doorway: '#2c2742',
    rock: '#7a719c', cliff: '#615a83', stoneWall: '#736b96', caveWall: '#3e3960',
    void: '#0a0820', dark: 0.25, sky: '#120f2e',
  },
  beacon: {
    water: '#10245e', shallow: '#1d3a85', sand: '#bda98c', grass: '#4f7a5c',
    grassDark: '#3e644a', tallGrass: '#466e52', path: '#a8916e', board: '#8a6a4c',
    stoneFloor: '#848da0', caveFloor: '#4e556a', doorway: '#232a3e',
    rock: '#646f8c', cliff: '#505a76', stoneWall: '#5d6884', caveWall: '#343c54',
    void: '#04070f', dark: 0.4, sky: '#04070f', weather: 'rain',
  },
};

})();
