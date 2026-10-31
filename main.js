import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ============================================================================
// 1. PROCEDURAL WEB AUDIO SYNTHESIZER (Chimes, Switch Clicks & Other Side Drone)
// ============================================================================
class DioramaAudio {
  constructor() {
    this.ctx = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.isMuted = false;

    // Pentatonic-inflected scale frequencies for A-Z so every letter sounds musical
    this.scaleBase = [
      261.63, 293.66, 329.63, 392.00, 440.00,
      523.25, 587.33, 659.25, 783.99, 880.00,
      1046.50, 1174.66, 1318.51
    ];
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.setupDrone();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setupDrone() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.0001, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc1.type = "sawtooth";
    this.droneOsc2.type = "triangle";
    this.droneOsc1.frequency.setValueAtTime(55, now); // A1 sub
    this.droneOsc2.frequency.setValueAtTime(82.41, now); // E2 fifth

    this.droneOsc1.connect(filter);
    this.droneOsc2.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);

    this.droneOsc1.start();
    this.droneOsc2.start();
  }

  playBulbChime(letterIndex, turningOn = true, upsideDownFactor = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = this.scaleBase[letterIndex % this.scaleBase.length];
    const octaveShift = letterIndex >= 13 ? 1.25 : 1.0;
    // Slight detune in the Other Side
    const detune = upsideDownFactor * (Math.sin(letterIndex * 3.7) * 18 - 12);
    const freq = (turningOn ? baseFreq * octaveShift : baseFreq * 0.75) + detune;

    // Warm bell tone + harmonic overtone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = upsideDownFactor > 0.5 ? "sawtooth" : "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.0, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(upsideDownFactor > 0.5 ? 1100 : 2400, now);

    const peakGain = turningOn ? 0.13 : 0.055;
    const duration = turningOn ? 0.65 : 0.22;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.25, now);

    osc1.connect(filter);
    osc2.connect(subGain);
    subGain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.04);
    osc2.stop(now + duration + 0.04);
  }

  setDimensionAudio(targetUpsideDown) {
    const ctx = this.ensureContext();
    if (!ctx || !this.droneGain) return;
    const now = ctx.currentTime;

    // Subtle atmospheric swell during shift
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = "sine";
    shimmerOsc.frequency.setValueAtTime(targetUpsideDown ? 190 : 110, now);
    shimmerOsc.frequency.exponentialRampToValueAtTime(targetUpsideDown ? 72 : 293.66, now + 1.4);

    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.07, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmerOsc.start(now);
    shimmerOsc.stop(now + 1.55);

    this.droneGain.gain.cancelScheduledValues(now);
    this.droneGain.gain.setValueAtTime(Math.max(0.0001, this.droneGain.gain.value), now);
    this.droneGain.gain.exponentialRampToValueAtTime(targetUpsideDown ? 0.045 : 0.0001, now + 1.8);
  }
}

// ============================================================================
// 2. PROCEDURAL TEXTURE GENERATORS
// ============================================================================
function createWallpaperTexture(letterPositionsUV) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm 1980s yellowed cream base
  ctx.fillStyle = "#d9c7a3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle vertical vintage stripes & tiny floral motif
  const stripeW = 48;
  for (let x = 0; x < canvas.width; x += stripeW) {
    ctx.fillStyle = x % (stripeW * 2) === 0 ? "rgba(176, 146, 102, 0.22)" : "rgba(235, 220, 190, 0.16)";
    ctx.fillRect(x, 0, stripeW * 0.55, canvas.height);

    // Pinstripe
    ctx.fillStyle = "rgba(138, 106, 70, 0.18)";
    ctx.fillRect(x + stripeW * 0.72, 0, 2, canvas.height);

    // Tiny vintage floral diamond dots
    for (let y = 24; y < canvas.height; y += 64) {
      const cx = x + stripeW * 0.27;
      const cy = y + ((x / stripeW) % 2) * 32;
      ctx.fillStyle = "rgba(155, 92, 68, 0.22)";
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(110, 128, 88, 0.22)";
      ctx.fillRect(cx - 7, cy - 1, 4, 2);
      ctx.fillRect(cx + 3, cy - 1, 4, 2);
    }
  }

  // Aged vignette & water-stain patina
  const grad = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.45,
    120,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.65
  );
  grad.addColorStop(0, "rgba(255, 245, 220, 0)");
  grad.addColorStop(1, "rgba(78, 56, 36, 0.34)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hand-painted Alphabet Letters (A-Z) beneath each bulb position
  if (letterPositionsUV && letterPositionsUV.length > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    letterPositionsUV.forEach((item, idx) => {
      const px = item.u * canvas.width;
      const py = (1 - item.v) * canvas.height;

      ctx.save();
      ctx.translate(px, py);
      // Slight hand-painted imperfection in angle and scale
      const angle = Math.sin(idx * 2.3) * 0.09;
      const scaleX = 0.94 + Math.cos(idx * 1.7) * 0.08;
      const scaleY = 0.95 + Math.sin(idx * 3.1) * 0.08;
      ctx.rotate(angle);
      ctx.scale(scaleX, scaleY);

      // Dry-brush shadow / paint bleed
      ctx.font = "900 72px 'Courier New', Georgia, serif";
      ctx.fillStyle = "rgba(20, 16, 14, 0.22)";
      ctx.fillText(item.char, 2, 4);

      // Main dark charcoal hand-brushed stroke
      ctx.font = "bold 70px 'Trebuchet MS', 'Segoe UI', sans-serif";
      ctx.fillStyle = "#1d1916";
      ctx.fillText(item.char, 0, 0);

      // Subtle bristle streak effect
      ctx.strokeStyle = "#15110f";
      ctx.lineWidth = 2.2;
      ctx.strokeText(item.char, -0.8, 0.8);

      // Occasional tiny paint drip on a few letters for authenticity
      if (idx % 4 === 1) {
        ctx.fillStyle = "rgba(26, 20, 18, 0.72)";
        ctx.beginPath();
        ctx.ellipse(4, 28, 2.1, 7 + (idx % 3) * 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createWoodTexture(baseHex = "#3b2314", streakHex = "#241309") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = streakHex;
    ctx.globalAlpha = 0.06 + (i % 5) * 0.03;
    const y = (i * 19) % 512;
    const h = 2 + (i % 7) * 2;
    ctx.fillRect(0, y, 512, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createRugTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Warm rust/ochre woven base
  ctx.fillStyle = "#7c3224";
  ctx.fillRect(0, 0, 512, 512);

  // Concentric vintage geometric borders
  const borders = [
    { inset: 22, color: "#d6a85a", width: 12 },
    { inset: 44, color: "#2b3945", width: 16 },
    { inset: 72, color: "#b85d38", width: 8 }
  ];
  borders.forEach((b) => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width;
    ctx.strokeRect(b.inset, b.inset, 512 - b.inset * 2, 512 - b.inset * 2);
  });

  // Center medallion diamonds
  ctx.fillStyle = "#d9b26f";
  for (let r = 0; r < 3; r++) {
    const cx = 256;
    const cy = 148 + r * 108;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 38);
    ctx.lineTo(cx + 52, cy);
    ctx.lineTo(cx, cy + 38);
    ctx.lineTo(cx - 52, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2b3945";
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9b26f";
  }

  // Subtle woven noise
  ctx.fillStyle = "rgba(25, 15, 10, 0.14)";
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 512, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloralFabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Faded 1970s/80s mustard-beige upholstery
  ctx.fillStyle = "#8c6d46";
  ctx.fillRect(0, 0, 256, 256);

  const colors = ["#b85d3b", "#d49b4b", "#52694c", "#c9b18c"];
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      const ox = x + ((y / 32) % 2) * 14;
      ctx.fillStyle = colors[(x + y) % colors.length];
      ctx.beginPath();
      ctx.arc(ox, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#483522";
      ctx.beginPath();
      ctx.arc(ox, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

// ============================================================================
// 3. MAIN SCENE SETUP & MINIATURE ARCHITECTURE
// ============================================================================
const canvasEl = document.getElementById("diorama-canvas");
const loaderEl = document.getElementById("loader");
const readoutTextEl = document.getElementById("readout-text");
const hintBannerEl = document.getElementById("hint-banner");
const btnDemo = document.getElementById("btn-demo");
const btnClear = document.getElementById("btn-clear");
const btnDimension = document.getElementById("btn-dimension");
const dimensionLabel = document.getElementById("dimension-label");
const dimensionIcon = document.getElementById("dimension-icon");
const holdIndicator = document.getElementById("hold-indicator");
const holdRingFg = document.getElementById("hold-ring-fg");

const audio = new DioramaAudio();

const renderer = new THREE.WebGLRenderer({
  canvas: canvasEl,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x160f0b, 0.042);

const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(4.2, 4.1, 8.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.35, -0.2);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4.6;
controls.maxDistance = 12.2;
controls.minPolarAngle = Math.PI * 0.16;
controls.maxPolarAngle = Math.PI * 0.475; // Never goes below the plinth
controls.minAzimuthAngle = -Math.PI * 0.36; // Prevents clipping behind walls
controls.maxAzimuthAngle = Math.PI * 0.42;

// Master diorama group so it can gently breathe/float
const dioramaGroup = new THREE.Group();
scene.add(dioramaGroup);

// Shared textures
const darkWoodTex = createWoodTexture("#2f1a0f", "#1a0d06");
const warmWoodTex = createWoodTexture("#6e4326", "#472813");
const floorWoodTex = createWoodTexture("#59371f", "#382010");
floorWoodTex.repeat.set(4, 4);

// ============================================================================
// 4. COLLECTIBLE WOODEN PLINTH BASE & ROOM SHELL
// ============================================================================
function buildPlinthAndShell() {
  const plinthMat = new THREE.MeshStandardMaterial({
    map: darkWoodTex,
    roughness: 0.38,
    metalness: 0.08
  });

  // Tiered round dark-wood collector base
  const baseBottom = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.55, 0.26, 64), plinthMat);
  baseBottom.position.y = -0.38;
  baseBottom.receiveShadow = true;
  dioramaGroup.add(baseBottom);

  const baseBevel = new THREE.Mesh(new THREE.CylinderGeometry(4.05, 4.32, 0.18, 64), plinthMat);
  baseBevel.position.y = -0.18;
  baseBevel.receiveShadow = true;
  dioramaGroup.add(baseBevel);

  const baseTop = new THREE.Mesh(new THREE.CylinderGeometry(4.02, 4.05, 0.12, 64), plinthMat);
  baseTop.position.y = -0.05;
  baseTop.receiveShadow = true;
  dioramaGroup.add(baseTop);

  // Brass collector plate on the front rim of the plinth
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a84f,
    roughness: 0.28,
    metalness: 0.85
  });
  const plaqueMesh = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.16, 0.04, 2, 0.02), brassMat);
  plaqueMesh.position.set(0, -0.22, 4.26);
  plaqueMesh.rotation.x = -0.18;
  dioramaGroup.add(plaqueMesh);

  // Hardwood living room floor slab (cutaway diorama square with rounded corners)
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorWoodTex,
    roughness: 0.62,
    metalness: 0.05
  });
  const floorMesh = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.16, 4.7, 4, 0.06), floorMat);
  floorMesh.position.set(0, 0.06, 0.05);
  floorMesh.receiveShadow = true;
  floorMesh.castShadow = true;
  dioramaGroup.add(floorMesh);

  // Exterior cutaway wall casing (warm dark museum charcoal-brown)
  const casingMat = new THREE.MeshStandardMaterial({
    color: 0x261c16,
    roughness: 0.7
  });

  // Back wall outer structural thickness
  const backWallOuter = new THREE.Mesh(new RoundedBoxGeometry(5.62, 3.25, 0.18, 3, 0.04), casingMat);
  backWallOuter.position.set(0, 1.68, -2.24);
  backWallOuter.castShadow = true;
  backWallOuter.receiveShadow = true;
  dioramaGroup.add(backWallOuter);

  // Left wall outer structural thickness
  const leftWallOuter = new THREE.Mesh(new RoundedBoxGeometry(0.18, 3.25, 4.72, 3, 0.04), casingMat);
  leftWallOuter.position.set(-2.72, 1.68, 0.05);
  leftWallOuter.castShadow = true;
  leftWallOuter.receiveShadow = true;
  dioramaGroup.add(leftWallOuter);

  // Wood wainscoting & baseboards
  const trimMat = new THREE.MeshStandardMaterial({
    map: warmWoodTex,
    roughness: 0.55
  });

  const backBaseboard = new THREE.Mesh(new THREE.BoxGeometry(5.42, 0.22, 0.04), trimMat);
  backBaseboard.position.set(0.06, 0.25, -2.12);
  backBaseboard.receiveShadow = true;
  dioramaGroup.add(backBaseboard);

  const leftBaseboard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 4.52), trimMat);
  leftBaseboard.position.set(-2.6, 0.25, 0.12);
  leftBaseboard.receiveShadow = true;
  dioramaGroup.add(leftBaseboard);

  // Top crown molding
  const backCrown = new THREE.Mesh(new THREE.BoxGeometry(5.48, 0.1, 0.06), trimMat);
  backCrown.position.set(0.05, 3.24, -2.12);
  dioramaGroup.add(backCrown);

  const leftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 4.58), trimMat);
  leftCrown.position.set(-2.6, 3.24, 0.12);
  dioramaGroup.add(leftCrown);
}

buildPlinthAndShell();

// ============================================================================
// 5. HERO FEATURE: THE ALPHABET WALL & STRING LIGHTS (A - Z)
// ============================================================================
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const ROWS = [
  { chars: "ABCDEFGH".split(""), yBase: 2.66, sag: 0.13, xStart: -1.78, xEnd: 1.92 },
  { chars: "IJKLMNOPQ".split(""), yBase: 2.13, sag: 0.15, xStart: -1.88, xEnd: 1.98 },
  { chars: "RSTUVWXYZ".split(""), yBase: 1.60, sag: 0.13, xStart: -1.80, xEnd: 1.90 }
];

// Classic multi-colored C7 vintage bulb tints (warm nostalgic glass)
const BULB_PALETTE = [
  0xffb84d, // Warm Amber
  0xff5e4d, // Vintage Red-Orange
  0x4cd98c, // Emerald Green
  0x5ca8ff, // Classic Cobalt Blue
  0xffe066  // Warm Yellow-White
];

const letterNodes = []; // Holds all 26 interactive letter/bulb states
const interactiveHitMeshes = [];
const letterUVs = [];

// Wall surface dimensions for UV mapping
const WALL_WIDTH = 5.42;
const WALL_HEIGHT = 3.08;
const WALL_CENTER_X = 0.08;
const WALL_CENTER_Y = 1.72;
const WALL_Z = -2.135;

// Precompute positions of all 26 bulbs and their painted letters underneath
ROWS.forEach((row, rIdx) => {
  const count = row.chars.length;
  row.chars.forEach((char, cIdx) => {
    const t = count === 1 ? 0.5 : cIdx / (count - 1);
    const x = THREE.MathUtils.lerp(row.xStart, row.xEnd, t);
    // Natural catenary sag + tiny organic jitter
    const catenary = -Math.sin(t * Math.PI) * row.sag;
    const jitterY = Math.sin(cIdx * 2.7 + rIdx * 1.9) * 0.015;
    const bulbY = row.yBase + catenary + jitterY;
    const letterY = bulbY - 0.19; // Painted letter sits right below each bulb

    const u = (x - (WALL_CENTER_X - WALL_WIDTH / 2)) / WALL_WIDTH;
    const v = (letterY - (WALL_CENTER_Y - WALL_HEIGHT / 2)) / WALL_HEIGHT;

    letterUVs.push({
      char,
      u,
      v,
      x,
      bulbY,
      letterY,
      rowIndex: rIdx,
      colIndex: cIdx
    });
  });
});

// Create high-res procedural wallpaper with all 26 hand-painted letters baked in
const wallpaperTex = createWallpaperTexture(letterUVs);
const sideWallpaperTex = createWallpaperTexture([]); // Left wall uses same wallpaper without letters

const wallpaperMat = new THREE.MeshStandardMaterial({
  map: wallpaperTex,
  roughness: 0.86,
  metalness: 0.02
});

const sideWallpaperMat = new THREE.MeshStandardMaterial({
  map: sideWallpaperTex,
  roughness: 0.86,
  metalness: 0.02
});

const backWallFace = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT), wallpaperMat);
backWallFace.position.set(WALL_CENTER_X, WALL_CENTER_Y, WALL_Z);
backWallFace.receiveShadow = true;
dioramaGroup.add(backWallFace);

const leftWallFace = new THREE.Mesh(new THREE.PlaneGeometry(4.52, WALL_HEIGHT), sideWallpaperMat);
leftWallFace.rotation.y = Math.PI / 2;
leftWallFace.position.set(-2.615, WALL_CENTER_Y, 0.12);
leftWallFace.receiveShadow = true;
dioramaGroup.add(leftWallFace);

// Create draped dark-green twisted cord across the 3 rows
const wireMat = new THREE.MeshStandardMaterial({
  color: 0x16291c,
  roughness: 0.65
});

ROWS.forEach((row, rIdx) => {
  const curvePoints = [];
  // Anchor nail on left
  curvePoints.push(new THREE.Vector3(row.xStart - 0.25, row.yBase + 0.05, WALL_Z + 0.02));
  const rowItems = letterUVs.filter((item) => item.rowIndex === rIdx);
  rowItems.forEach((item) => {
    curvePoints.push(new THREE.Vector3(item.x, item.bulbY + 0.055, WALL_Z + 0.032));
  });
  // Anchor nail on right
  curvePoints.push(new THREE.Vector3(row.xEnd + 0.25, row.yBase + 0.04, WALL_Z + 0.02));

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const wireGeo = new THREE.TubeGeometry(curve, 52, 0.011, 6, false);
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  wireMesh.castShadow = true;
  dioramaGroup.add(wireMesh);
});

// Shared geometries for sockets, C7 bulbs, and soft wall glow halos
const socketGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.042, 10);
const socketMat = new THREE.MeshStandardMaterial({ color: 0x1a2e20, roughness: 0.55 });

const bulbGlassGeo = new THREE.SphereGeometry(0.036, 14, 12);
bulbGlassGeo.scale(0.82, 1.38, 0.82); // Classic elongated C7 Christmas bulb profile

// Radial soft glow sprite texture for lit bulbs on the wallpaper
function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, "rgba(255, 250, 225, 1)");
  g.addColorStop(0.35, "rgba(255, 210, 130, 0.58)");
  g.addColorStop(1, "rgba(255, 180, 80, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const glowSpriteTex = createGlowTexture();
const glowPlaneGeo = new THREE.PlaneGeometry(0.46, 0.46);
const hitBoxGeo = new THREE.BoxGeometry(0.34, 0.42, 0.22);
const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });

// Single moveable PointLight that jumps to the most recently activated bulb for real 3D specular bounce
const activeBulbLight = new THREE.PointLight(0xffcb6b, 0, 2.6, 1.8);
dioramaGroup.add(activeBulbLight);

letterUVs.forEach((info, index) => {
  const baseColorHex = BULB_PALETTE[index % BULB_PALETTE.length];
  const warmColor = new THREE.Color(baseColorHex);
  const coldColor = new THREE.Color(0x7be0ff);

  const bulbGroup = new THREE.Group();
  bulbGroup.position.set(info.x, info.bulbY + 0.03, WALL_Z + 0.036);
  // Slight natural dangle rotation
  bulbGroup.rotation.z = Math.sin(index * 1.9) * 0.14;
  bulbGroup.rotation.x = 0.12;
  dioramaGroup.add(bulbGroup);

  const socketMesh = new THREE.Mesh(socketGeo, socketMat);
  bulbGroup.add(socketMesh);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: warmColor,
    emissive: warmColor,
    emissiveIntensity: 0.35,
    roughness: 0.18,
    metalness: 0.05
  });

  const bulbMesh = new THREE.Mesh(bulbGlassGeo, bulbMat);
  bulbMesh.position.y = -0.044;
  bulbGroup.add(bulbMesh);

  // Wall bounce glow halo right behind the bulb & painted letter
  const haloMat = new THREE.MeshBasicMaterial({
    map: glowSpriteTex,
    color: warmColor,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const haloMesh = new THREE.Mesh(glowPlaneGeo, haloMat);
  haloMesh.position.set(info.x, info.bulbY - 0.05, WALL_Z + 0.008);
  dioramaGroup.add(haloMesh);

  // Invisible generous touch/click target covering both bulb and painted letter
  const hitMesh = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitMesh.position.set(info.x, info.bulbY - 0.08, WALL_Z + 0.06);
  hitMesh.userData = { letterIndex: index, char: info.char };
  dioramaGroup.add(hitMesh);
  interactiveHitMeshes.push(hitMesh);

  letterNodes.push({
    index,
    char: info.char,
    isLit: false,
    pulseEnergy: 0, // Surges to 1 when tapped
    warmColor,
    coldColor,
    bulbMat,
    bulbMesh,
    haloMat,
    haloMesh,
    worldPos: new THREE.Vector3(info.x, info.bulbY, WALL_Z + 0.14)
  });
});

// ============================================================================
// 6. 1980s LIVING ROOM FURNITURE & PROPS
// ============================================================================
let crtStaticCtx = null;
let crtStaticTex = null;
let lampShadeMat = null;
let crtScreenMat = null;

function buildLivingRoomProps() {
  // 1. Patterned Vintage Area Rug
  const rugTex = createRugTexture();
  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTex,
    roughness: 0.92
  });
  const rugMesh = new THREE.Mesh(new RoundedBoxGeometry(3.45, 0.025, 2.35, 2, 0.01), rugMat);
  rugMesh.position.set(0.15, 0.145, 0.25);
  rugMesh.receiveShadow = true;
  dioramaGroup.add(rugMesh);

  // 2. Faded Floral Sofa (positioned below the alphabet wall)
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(0.15, 0.14, -1.42);
  dioramaGroup.add(sofaGroup);

  const sofaMat = new THREE.MeshStandardMaterial({
    map: createFloralFabricTexture(),
    roughness: 0.88
  });

  // Sofa base plinth
  const sofaBase = new THREE.Mesh(new RoundedBoxGeometry(2.55, 0.26, 0.92, 4, 0.06), sofaMat);
  sofaBase.position.y = 0.16;
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofaGroup.add(sofaBase);

  // 3 Seat cushions
  for (let i = -1; i <= 1; i++) {
    const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.18, 0.78, 4, 0.06), sofaMat);
    seatCushion.position.set(i * 0.76, 0.35, 0.04);
    seatCushion.castShadow = true;
    seatCushion.receiveShadow = true;
    sofaGroup.add(seatCushion);

    const backCushion = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.56, 0.24, 4, 0.07), sofaMat);
    backCushion.position.set(i * 0.76, 0.66, -0.32);
    backCushion.rotation.x = -0.08;
    backCushion.castShadow = true;
    backCushion.receiveShadow = true;
    sofaGroup.add(backCushion);
  }

  // Rolled armrests
  [-1.22, 1.22].forEach((ax) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.48, 0.94, 4, 0.09), sofaMat);
    arm.position.set(ax, 0.42, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    sofaGroup.add(arm);
  });

  // Knitted throw blanket draped over right sofa arm
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0xa84232, roughness: 0.9 });
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.36, 0.55, 3, 0.05), blanketMat);
  blanket.position.set(1.21, 0.52, 0.08);
  blanket.rotation.z = -0.12;
  blanket.castShadow = true;
  sofaGroup.add(blanket);

  // 3. Worn Olive-Mustard Armchair (angled on the left)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(-1.68, 0.14, 0.15);
  chairGroup.rotation.y = Math.PI * 0.34;
  dioramaGroup.add(chairGroup);

  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x6d6a3e,
    roughness: 0.85
  });
  const chairBase = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.28, 0.92, 4, 0.06), chairMat);
  chairBase.position.y = 0.18;
  chairBase.castShadow = true;
  chairBase.receiveShadow = true;
  chairGroup.add(chairBase);

  const chairSeat = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.18, 0.76, 4, 0.06), chairMat);
  chairSeat.position.set(0, 0.36, 0.04);
  chairSeat.castShadow = true;
  chairGroup.add(chairSeat);

  const chairBack = new THREE.Mesh(new RoundedBoxGeometry(0.86, 0.62, 0.24, 4, 0.08), chairMat);
  chairBack.position.set(0, 0.68, -0.32);
  chairBack.rotation.x = -0.1;
  chairBack.castShadow = true;
  chairGroup.add(chairBack);

  [-0.42, 0.42].forEach((cx) => {
    const cArm = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.44, 0.9, 4, 0.07), chairMat);
    cArm.position.set(cx, 0.42, 0);
    cArm.castShadow = true;
    chairGroup.add(cArm);
  });

  // 4. Wooden Sideboard Cabinet with Vintage Rotary Phone (against left wall)
  const sideboardGroup = new THREE.Group();
  sideboardGroup.position.set(-2.15, 0.14, -1.25);
  sideboardGroup.rotation.y = Math.PI / 2;
  dioramaGroup.add(sideboardGroup);

  const cabinetMat = new THREE.MeshStandardMaterial({
    map: warmWoodTex,
    roughness: 0.48
  });
  const cabinetBody = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.68, 0.56, 3, 0.03), cabinetMat);
  cabinetBody.position.y = 0.42;
  cabinetBody.castShadow = true;
  cabinetBody.receiveShadow = true;
  sideboardGroup.add(cabinetBody);

  // Rotary Telephone on top of the sideboard
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(0.05, 0.77, 0);
  phoneGroup.rotation.y = 0.25;
  sideboardGroup.add(phoneGroup);

  const phoneMat = new THREE.MeshStandardMaterial({
    color: 0x1c1b18,
    roughness: 0.28,
    metalness: 0.15
  });
  const phoneBase = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.11, 0.22, 3, 0.04), phoneMat);
  phoneBase.position.y = 0.05;
  phoneBase.castShadow = true;
  phoneGroup.add(phoneBase);

  // Rotary dial wheel
  const dialWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.015, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8dec8, roughness: 0.4 })
  );
  dialWheel.position.set(0, 0.105, 0.06);
  dialWheel.rotation.x = 0.45;
  phoneGroup.add(dialWheel);

  // Handset resting on cradle
  const handsetBar = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.045, 0.055, 3, 0.02), phoneMat);
  handsetBar.position.set(0, 0.135, -0.02);
  phoneGroup.add(handsetBar);

  [-0.12, 0.12].forEach((hx) => {
    const earCap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.04, 12), phoneMat);
    earCap.position.set(hx, 0.11, -0.02);
    phoneGroup.add(earCap);
  });

  // 5. Floor Lamp with Warm Glowing Pleated Shade (right of the sofa)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(1.88, 0.14, -1.48);
  dioramaGroup.add(lampGroup);

  const brassPoleMat = new THREE.MeshStandardMaterial({
    color: 0xb58938,
    roughness: 0.35,
    metalness: 0.75
  });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 24), brassPoleMat);
  lampBase.position.y = 0.03;
  lampBase.castShadow = true;
  lampGroup.add(lampBase);

  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 1.82, 12), brassPoleMat);
  lampPole.position.y = 0.94;
  lampPole.castShadow = true;
  lampGroup.add(lampPole);

  lampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf7dca6,
    emissive: 0xff9d3b,
    emissiveIntensity: 0.85,
    roughness: 0.65,
    side: THREE.DoubleSide
  });
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.46, 24, 1, true), lampShadeMat);
  lampShade.position.y = 1.82;
  lampShade.castShadow = true;
  lampGroup.add(lampShade);

  // 6. Boxy 1980s Wood-Cabinet CRT Television with Animated Static
  const tvGroup = new THREE.Group();
  tvGroup.position.set(1.75, 0.14, 0.68);
  tvGroup.rotation.y = -Math.PI * 0.68;
  dioramaGroup.add(tvGroup);

  const tvCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.74, 0.68, 4, 0.04), cabinetMat);
  tvCabinet.position.y = 0.44;
  tvCabinet.castShadow = true;
  tvCabinet.receiveShadow = true;
  tvGroup.add(tvCabinet);

  // Short angled mid-century legs
  [
    [-0.36, -0.22],
    [0.36, -0.22],
    [-0.36, 0.22],
    [0.36, 0.22]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.018, 0.16, 8), cabinetMat);
    leg.position.set(lx, 0.08, lz);
    tvGroup.add(leg);
  });

  // Live procedural static canvas for CRT screen
  const crtCanvas = document.createElement("canvas");
  crtCanvas.width = 128;
  crtCanvas.height = 96;
  crtStaticCtx = crtCanvas.getContext("2d");
  crtStaticTex = new THREE.CanvasTexture(crtCanvas);
  crtStaticTex.colorSpace = THREE.SRGBColorSpace;

  crtScreenMat = new THREE.MeshStandardMaterial({
    map: crtStaticTex,
    emissiveMap: crtStaticTex,
    emissive: new THREE.Color(0x9ad0ff),
    emissiveIntensity: 1.25,
    roughness: 0.15
  });

  const tvScreen = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.52, 0.04, 3, 0.04), crtScreenMat);
  tvScreen.position.set(-0.08, 0.45, 0.33);
  tvGroup.add(tvScreen);

  // VHF/UHF tuning dials on the right of the CRT bezel
  const dialPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.52, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x221d1a, roughness: 0.6 })
  );
  dialPanel.position.set(0.34, 0.45, 0.33);
  tvGroup.add(dialPanel);

  [0.56, 0.42].forEach((dy) => {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: 0xc9b89b, roughness: 0.4 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.34, dy, 0.35);
    tvGroup.add(knob);
  });

  // Rabbit-ear V-antenna on top of the TV
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0xc0c5ce, metalness: 0.85, roughness: 0.2 });
  [-1, 1].forEach((dir) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.62, 6), antennaMat);
    rod.position.set(dir * 0.16, 1.04, 0.05);
    rod.rotation.z = -dir * 0.42;
    tvGroup.add(rod);
  });

  // 7. Low Wood Coffee Table with Board Game / Mug
  const coffeeTable = new THREE.Group();
  coffeeTable.position.set(0.12, 0.14, -0.15);
  dioramaGroup.add(coffeeTable);

  const tableTop = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.06, 0.62, 3, 0.02), cabinetMat);
  tableTop.position.y = 0.34;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  coffeeTable.add(tableTop);

  [
    [-0.48, -0.22],
    [0.48, -0.22],
    [-0.48, 0.22],
    [0.48, 0.22]
  ].forEach(([tx, tz]) => {
    const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.32, 8), cabinetMat);
    tLeg.position.set(tx, 0.16, tz);
    tLeg.castShadow = true;
    coffeeTable.add(tLeg);
  });

  // Ceramic mug & polyhedral adventure dice sheet on coffee table
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.042, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0xd99b38, roughness: 0.3 })
  );
  mug.position.set(-0.28, 0.41, 0.06);
  mug.castShadow = true;
  coffeeTable.add(mug);

  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.01, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xede0c4, roughness: 0.9 })
  );
  sheet.position.set(0.16, 0.375, -0.02);
  sheet.rotation.y = 0.18;
  coffeeTable.add(sheet);

  // 8. Framed Family Photos on the Left Wall
  const frameConfigs = [
    { z: -0.55, y: 2.05, w: 0.52, h: 0.64, matColor: 0x3b526b },
    { z: 0.15, y: 2.22, w: 0.46, h: 0.42, matColor: 0x7d4e38 },
    { z: 0.78, y: 1.85, w: 0.44, h: 0.54, matColor: 0x4e6648 }
  ];

  frameConfigs.forEach((fc) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(-2.59, fc.y, fc.z);
    fGroup.rotation.y = Math.PI / 2;
    dioramaGroup.add(fGroup);

    const frameOuter = new THREE.Mesh(new RoundedBoxGeometry(fc.w, fc.h, 0.035, 2, 0.01), cabinetMat);
    frameOuter.castShadow = true;
    fGroup.add(frameOuter);

    const photoMat = new THREE.MeshStandardMaterial({ color: 0xe6d8be, roughness: 0.7 });
    const passepartout = new THREE.Mesh(new THREE.PlaneGeometry(fc.w - 0.08, fc.h - 0.08), photoMat);
    passepartout.position.z = 0.019;
    fGroup.add(passepartout);

    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(fc.w - 0.16, fc.h - 0.16),
      new THREE.MeshStandardMaterial({ color: fc.matColor, roughness: 0.6 })
    );
    art.position.z = 0.021;
    fGroup.add(art);
  });

  // 9. Scattered Kids' Toys on the Rug (Wooden Blocks, Walkie-Talkie, Toy Car)
  const blockColors = [0xd64535, 0x3b78b8, 0xe6b333];
  const blockCoords = [
    { x: -0.45, z: 0.68, ry: 0.4 },
    { x: -0.32, z: 0.74, ry: 1.1 },
    { x: -0.39, z: 0.59, ry: -0.3 }
  ];
  blockCoords.forEach((b, idx) => {
    const blk = new THREE.Mesh(
      new RoundedBoxGeometry(0.095, 0.095, 0.095, 2, 0.015),
      new THREE.MeshStandardMaterial({ color: blockColors[idx], roughness: 0.5 })
    );
    blk.position.set(b.x, 0.205, b.z);
    blk.rotation.y = b.ry;
    blk.castShadow = true;
    dioramaGroup.add(blk);
  });

  // Retro handheld walkie-talkie on the rug
  const walkieGroup = new THREE.Group();
  walkieGroup.position.set(0.58, 0.18, 0.85);
  walkieGroup.rotation.x = -Math.PI / 2;
  walkieGroup.rotation.z = -0.55;
  dioramaGroup.add(walkieGroup);

  const walkieBody = new THREE.Mesh(
    new RoundedBoxGeometry(0.11, 0.26, 0.06, 2, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.5 })
  );
  walkieBody.castShadow = true;
  walkieGroup.add(walkieBody);

  const walkieAnt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.007, 0.24, 6),
    new THREE.MeshStandardMaterial({ color: 0xc8cdd4, metalness: 0.8 })
  );
  walkieAnt.position.set(0.03, 0.24, 0);
  walkieGroup.add(walkieAnt);
}

buildLivingRoomProps();

// ============================================================================
// 7. LIGHTING & FLOATING DUST MOTES / ASH SPORES
// ============================================================================
const ambientLight = new THREE.HemisphereLight(0xffe2b8, 0x291a12, 0.62);
scene.add(ambientLight);

// Main Floor Lamp Warm PointLight (casts soft contact & furniture shadows)
const lampLight = new THREE.PointLight(0xffa646, 4.4, 9.5, 1.5);
lampLight.position.set(1.88, 1.88, -1.48);
lampLight.castShadow = true;
lampLight.shadow.mapSize.width = 1024;
lampLight.shadow.mapSize.height = 1024;
lampLight.shadow.bias = -0.002;
lampLight.shadow.radius = 3.5;
dioramaGroup.add(lampLight);

// CRT TV Flicker Glow Light
const tvLight = new THREE.PointLight(0x7cbfff, 1.35, 4.5, 1.6);
tvLight.position.set(1.42, 0.62, 0.42);
dioramaGroup.add(tvLight);

// Soft overhead fill for the collectible plinth & alphabet wall readability
const fillSpot = new THREE.SpotLight(0xffdfb0, 2.2, 14, Math.PI * 0.38, 0.65, 1.2);
fillSpot.position.set(-1.5, 5.2, 3.8);
fillSpot.target.position.set(0, 1.4, -1.0);
dioramaGroup.add(fillSpot);
dioramaGroup.add(fillSpot.target);

// Floating Dust Motes (Warm World) / Drifting Spores & Ash (The Other Side)
const PARTICLE_COUNT = 160;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleSeeds = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 4.8;
  particlePositions[i * 3 + 1] = 0.25 + Math.random() * 2.85;
  particlePositions[i * 3 + 2] = -2.0 + Math.random() * 4.0;
  particleSeeds[i] = Math.random() * Math.PI * 2;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

const particleMat = new THREE.PointsMaterial({
  map: glowSpriteTex,
  color: 0xffe4ad,
  size: 0.085,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const dustParticles = new THREE.Points(particleGeo, particleMat);
dioramaGroup.add(dustParticles);

// ============================================================================
// 8. INTERACTIONS: SPELLING WALL, DEMO SEQUENCE & DIMENSION SHIFT
// ============================================================================
const spelledCharacters = [];
let isOtherSide = false;
let otherSideProgress = 0; // Smoothly lerps 0.0 (Warm) <-> 1.0 (Other Side)
let demoIntervalId = null;
let hasInteracted = false;

function dismissHintBanner() {
  if (!hasInteracted) {
    hasInteracted = true;
    hintBannerEl.classList.add("faded");
  }
}

function updateMessageReadout() {
  if (spelledCharacters.length === 0) {
    readoutTextEl.textContent = "—";
    btnClear.disabled = true;
  } else {
    readoutTextEl.textContent = spelledCharacters.join("");
    btnClear.disabled = false;
  }
}

function toggleLetterNode(node, forceState = null) {
  dismissHintBanner();
  const nextState = forceState !== null ? forceState : !node.isLit;
  node.isLit = nextState;
  node.pulseEnergy = 1.0;

  if (nextState) {
    spelledCharacters.push(node.char);
    if (spelledCharacters.length > 18) spelledCharacters.shift();
    activeBulbLight.position.copy(node.worldPos);
  } else {
    const lastIdx = spelledCharacters.lastIndexOf(node.char);
    if (lastIdx !== -1) spelledCharacters.splice(lastIdx, 1);
  }

  audio.playBulbChime(node.index, nextState, otherSideProgress);
  updateMessageReadout();
}

function clearAllLitBulbs() {
  dismissHintBanner();
  if (demoIntervalId) {
    clearInterval(demoIntervalId);
    demoIntervalId = null;
  }
  letterNodes.forEach((n) => {
    n.isLit = false;
    n.pulseEnergy = 0;
  });
  spelledCharacters.length = 0;
  updateMessageReadout();
}

function playDemoPhrase(phrase = "RUN") {
  clearAllLitBulbs();
  const chars = phrase.toUpperCase().split("");
  let step = 0;

  demoIntervalId = setInterval(() => {
    if (step >= chars.length) {
      clearInterval(demoIntervalId);
      demoIntervalId = null;
      return;
    }
    const targetChar = chars[step];
    const node = letterNodes.find((n) => n.char === targetChar);
    if (node) {
      toggleLetterNode(node, true);
    }
    step++;
  }, 520);
}

function toggleOtherSide(forceState = null) {
  dismissHintBanner();
  isOtherSide = forceState !== null ? forceState : !isOtherSide;
  document.body.classList.toggle("other-side", isOtherSide);
  btnDimension.setAttribute("aria-pressed", String(isOtherSide));
  dimensionLabel.textContent = isOtherSide ? "Return Home" : "The Other Side";
  dimensionIcon.textContent = isOtherSide ? "☀" : "☾";
  audio.setDimensionAudio(isOtherSide);
}

btnClear.addEventListener("click", clearAllLitBulbs);
btnDemo.addEventListener("click", () => playDemoPhrase("RUN"));
btnDimension.addEventListener("click", () => toggleOtherSide());

// Keyboard support so desktop users can also type A-Z or Backspace directly
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toUpperCase();
  if (key.length === 1 && key >= "A" && key <= "Z") {
    const idx = key.charCodeAt(0) - 65;
    if (letterNodes[idx]) toggleLetterNode(letterNodes[idx]);
  } else if (e.key === "Escape" || e.key === "Backspace") {
    clearAllLitBulbs();
  }
});

// ============================================================================
// 9. POINTER RAYCASTING & LONG-PRESS HOLD FOR "THE OTHER SIDE"
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

let pointerDownPos = { x: 0, y: 0 };
let pointerDownTime = 0;
let isHoldingBackground = false;
let holdStartTime = 0;
const HOLD_DURATION_MS = 950;

function getHitLetterNode(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(interactiveHitMeshes, false);
  if (hits.length > 0) {
    const idx = hits[0].object.userData.letterIndex;
    return letterNodes[idx];
  }
  return null;
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  pointerDownPos = { x: e.clientX, y: e.clientY };
  pointerDownTime = performance.now();

  const hitNode = getHitLetterNode(e.clientX, e.clientY);
  if (!hitNode) {
    // Start hold-to-shift timer if user presses and holds still
    isHoldingBackground = true;
    holdStartTime = performance.now();
    holdIndicator.style.left = `${e.clientX}px`;
    holdIndicator.style.top = `${e.clientY}px`;
  } else {
    isHoldingBackground = false;
  }
});

renderer.domElement.addEventListener("pointermove", (e) => {
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 10) {
    // User is orbiting the camera, cancel hold gesture
    isHoldingBackground = false;
    holdIndicator.classList.remove("active");
    dismissHintBanner();
  }

  // Hover cursor feedback on desktop
  if (e.pointerType === "mouse" && !e.buttons) {
    const hoverNode = getHitLetterNode(e.clientX, e.clientY);
    renderer.domElement.style.cursor = hoverNode ? "pointer" : "grab";
  }
});

window.addEventListener("pointerup", (e) => {
  const elapsed = performance.now() - pointerDownTime;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const dist = Math.hypot(dx, dy);

  isHoldingBackground = false;
  holdIndicator.classList.remove("active");
  holdRingFg.style.strokeDashoffset = "113.1";

  // Quick tap/click on a bulb or letter
  if (dist < 12 && elapsed < 420) {
    const hitNode = getHitLetterNode(e.clientX, e.clientY);
    if (hitNode) {
      toggleLetterNode(hitNode);
    }
  }
});

// Prevent double-tap zoom on mobile browsers
renderer.domElement.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length > 1) {
      dismissHintBanner();
    }
  },
  { passive: true }
);

// ============================================================================
// 10. ANIMATION LOOP (Twinkle, CRT Static, Dimension Interpolation & Drift)
// ============================================================================
const clock = new THREE.Clock();
let lastStaticFrame = 0;

// Pre-allocated color buffers to avoid per-frame garbage collection
const warmFogColor = new THREE.Color(0x160f0b);
const coldFogColor = new THREE.Color(0x050c14);
const warmLampColor = new THREE.Color(0xffa646);
const coldLampColor = new THREE.Color(0x3f88c5);
const warmSkyColor = new THREE.Color(0xffe2b8);
const coldSkyColor = new THREE.Color(0x284e78);
const warmWallTint = new THREE.Color(0xffffff);
const coldWallTint = new THREE.Color(0x526b82);
const warmParticleColor = new THREE.Color(0xffe4ad);
const coldParticleColor = new THREE.Color(0xb8e6ff);
const tempColor = new THREE.Color();

function updateCRTStatic(elapsed, upsideDownAmt) {
  if (!crtStaticCtx || elapsed - lastStaticFrame < 0.055) return;
  lastStaticFrame = elapsed;

  const w = 128;
  const h = 96;
  const imgData = crtStaticCtx.createImageData(w, h);
  const data = imgData.data;

  // Rolling horizontal sync bar in the Other Side
  const rollY = Math.floor((elapsed * (upsideDownAmt > 0.3 ? 95 : 30)) % h);

  for (let y = 0; y < h; y++) {
    const scanline = y % 2 === 0 ? 0.78 : 1.0;
    const isSyncBar = Math.abs(y - rollY) < (upsideDownAmt > 0.3 ? 10 : 4);

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const noise = Math.random();
      const base = (noise * 175 + (isSyncBar ? 65 : 15)) * scanline;

      // Tint blue-cyan in the Other Side, warm bluish-grey in normal mode
      data[i] = base * (1 - upsideDownAmt * 0.45);
      data[i + 1] = base * (1 - upsideDownAmt * 0.1);
      data[i + 2] = Math.min(255, base * (1.1 + upsideDownAmt * 0.4));
      data[i + 3] = 255;
    }
  }
  crtStaticCtx.putImageData(imgData, 0, 0);
  crtStaticTex.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  // Check long-press hold progress for "The Other Side"
  if (isHoldingBackground) {
    const heldTime = performance.now() - holdStartTime;
    if (heldTime > 160) {
      holdIndicator.classList.add("active");
      const progress = Math.min(1, (heldTime - 160) / (HOLD_DURATION_MS - 160));
      holdRingFg.style.strokeDashoffset = String(113.1 * (1 - progress));
      if (progress >= 1) {
        isHoldingBackground = false;
        holdIndicator.classList.remove("active");
        toggleOtherSide();
      }
    }
  }

  // Smooth ~2 second interpolation for "The Other Side"
  const targetShift = isOtherSide ? 1.0 : 0.0;
  otherSideProgress = THREE.MathUtils.lerp(otherSideProgress, targetShift, dt * 2.2);

  // Interpolate atmosphere, fog, and lighting palette
  scene.fog.color.lerpColors(warmFogColor, coldFogColor, otherSideProgress);
  ambientLight.color.lerpColors(warmSkyColor, coldSkyColor, otherSideProgress);
  wallpaperMat.color.lerpColors(warmWallTint, coldWallTint, otherSideProgress);
  sideWallpaperMat.color.copy(wallpaperMat.color);

  // Lamp flicker (gentle warm breathe vs erratic cold brownout in the Other Side)
  const normalFlicker = 1.0 + Math.sin(elapsed * 3.1) * 0.03 + Math.sin(elapsed * 7.3) * 0.015;
  const eerieFlicker =
    Math.sin(elapsed * 23.0) * Math.cos(elapsed * 13.7) > 0.45
      ? 0.22
      : 0.75 + Math.sin(elapsed * 17.0) * 0.25;
  const combinedFlicker = THREE.MathUtils.lerp(normalFlicker, eerieFlicker, otherSideProgress);

  lampLight.color.lerpColors(warmLampColor, coldLampColor, otherSideProgress);
  lampLight.intensity = THREE.MathUtils.lerp(4.4, 2.5, otherSideProgress) * combinedFlicker;

  if (lampShadeMat) {
    lampShadeMat.emissive.copy(lampLight.color);
    lampShadeMat.emissiveIntensity = 0.85 * combinedFlicker;
  }

  // CRT TV flicker & static intensification
  updateCRTStatic(elapsed, otherSideProgress);
  const tvJitter = 1.0 + Math.sin(elapsed * 19.0) * (0.12 + otherSideProgress * 0.35);
  tvLight.intensity = THREE.MathUtils.lerp(1.35, 2.85, otherSideProgress) * tvJitter;
  if (crtScreenMat) {
    crtScreenMat.emissiveIntensity = THREE.MathUtils.lerp(1.2, 2.2, otherSideProgress) * tvJitter;
  }

  // Update all 26 Christmas bulbs on the Alphabet Wall
  let anyLitCount = 0;
  letterNodes.forEach((node, i) => {
    node.pulseEnergy = Math.max(0, node.pulseEnergy - dt * 1.8);

    // Gentle warm twinkle vs erratic cold surge in the Other Side
    const gentleTwinkle = 0.32 + 0.1 * Math.sin(elapsed * 2.2 + i * 0.9);
    const coldSurge =
      0.18 +
      0.55 * Math.pow(Math.max(0, Math.sin(elapsed * 8.5 + i * 1.73)), 6) +
      (Math.random() < 0.015 * otherSideProgress ? 0.9 : 0);

    const idleGlow = THREE.MathUtils.lerp(gentleTwinkle, coldSurge, otherSideProgress);

    tempColor.lerpColors(node.warmColor, node.coldColor, otherSideProgress);
    node.bulbMat.color.copy(tempColor);
    node.bulbMat.emissive.copy(tempColor);
    node.haloMat.color.copy(tempColor);

    if (node.isLit) {
      anyLitCount++;
      const litFlicker = 1.0 + Math.sin(elapsed * 12 + i) * (0.05 + otherSideProgress * 0.22);
      const boost = (3.4 + node.pulseEnergy * 2.4) * litFlicker;
      node.bulbMat.emissiveIntensity = boost;
      node.haloMat.opacity = Math.min(0.95, 0.68 + node.pulseEnergy * 0.28);
      const s = 1.0 + node.pulseEnergy * 0.22;
      node.bulbMesh.scale.set(0.82 * s, 1.38 * s, 0.82 * s);
    } else {
      node.bulbMat.emissiveIntensity = idleGlow;
      node.haloMat.opacity = idleGlow * 0.28;
      node.bulbMesh.scale.set(0.82, 1.38, 0.82);
    }
  });

  // Dynamic point light from the active spelled bulb
  const targetBulbLightIntensity = anyLitCount > 0 ? 2.4 : 0.0;
  activeBulbLight.intensity = THREE.MathUtils.lerp(activeBulbLight.intensity, targetBulbLightIntensity, dt * 8);
  activeBulbLight.color.lerpColors(warmLampColor, coldParticleColor, otherSideProgress);

  // Update drifting Dust Motes / Other Side Spores
  particleMat.color.lerpColors(warmParticleColor, coldParticleColor, otherSideProgress);
  particleMat.size = THREE.MathUtils.lerp(0.075, 0.115, otherSideProgress);
  particleMat.opacity = THREE.MathUtils.lerp(0.5, 0.82, otherSideProgress);

  const posAttr = particleGeo.getAttribute("position");
  const speedMult = 1.0 + otherSideProgress * 1.8;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const seed = particleSeeds[i];
    let px = posAttr.getX(i) + Math.sin(elapsed * 0.6 + seed) * 0.0018 * speedMult;
    let py = posAttr.getY(i) + (0.0014 + Math.cos(elapsed * 0.4 + seed) * 0.0008) * speedMult;
    let pz = posAttr.getZ(i) + Math.cos(elapsed * 0.5 + seed) * 0.0015 * speedMult;

    if (py > 3.1) py = 0.22;
    if (px > 2.4) px = -2.4;
    if (px < -2.4) px = 2.4;

    posAttr.setXYZ(i, px, py, pz);
  }
  posAttr.needsUpdate = true;

  // Subtle idle diorama float & gentle camera sway when untouched
  dioramaGroup.position.y = Math.sin(elapsed * 0.85) * 0.025;
  dioramaGroup.rotation.y = Math.sin(elapsed * 0.32) * 0.035;

  controls.update();
  renderer.render(scene, camera);
}

// ============================================================================
// 11. RESPONSIVE RESIZE & GENTLE FADE-IN ON READY
// ============================================================================
function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  // Slightly widen FOV on narrow portrait phones (e.g. 320px wide) so the full plinth fits comfortably
  camera.fov = w < 480 ? 44 : 36;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener("resize", handleResize);
handleResize();

// Start render loop and fade out minimal loading overlay
requestAnimationFrame(() => {
  animate();
  setTimeout(() => {
    loaderEl.classList.add("hidden");
  }, 350);
});
