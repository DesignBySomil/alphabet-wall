import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ============================================================================
// 1. WEB AUDIO SYNTHESIZER (Chimes, Sub Drone, Heartbeat Thump & Relief Chord)
// ============================================================================
class DioramaAudio {
  constructor() {
    this.ctx = null;
    this.droneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;

    // Warm nostalgic pentatonic frequencies for A-Z
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
    filter.frequency.setValueAtTime(125, now);

    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc1.type = "sawtooth";
    this.droneOsc2.type = "triangle";
    this.droneOsc1.frequency.setValueAtTime(51.91, now); // Ab1 ominous sub
    this.droneOsc2.frequency.setValueAtTime(77.78, now); // Eb2 fifth

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
    const detune = upsideDownFactor * (Math.sin(letterIndex * 3.7) * 22 - 14);
    const freq = (turningOn ? baseFreq * octaveShift : baseFreq * 0.75) + detune;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = upsideDownFactor > 0.5 ? "sawtooth" : "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.0, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(upsideDownFactor > 0.5 ? 980 : 2300, now);

    const peakGain = turningOn ? 0.13 : 0.05;
    const duration = turningOn ? 0.68 : 0.22;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.24, now);

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

  playHeartbeatThump(intensity = 1.0) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;

    // Dual lub-dub low-frequency pulse
    [0, 0.22].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      const startF = idx === 0 ? 64 : 54;
      osc.frequency.setValueAtTime(startF, now + offset);
      osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.18);

      const amp = (idx === 0 ? 0.09 : 0.06) * intensity;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(amp, now + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.21);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.24);
    });
  }

  setDimensionAudio(targetUpsideDown) {
    const ctx = this.ensureContext();
    if (!ctx || !this.droneGain) return;
    const now = ctx.currentTime;

    if (targetUpsideDown) {
      // Descending eerie pitch bend into The Other Side
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(360, now);

      osc.frequency.setValueAtTime(185, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 1.6);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.7);
    } else {
      // Warm major-seventh relief chord when returning home
      const chord = [261.63, 329.63, 392.00, 493.88];
      chord.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, now + i * 0.05);

        gain.gain.setValueAtTime(0.0001, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.04, now + i * 0.05 + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 1.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 1.4);
      });
    }

    this.droneGain.gain.cancelScheduledValues(now);
    this.droneGain.gain.setValueAtTime(Math.max(0.0001, this.droneGain.gain.value), now);
    this.droneGain.gain.exponentialRampToValueAtTime(targetUpsideDown ? 0.055 : 0.0001, now + 1.8);
  }
}

// ============================================================================
// 2. PROCEDURAL CANVAS TEXTURE GENERATORS (Wallpaper, Wood, Sofa, Rug, Art)
// ============================================================================
function createWallpaperTexture(letterPositionsUV) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Muted 1980s warm parchment-ochre base
  ctx.fillStyle = "#d2be96";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper fiber grain
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(110, 82, 48, 0.04)" : "rgba(255, 244, 220, 0.04)";
    const rx = (i * 73) % canvas.width;
    const ry = (i * 41) % canvas.height;
    ctx.fillRect(rx, ry, 18, 2);
  }

  // Alternating vintage stripes & muted botanical floral sprigs
  const stripeW = 64;
  for (let x = 0; x < canvas.width; x += stripeW) {
    ctx.fillStyle = "rgba(162, 132, 88, 0.24)";
    ctx.fillRect(x, 0, stripeW * 0.46, canvas.height);

    // Fine double-pinstripe
    ctx.fillStyle = "rgba(128, 96, 62, 0.22)";
    ctx.fillRect(x + stripeW * 0.62, 0, 2, canvas.height);
    ctx.fillRect(x + stripeW * 0.72, 0, 1.5, canvas.height);

    // Muted 1980s country floral motif along each column
    for (let y = 28; y < canvas.height; y += 76) {
      const cx = x + stripeW * 0.23;
      const cy = y + ((x / stripeW) % 2) * 38;

      // Stem & sage leaves
      ctx.strokeStyle = "rgba(92, 112, 74, 0.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14);
      ctx.quadraticCurveTo(cx + 4, cy, cx, cy - 10);
      ctx.stroke();

      ctx.fillStyle = "rgba(96, 118, 78, 0.34)";
      ctx.beginPath();
      ctx.ellipse(cx - 6, cy + 4, 5, 2.5, -0.4, 0, Math.PI * 2);
      ctx.ellipse(cx + 6, cy + 2, 5, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // 5-petal muted dusty-rose / rust blossom
      const petalColor = ((x + y) / 4) % 2 === 0 ? "rgba(164, 86, 64, 0.36)" : "rgba(184, 128, 62, 0.36)";
      ctx.fillStyle = petalColor;
      for (let p = 0; p < 5; p++) {
        const ang = (p * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * 4.5, cy - 4 + Math.sin(ang) * 4.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Blossom center
      ctx.fillStyle = "rgba(218, 182, 108, 0.48)";
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Warm aged corner patina vignette
  const grad = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.42,
    140,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.64
  );
  grad.addColorStop(0, "rgba(255, 242, 215, 0)");
  grad.addColorStop(1, "rgba(62, 42, 24, 0.42)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hand-Painted Alphabet Letters (A-Z) with serif-ish brush strokes, baseline wobble & paint drips
  if (letterPositionsUV && letterPositionsUV.length > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    letterPositionsUV.forEach((item, idx) => {
      const px = item.u * canvas.width;
      const py = (1 - item.v) * canvas.height;

      ctx.save();
      // Slight hand-lettered baseline & horizontal jitter
      const wobbleX = Math.sin(idx * 4.1) * 4;
      const wobbleY = Math.cos(idx * 2.9) * 6;
      ctx.translate(px + wobbleX, py + wobbleY);

      const angle = Math.sin(idx * 2.3) * 0.11 + (idx % 3 === 0 ? -0.04 : 0.03);
      const scaleX = 0.92 + Math.cos(idx * 1.7) * 0.11;
      const scaleY = 0.94 + Math.sin(idx * 3.1) * 0.12;
      ctx.rotate(angle);
      ctx.scale(scaleX, scaleY);

      const fontSize = 82 + (idx % 4) * 4;
      const fontSpec = `900 ${fontSize}px Georgia, "Times New Roman", serif`;
      ctx.font = fontSpec;

      // Subtle pigment halo / soak into wallpaper
      ctx.fillStyle = "rgba(22, 17, 14, 0.18)";
      ctx.fillText(item.char, 2.5, 3.5);

      // Multi-pass offset strokes to mimic a loaded house-paint brush
      ctx.fillStyle = "#171311";
      ctx.fillText(item.char, 0, 0);
      ctx.fillText(item.char, -1.2, 0.8);

      ctx.strokeStyle = "#120e0c";
      ctx.lineWidth = 2.6;
      ctx.strokeText(item.char, 0.6, -0.6);

      // Dry-brush bristle streaks at letter bottom
      ctx.fillStyle = "rgba(24, 19, 16, 0.78)";
      for (let b = -2; b <= 2; b++) {
        ctx.fillRect(b * 4, 20 + Math.abs(b) * 2, 1.6, 6 + ((idx + b) % 4) * 2);
      }

      // Authentic paint drips on select letters (A, E, H, L, Q, R, U, Y)
      if (idx % 3 === 0 || item.char === "R" || item.char === "U" || item.char === "N") {
        const dripX = ((idx % 5) - 2) * 5;
        const dripLen = 14 + (idx % 4) * 7;
        ctx.fillStyle = "rgba(20, 15, 13, 0.85)";
        ctx.beginPath();
        ctx.fillRect(dripX - 1.1, 22, 2.2, dripLen);
        ctx.arc(dripX, 22 + dripLen, 2.4, 0, Math.PI * 2);
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

// Peeling / discolored water-damage & mold overlay that fades in during The Other Side
function createDecayOverlayTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 512, 256);

  // Dark creeping damp stains from top & bottom edges
  const topGrad = ctx.createLinearGradient(0, 0, 0, 120);
  topGrad.addColorStop(0, "rgba(8, 16, 24, 0.88)");
  topGrad.addColorStop(1, "rgba(12, 22, 32, 0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, 512, 120);

  const botGrad = ctx.createLinearGradient(0, 256, 0, 130);
  botGrad.addColorStop(0, "rgba(6, 12, 18, 0.92)");
  botGrad.addColorStop(1, "rgba(12, 22, 32, 0)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 130, 512, 126);

  // Irregular peeling/blistered blotches & vertical cracks
  for (let i = 0; i < 55; i++) {
    const bx = (i * 89) % 512;
    const by = (i * 53) % 256;
    const rad = 14 + (i % 6) * 9;
    const g = ctx.createRadialGradient(bx, by, 2, bx, by, rad);
    g.addColorStop(0, "rgba(5, 10, 16, 0.65)");
    g.addColorStop(0.6, "rgba(18, 32, 42, 0.35)");
    g.addColorStop(1, "rgba(10, 20, 28, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWoodTexture(baseHex = "#3b2314", streakHex = "#221107", knotHex = "#180b04") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  // Organic wood grain cathedral waves
  for (let i = 0; i < 220; i++) {
    ctx.strokeStyle = i % 3 === 0 ? knotHex : streakHex;
    ctx.globalAlpha = 0.06 + (i % 5) * 0.032;
    ctx.lineWidth = 1 + (i % 4);
    const y = (i * 13) % 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + Math.sin(i) * 14, 340, y - Math.cos(i) * 14, 512, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

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

  // Rich woven burgundy-terracotta base
  ctx.fillStyle = "#6e2b1f";
  ctx.fillRect(0, 0, 512, 512);

  // Multi-band Anatolian / 1980s living room rug border
  const borders = [
    { inset: 18, color: "#cfa258", width: 10 },
    { inset: 34, color: "#263642", width: 18 },
    { inset: 56, color: "#b55a35", width: 10 },
    { inset: 70, color: "#d9b471", width: 4 }
  ];
  borders.forEach((b) => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = b.width;
    ctx.strokeRect(b.inset, b.inset, 512 - b.inset * 2, 512 - b.inset * 2);
  });

  // Repeating geometric border ticks
  ctx.fillStyle = "#e3c588";
  for (let i = 40; i < 472; i += 24) {
    ctx.fillRect(i, 30, 8, 8);
    ctx.fillRect(i, 474, 8, 8);
    ctx.fillRect(30, i, 8, 8);
    ctx.fillRect(474, i, 8, 8);
  }

  // Central medallions
  for (let r = 0; r < 3; r++) {
    const cx = 256;
    const cy = 148 + r * 108;
    ctx.fillStyle = "#d9b26f";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 42);
    ctx.lineTo(cx + 58, cy);
    ctx.lineTo(cx, cy + 42);
    ctx.lineTo(cx - 58, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#263642";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24);
    ctx.lineTo(cx + 32, cy);
    ctx.lineTo(cx, cy + 24);
    ctx.lineTo(cx - 32, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#b55a35";
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Woven cross-stitch texture
  ctx.fillStyle = "rgba(20, 12, 8, 0.16)";
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 512, 1.5);
  }
  for (let x = 0; x < 512; x += 6) {
    ctx.fillRect(x, 0, 1.5, 512);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSofaStripedFabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Warm oatmeal-mustard 1980s upholstery base
  ctx.fillStyle = "#8f6f48";
  ctx.fillRect(0, 0, 256, 256);

  // Classic 80s rust, ochre, dark-brown & cream woven stripes
  const stripes = [
    { x: 0, w: 28, c: "#785836" },
    { x: 28, w: 10, c: "#a6482c" },
    { x: 38, w: 8, c: "#d4a862" },
    { x: 46, w: 18, c: "#4d3824" },
    { x: 64, w: 10, c: "#c99b49" },
    { x: 74, w: 32, c: "#876742" },
    { x: 106, w: 12, c: "#5a6b4c" },
    { x: 118, w: 10, c: "#d1b382" }
  ];

  for (let offset = 0; offset < 256; offset += 128) {
    stripes.forEach((s) => {
      ctx.fillStyle = s.c;
      ctx.fillRect(offset + s.x, 0, s.w, 256);
    });
  }

  // Nubby tweed fabric weave slubs
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? "rgba(255, 240, 210, 0.1)" : "rgba(25, 16, 10, 0.14)";
    ctx.fillRect(0, y, 256, 1.5);
  }
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = "rgba(30, 18, 10, 0.1)";
    ctx.fillRect(x, 0, 1.5, 256);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createFramedPictureTexture(variant = 0) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  if (variant === 0) {
    // Autumn pine lake landscape
    const sky = ctx.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, "#5c7d99");
    sky.addColorStop(1, "#e3b478");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 128, 72);

    // Distant mountains
    ctx.fillStyle = "#485266";
    ctx.beginPath();
    ctx.moveTo(0, 72);
    ctx.lineTo(38, 38);
    ctx.lineTo(78, 62);
    ctx.lineTo(106, 42);
    ctx.lineTo(128, 72);
    ctx.fill();

    // Lake & pine silhouettes
    ctx.fillStyle = "#39566e";
    ctx.fillRect(0, 72, 128, 56);
    ctx.fillStyle = "#243829";
    for (let tx = 12; tx < 120; tx += 22) {
      ctx.beginPath();
      ctx.moveTo(tx, 46);
      ctx.lineTo(tx + 9, 78);
      ctx.lineTo(tx - 9, 78);
      ctx.fill();
    }
  } else if (variant === 1) {
    // Warm family portrait silhouette
    ctx.fillStyle = "#8a5a3c";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#e0b882";
    ctx.beginPath();
    ctx.arc(46, 48, 14, 0, Math.PI * 2);
    ctx.arc(82, 52, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334d5c";
    ctx.fillRect(28, 66, 36, 48);
    ctx.fillStyle = "#a34635";
    ctx.fillRect(66, 70, 32, 44);
  } else {
    // Botanical pressed fern illustration
    ctx.fillStyle = "#dfd1b4";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#3d5939";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 110);
    ctx.quadraticCurveTo(60, 64, 68, 20);
    ctx.stroke();
    ctx.fillStyle = "#486b43";
    for (let y = 30; y < 98; y += 12) {
      ctx.beginPath();
      ctx.ellipse(52, y, 11, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(76, y + 4, 11, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// 3. MAIN SCENE SETUP & MINIATURE CAMERA FRAMING
// ============================================================================
const canvasEl = document.getElementById("diorama-canvas");
const loaderEl = document.getElementById("loader");
const readoutTextEl = document.getElementById("readout-text");
const hintBannerEl = document.getElementById("hint-banner");
const btnDemo = document.getElementById("btn-demo");
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
renderer.toneMappingExposure = 0.98;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x120c08, 0.044);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 65);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.05, 1.38, -0.35);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 4.4;
controls.maxDistance = 15.5;
controls.minPolarAngle = Math.PI * 0.16;
controls.maxPolarAngle = Math.PI * 0.475; // Never dips below the room floor
controls.minAzimuthAngle = -Math.PI * 0.36; // Prevents clipping behind walls
controls.maxAzimuthAngle = Math.PI * 0.42;

// Master diorama group
const dioramaGroup = new THREE.Group();
scene.add(dioramaGroup);

// Shared wood textures
const darkWoodTex = createWoodTexture("#2d180d", "#180b05", "#110703");
const warmWoodTex = createWoodTexture("#693e22", "#432511", "#2b1608");
const floorWoodTex = createWoodTexture("#52321b", "#331c0d", "#211107");
floorWoodTex.repeat.set(4, 4);

// ============================================================================
// 4. ROOM SHELL & WAINSCOTING
// ============================================================================
function buildRoomShell() {

  // Hardwood floor slab
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

  // Exterior cutaway wall casing
  const casingMat = new THREE.MeshStandardMaterial({
    color: 0x221813,
    roughness: 0.72
  });

  const backWallOuter = new THREE.Mesh(new RoundedBoxGeometry(5.62, 3.25, 0.18, 3, 0.04), casingMat);
  backWallOuter.position.set(0, 1.68, -2.24);
  backWallOuter.castShadow = true;
  backWallOuter.receiveShadow = true;
  dioramaGroup.add(backWallOuter);

  const leftWallOuter = new THREE.Mesh(new RoundedBoxGeometry(0.18, 3.25, 4.72, 3, 0.04), casingMat);
  leftWallOuter.position.set(-2.72, 1.68, 0.05);
  leftWallOuter.castShadow = true;
  leftWallOuter.receiveShadow = true;
  dioramaGroup.add(leftWallOuter);

  // Wood Wainscoting (lower wall paneling + chair rail + baseboards + crown molding)
  const trimMat = new THREE.MeshStandardMaterial({
    map: warmWoodTex,
    roughness: 0.52
  });

  // Back wall wainscot panel & chair rail (up to y = 0.92)
  const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(5.42, 0.78, 0.03), trimMat);
  backWainscot.position.set(0.06, 0.53, -2.125);
  backWainscot.receiveShadow = true;
  dioramaGroup.add(backWainscot);

  const backChairRail = new THREE.Mesh(new THREE.BoxGeometry(5.44, 0.06, 0.055), trimMat);
  backChairRail.position.set(0.06, 0.93, -2.115);
  backChairRail.receiveShadow = true;
  dioramaGroup.add(backChairRail);

  // Left wall wainscot panel & chair rail
  const leftWainscot = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.78, 4.52), trimMat);
  leftWainscot.position.set(-2.605, 0.53, 0.12);
  leftWainscot.receiveShadow = true;
  dioramaGroup.add(leftWainscot);

  const leftChairRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 4.54), trimMat);
  leftChairRail.position.set(-2.595, 0.93, 0.12);
  leftChairRail.receiveShadow = true;
  dioramaGroup.add(leftChairRail);

  // Recessed wainscot stiles for authentic miniature detail
  for (let wx = -2.2; wx <= 2.4; wx += 0.65) {
    const stile = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.68, 0.042), trimMat);
    stile.position.set(wx, 0.53, -2.12);
    dioramaGroup.add(stile);
  }
  for (let wz = -1.8; wz <= 2.1; wz += 0.65) {
    const stileL = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.68, 0.05), trimMat);
    stileL.position.set(-2.6, 0.53, wz);
    dioramaGroup.add(stileL);
  }

  // Top crown molding
  const backCrown = new THREE.Mesh(new THREE.BoxGeometry(5.48, 0.1, 0.06), trimMat);
  backCrown.position.set(0.05, 3.24, -2.12);
  dioramaGroup.add(backCrown);

  const leftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 4.58), trimMat);
  leftCrown.position.set(-2.6, 3.24, 0.12);
  dioramaGroup.add(leftCrown);
}

buildRoomShell();

// ============================================================================
// 5. HERO FEATURE: THE ALPHABET WALL & STRING LIGHTS (A - Z)
// ============================================================================
const ROWS = [
  { chars: "ABCDEFGH".split(""), yBase: 2.72, sag: 0.14, xStart: -1.82, xEnd: 1.94 },
  { chars: "IJKLMNOPQ".split(""), yBase: 2.15, sag: 0.16, xStart: -1.92, xEnd: 2.02 },
  { chars: "RSTUVWXYZ".split(""), yBase: 1.58, sag: 0.14, xStart: -1.84, xEnd: 1.92 }
];

// Saturated vintage C9 Christmas bulb palette
const BULB_PALETTE = [
  0xffaa2b, // Rich Amber-Orange
  0xff4738, // Vintage Ruby Red
  0x38d97a, // Emerald Green
  0x479dff, // Cobalt Blue
  0xffe052  // Warm Sun Yellow
];

const letterNodes = [];
const interactiveHitMeshes = [];
const letterUVs = [];

const WALL_WIDTH = 5.42;
const WALL_HEIGHT = 3.08;
const WALL_CENTER_X = 0.08;
const WALL_CENTER_Y = 1.72;
const WALL_Z = -2.135;

ROWS.forEach((row, rIdx) => {
  const count = row.chars.length;
  row.chars.forEach((char, cIdx) => {
    const t = count === 1 ? 0.5 : cIdx / (count - 1);
    const x = THREE.MathUtils.lerp(row.xStart, row.xEnd, t);
    // Natural catenary sag + slight uneven hand-hung droop
    const catenary = -Math.sin(t * Math.PI) * row.sag;
    const unevenDroop = Math.sin(cIdx * 2.4 + rIdx * 1.7) * 0.024 + Math.cos(cIdx * 1.3) * 0.012;
    const bulbY = row.yBase + catenary + unevenDroop;
    const letterY = bulbY - 0.21;

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

const wallpaperTex = createWallpaperTexture(letterUVs);
const sideWallpaperTex = createWallpaperTexture([]);
const decayOverlayTex = createDecayOverlayTexture();

const wallpaperMat = new THREE.MeshStandardMaterial({
  map: wallpaperTex,
  roughness: 0.88,
  metalness: 0.02
});

const sideWallpaperMat = new THREE.MeshStandardMaterial({
  map: sideWallpaperTex,
  roughness: 0.88,
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

// Peeling/discolored decay overlay planes for The Other Side
const decayWallMat = new THREE.MeshBasicMaterial({
  map: decayOverlayTex,
  transparent: true,
  opacity: 0,
  depthWrite: false
});
const backDecayPlane = new THREE.Mesh(new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT), decayWallMat);
backDecayPlane.position.set(WALL_CENTER_X, WALL_CENTER_Y, WALL_Z + 0.003);
dioramaGroup.add(backDecayPlane);

const leftDecayPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.52, WALL_HEIGHT), decayWallMat);
leftDecayPlane.rotation.y = Math.PI / 2;
leftDecayPlane.position.set(-2.612, WALL_CENTER_Y, 0.12);
dioramaGroup.add(leftDecayPlane);

// Draped dark-green twisted cord with small wall nails & loose end loops
const wireMat = new THREE.MeshStandardMaterial({
  color: 0x15281b,
  roughness: 0.62
});

ROWS.forEach((row, rIdx) => {
  const curvePoints = [];
  curvePoints.push(new THREE.Vector3(row.xStart - 0.28, row.yBase + 0.06, WALL_Z + 0.018));
  const rowItems = letterUVs.filter((item) => item.rowIndex === rIdx);
  rowItems.forEach((item, idx) => {
    const zJitter = (idx % 2 === 0 ? 0.036 : 0.028);
    curvePoints.push(new THREE.Vector3(item.x, item.bulbY + 0.064, WALL_Z + zJitter));
  });
  curvePoints.push(new THREE.Vector3(row.xEnd + 0.28, row.yBase + 0.05, WALL_Z + 0.018));

  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const wireGeo = new THREE.TubeGeometry(curve, 64, 0.012, 7, false);
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  wireMesh.castShadow = true;
  dioramaGroup.add(wireMesh);
});

// Bigger, rounder C9-style vintage bulbs with ribbed socket & brass collar
const socketGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.048, 12);
const socketMat = new THREE.MeshStandardMaterial({ color: 0x1a3021, roughness: 0.5 });
const collarGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.014, 12);
const collarMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.35, metalness: 0.75 });

const bulbGlassGeo = new THREE.SphereGeometry(0.048, 16, 14);
bulbGlassGeo.scale(0.95, 1.24, 0.95); // Plump, rounder vintage C9 bulb shape

function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, "rgba(255, 250, 230, 1)");
  g.addColorStop(0.32, "rgba(255, 205, 120, 0.68)");
  g.addColorStop(0.7, "rgba(255, 160, 60, 0.22)");
  g.addColorStop(1, "rgba(255, 140, 40, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const glowSpriteTex = createGlowTexture();
const glowPlaneGeo = new THREE.PlaneGeometry(0.56, 0.56);
const hitBoxGeo = new THREE.BoxGeometry(0.36, 0.44, 0.24);
const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });

// Moveable PointLight for active spelled bulb + subtle warm ambient string light bounce
const activeBulbLight = new THREE.PointLight(0xffcb6b, 0, 3.2, 1.6);
dioramaGroup.add(activeBulbLight);

const wallStringGlowLight = new THREE.PointLight(0xffad52, 1.35, 4.8, 1.6);
wallStringGlowLight.position.set(0.05, 2.15, -1.55);
dioramaGroup.add(wallStringGlowLight);

letterUVs.forEach((info, index) => {
  const baseColorHex = BULB_PALETTE[index % BULB_PALETTE.length];
  const warmColor = new THREE.Color(baseColorHex);
  const coldColor = new THREE.Color(index % 3 === 0 ? 0x8ae8ff : 0x4ca6ff);

  const bulbGroup = new THREE.Group();
  bulbGroup.position.set(info.x, info.bulbY + 0.036, WALL_Z + 0.038);
  bulbGroup.rotation.z = Math.sin(index * 2.1) * 0.16;
  bulbGroup.rotation.x = 0.14;
  dioramaGroup.add(bulbGroup);

  const socketMesh = new THREE.Mesh(socketGeo, socketMat);
  bulbGroup.add(socketMesh);

  const collarMesh = new THREE.Mesh(collarGeo, collarMat);
  collarMesh.position.y = -0.024;
  bulbGroup.add(collarMesh);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: warmColor,
    emissive: warmColor,
    emissiveIntensity: 0.72,
    roughness: 0.16,
    metalness: 0.04
  });

  const bulbMesh = new THREE.Mesh(bulbGlassGeo, bulbMat);
  bulbMesh.position.y = -0.056;
  bulbGroup.add(bulbMesh);

  // Warm bloom halo on wallpaper behind bulb and letter
  const haloMat = new THREE.MeshBasicMaterial({
    map: glowSpriteTex,
    color: warmColor,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const haloMesh = new THREE.Mesh(glowPlaneGeo, haloMat);
  haloMesh.position.set(info.x, info.bulbY - 0.04, WALL_Z + 0.009);
  dioramaGroup.add(haloMesh);

  // Generous invisible touch/click target
  const hitMesh = new THREE.Mesh(hitBoxGeo, hitBoxMat);
  hitMesh.position.set(info.x, info.bulbY - 0.08, WALL_Z + 0.06);
  hitMesh.userData = { letterIndex: index, char: info.char };
  dioramaGroup.add(hitMesh);
  interactiveHitMeshes.push(hitMesh);

  letterNodes.push({
    index,
    char: info.char,
    isLit: false,
    pulseEnergy: 0,
    warmColor,
    coldColor,
    bulbMat,
    bulbMesh,
    haloMat,
    haloMesh,
    worldPos: new THREE.Vector3(info.x, info.bulbY, WALL_Z + 0.16)
  });
});

// ============================================================================
// 6. 1980s LIVING ROOM FURNITURE & SELECTIVE ERA PROPS
// ============================================================================
let crtStaticCtx = null;
let crtStaticTex = null;
let floorLampShadeMat = null;
let tableLampShadeMat = null;
let crtScreenMat = null;
const distortableProps = []; // Furniture/frames that subtly tilt/warp in The Other Side

function buildLivingRoomProps() {
  // 1. Detailed Patterned Vintage Area Rug
  const rugMat = new THREE.MeshStandardMaterial({
    map: createRugTexture(),
    roughness: 0.92
  });
  const rugMesh = new THREE.Mesh(new RoundedBoxGeometry(3.5, 0.025, 2.4, 2, 0.01), rugMat);
  rugMesh.position.set(0.15, 0.145, 0.28);
  rugMesh.receiveShadow = true;
  dioramaGroup.add(rugMesh);

  // 2. Striped Woven 1980s Sofa with Throw Blanket & Cushions (below alphabet wall)
  const sofaGroup = new THREE.Group();
  sofaGroup.position.set(0.12, 0.14, -1.42);
  dioramaGroup.add(sofaGroup);

  const sofaMat = new THREE.MeshStandardMaterial({
    map: createSofaStripedFabricTexture(),
    roughness: 0.86
  });

  const sofaBase = new THREE.Mesh(new RoundedBoxGeometry(2.56, 0.26, 0.92, 4, 0.06), sofaMat);
  sofaBase.position.y = 0.16;
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofaGroup.add(sofaBase);

  for (let i = -1; i <= 1; i++) {
    const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.18, 0.78, 4, 0.06), sofaMat);
    seatCushion.position.set(i * 0.76, 0.35, 0.04);
    seatCushion.castShadow = true;
    seatCushion.receiveShadow = true;
    sofaGroup.add(seatCushion);

    const backCushion = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.54, 0.24, 4, 0.07), sofaMat);
    backCushion.position.set(i * 0.76, 0.65, -0.32);
    backCushion.rotation.x = -0.08;
    backCushion.castShadow = true;
    backCushion.receiveShadow = true;
    sofaGroup.add(backCushion);
  }

  [-1.22, 1.22].forEach((ax) => {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.48, 0.94, 4, 0.09), sofaMat);
    arm.position.set(ax, 0.42, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    sofaGroup.add(arm);
  });

  // Knitted throw blanket draped over right sofa back/arm
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x9e3b2b, roughness: 0.9 });
  const blanket = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.38, 0.58, 3, 0.05), blanketMat);
  blanket.position.set(1.18, 0.54, 0.06);
  blanket.rotation.z = -0.14;
  blanket.castShadow = true;
  sofaGroup.add(blanket);

  // Two decorative throw pillows on the sofa
  const pillow1 = new THREE.Mesh(
    new RoundedBoxGeometry(0.34, 0.32, 0.14, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xc98a38, roughness: 0.85 })
  );
  pillow1.position.set(-0.88, 0.56, -0.08);
  pillow1.rotation.set(-0.15, 0.35, -0.2);
  pillow1.castShadow = true;
  sofaGroup.add(pillow1);

  const pillow2 = new THREE.Mesh(
    new RoundedBoxGeometry(0.32, 0.3, 0.14, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x3f6152, roughness: 0.85 })
  );
  pillow2.position.set(0.84, 0.55, -0.06);
  pillow2.rotation.set(-0.12, -0.4, 0.18);
  pillow2.castShadow = true;
  sofaGroup.add(pillow2);

  // 3. Worn Corduroy Armchair (left side)
  const chairGroup = new THREE.Group();
  chairGroup.position.set(-1.68, 0.14, 0.25);
  chairGroup.rotation.y = Math.PI * 0.32;
  dioramaGroup.add(chairGroup);

  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x6b663b,
    roughness: 0.86
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

  // 4. Wooden Sideboard Cabinet with Rotary Phone AND Shaded Table Lamp (left wall)
  const sideboardGroup = new THREE.Group();
  sideboardGroup.position.set(-2.15, 0.14, -1.18);
  sideboardGroup.rotation.y = Math.PI / 2;
  dioramaGroup.add(sideboardGroup);

  const cabinetMat = new THREE.MeshStandardMaterial({
    map: warmWoodTex,
    roughness: 0.46
  });
  const cabinetBody = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.68, 0.56, 3, 0.03), cabinetMat);
  cabinetBody.position.y = 0.42;
  cabinetBody.castShadow = true;
  cabinetBody.receiveShadow = true;
  sideboardGroup.add(cabinetBody);

  // Rotary Telephone on the back end of the sideboard
  const phoneGroup = new THREE.Group();
  phoneGroup.position.set(-0.28, 0.77, 0.02);
  phoneGroup.rotation.y = 0.28;
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

  const dialWheel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.015, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8dec8, roughness: 0.4 })
  );
  dialWheel.position.set(0, 0.105, 0.06);
  dialWheel.rotation.x = 0.45;
  phoneGroup.add(dialWheel);

  const handsetBar = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.045, 0.055, 3, 0.02), phoneMat);
  handsetBar.position.set(0, 0.135, -0.02);
  phoneGroup.add(handsetBar);

  [-0.12, 0.12].forEach((hx) => {
    const earCap = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.04, 12), phoneMat);
    earCap.position.set(hx, 0.11, -0.02);
    phoneGroup.add(earCap);
  });

  // Ceramic Shaded Table Lamp on the front end of the sideboard (far left of alphabet wall)
  const tableLampGroup = new THREE.Group();
  tableLampGroup.position.set(0.32, 0.76, 0);
  sideboardGroup.add(tableLampGroup);

  const ceramicBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0x9c5a34, roughness: 0.35 })
  );
  ceramicBase.scale.set(1, 1.35, 1);
  ceramicBase.position.y = 0.15;
  ceramicBase.castShadow = true;
  tableLampGroup.add(ceramicBase);

  tableLampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf5dcb0,
    emissive: 0xff9b38,
    emissiveIntensity: 0.65,
    roughness: 0.7,
    side: THREE.DoubleSide
  });
  const tShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.26, 20, 1, true), tableLampShadeMat);
  tShade.position.y = 0.38;
  tableLampGroup.add(tShade);

  // 5. Repositioned Floor Lamp in Front-Left Corner (NEVER blocks any alphabet letter or bulb!)
  const lampGroup = new THREE.Group();
  lampGroup.position.set(-2.12, 0.14, 1.38);
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

  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 1.72, 12), brassPoleMat);
  lampPole.position.y = 0.88;
  lampPole.castShadow = true;
  lampGroup.add(lampPole);

  floorLampShadeMat = new THREE.MeshStandardMaterial({
    color: 0xf7dca6,
    emissive: 0xff9d3b,
    emissiveIntensity: 0.75,
    roughness: 0.65,
    side: THREE.DoubleSide
  });
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.36, 0.44, 24, 1, true), floorLampShadeMat);
  lampShade.position.y = 1.72;
  lampShade.castShadow = true;
  lampGroup.add(lampShade);

  // 6. Boxy 1980s Wood-Cabinet CRT Television with Animated Static, Knobs & Antenna
  const tvGroup = new THREE.Group();
  tvGroup.position.set(1.78, 0.14, 0.72);
  tvGroup.rotation.y = -Math.PI * 0.72;
  dioramaGroup.add(tvGroup);

  const tvCabinet = new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.74, 0.68, 4, 0.04), cabinetMat);
  tvCabinet.position.y = 0.44;
  tvCabinet.castShadow = true;
  tvCabinet.receiveShadow = true;
  tvGroup.add(tvCabinet);

  // Recessed dark bezel around CRT tube
  const bezel = new THREE.Mesh(
    new RoundedBoxGeometry(0.86, 0.62, 0.03, 3, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1a1614, roughness: 0.7 })
  );
  bezel.position.set(0, 0.45, 0.33);
  tvGroup.add(bezel);

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
    emissiveIntensity: 1.05,
    roughness: 0.15
  });

  const tvScreen = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.5, 0.04, 3, 0.04), crtScreenMat);
  tvScreen.position.set(-0.09, 0.45, 0.34);
  tvGroup.add(tvScreen);

  // Silver tuning panel + VHF/UHF rotary knobs + speaker grille slats
  const dialPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.52, 0.035),
    new THREE.MeshStandardMaterial({ color: 0x2c2623, roughness: 0.5 })
  );
  dialPanel.position.set(0.33, 0.45, 0.34);
  tvGroup.add(dialPanel);

  [0.58, 0.44].forEach((dy) => {
    const knob = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.035, 14),
      new THREE.MeshStandardMaterial({ color: 0xd8c8ac, roughness: 0.35, metalness: 0.3 })
    );
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.33, dy, 0.36);
    tvGroup.add(knob);
  });

  const antennaMat = new THREE.MeshStandardMaterial({ color: 0xc4cad4, metalness: 0.85, roughness: 0.2 });
  const antBase = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), phoneMat);
  antBase.position.set(0, 0.81, 0.05);
  tvGroup.add(antBase);

  [-1, 1].forEach((dir) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.64, 6), antennaMat);
    rod.position.set(dir * 0.17, 1.05, 0.05);
    rod.rotation.z = -dir * 0.44;
    tvGroup.add(rod);
  });

  // 7. Low Wood Coffee Table with Board Game Box, Cassettes & Mug
  const coffeeTable = new THREE.Group();
  coffeeTable.position.set(0.14, 0.14, -0.12);
  dioramaGroup.add(coffeeTable);

  const tableTop = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.06, 0.64, 3, 0.02), cabinetMat);
  tableTop.position.y = 0.34;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  coffeeTable.add(tableTop);

  [
    [-0.5, -0.23],
    [0.5, -0.23],
    [-0.5, 0.23],
    [0.5, 0.23]
  ].forEach(([tx, tz]) => {
    const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.32, 8), cabinetMat);
    tLeg.position.set(tx, 0.16, tz);
    tLeg.castShadow = true;
    coffeeTable.add(tLeg);
  });

  // Fantasy Tabletop Adventure Board Game Box on coffee table
  const gameBoxGroup = new THREE.Group();
  gameBoxGroup.position.set(0.18, 0.395, 0.02);
  gameBoxGroup.rotation.y = 0.22;
  coffeeTable.add(gameBoxGroup);

  const gameBox = new THREE.Mesh(
    new RoundedBoxGeometry(0.38, 0.055, 0.28, 2, 0.01),
    new THREE.MeshStandardMaterial({ color: 0x8f241e, roughness: 0.55 })
  );
  gameBox.castShadow = true;
  gameBoxGroup.add(gameBox);

  const gameLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xe6c786, roughness: 0.6 })
  );
  gameLabel.rotation.x = -Math.PI / 2;
  gameLabel.position.y = 0.029;
  gameBoxGroup.add(gameLabel);

  // Stack of 3 1980s Audio Cassettes on coffee table
  const cassetteColors = [0x24282e, 0xd97f2b, 0x2c6485];
  cassetteColors.forEach((cc, idx) => {
    const cas = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.024, 0.09, 2, 0.005),
      new THREE.MeshStandardMaterial({ color: cc, roughness: 0.4 })
    );
    cas.position.set(-0.34 + (idx % 2) * 0.02, 0.382 + idx * 0.025, -0.08 + idx * 0.01);
    cas.rotation.y = -0.35 + idx * 0.28;
    cas.castShadow = true;
    coffeeTable.add(cas);
  });

  // Ceramic mug
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.044, 0.04, 0.09, 12),
    new THREE.MeshStandardMaterial({ color: 0xd99b38, roughness: 0.3 })
  );
  mug.position.set(-0.18, 0.41, 0.14);
  mug.castShadow = true;
  coffeeTable.add(mug);

  // 8. Framed Family Photos with Actual Miniature Paintings on Left Wall
  const frameConfigs = [
    { z: -0.45, y: 2.08, w: 0.54, h: 0.64, variant: 0 },
    { z: 0.22, y: 2.24, w: 0.46, h: 0.44, variant: 1 },
    { z: 0.82, y: 1.86, w: 0.44, h: 0.54, variant: 2 }
  ];

  frameConfigs.forEach((fc, idx) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(-2.59, fc.y, fc.z);
    fGroup.rotation.y = Math.PI / 2;
    dioramaGroup.add(fGroup);

    const frameOuter = new THREE.Mesh(new RoundedBoxGeometry(fc.w, fc.h, 0.035, 2, 0.01), cabinetMat);
    frameOuter.castShadow = true;
    fGroup.add(frameOuter);

    const passepartout = new THREE.Mesh(
      new THREE.PlaneGeometry(fc.w - 0.08, fc.h - 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe6d8be, roughness: 0.7 })
    );
    passepartout.position.z = 0.019;
    fGroup.add(passepartout);

    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(fc.w - 0.15, fc.h - 0.15),
      new THREE.MeshStandardMaterial({
        map: createFramedPictureTexture(fc.variant),
        roughness: 0.65
      })
    );
    art.position.z = 0.021;
    fGroup.add(art);

    distortableProps.push({
      mesh: fGroup,
      baseRotZ: 0,
      targetRotZ: (idx % 2 === 0 ? 1 : -1) * (0.14 + idx * 0.04)
    });
  });

  // 9. Scattered Floor Cushions, Walkie-Talkie & Toy Blocks on the Rug
  const floorCushion = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.11, 0.42, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xb05232, roughness: 0.88 })
  );
  floorCushion.position.set(0.88, 0.2, 0.45);
  floorCushion.rotation.y = 0.42;
  floorCushion.castShadow = true;
  floorCushion.receiveShadow = true;
  dioramaGroup.add(floorCushion);

  const blockColors = [0xd64535, 0x3b78b8, 0xe6b333];
  [
    { x: -0.48, z: 0.72, ry: 0.4 },
    { x: -0.35, z: 0.78, ry: 1.1 },
    { x: -0.42, z: 0.62, ry: -0.3 }
  ].forEach((b, idx) => {
    const blk = new THREE.Mesh(
      new RoundedBoxGeometry(0.09, 0.09, 0.09, 2, 0.015),
      new THREE.MeshStandardMaterial({ color: blockColors[idx], roughness: 0.5 })
    );
    blk.position.set(b.x, 0.2, b.z);
    blk.rotation.y = b.ry;
    blk.castShadow = true;
    dioramaGroup.add(blk);
  });

  const walkieGroup = new THREE.Group();
  walkieGroup.position.set(0.46, 0.18, 0.86);
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

  // Subtle furniture tilt targets for The Other Side
  distortableProps.push(
    { mesh: chairGroup, baseRotZ: 0, targetRotZ: 0.045 },
    { mesh: coffeeTable, baseRotZ: 0, targetRotZ: -0.038 }
  );
}

buildLivingRoomProps();

// ============================================================================
// 7. EERIE "OTHER SIDE" CREEPING VINES / TENDRILS & ROLLING FLOOR FOG
// ============================================================================
const vineMeshes = [];
const vineMat = new THREE.MeshStandardMaterial({
  color: 0x111a21,
  roughness: 0.78,
  metalness: 0.12
});

function buildCreepingTendrils() {
  const vinePaths = [
    // Upper-left corner creeping down across the alphabet wall toward the letters
    [
      [-2.58, 3.18, -2.11],
      [-2.1, 2.95, -2.10],
      [-1.55, 2.68, -2.09],
      [-0.95, 2.38, -2.10],
      [-0.45, 2.02, -2.11]
    ],
    // Secondary branch off upper-left
    [
      [-2.1, 2.95, -2.10],
      [-1.85, 2.35, -2.10],
      [-1.42, 1.88, -2.10],
      [-1.08, 1.45, -2.11]
    ],
    // Upper-right corner creeping down behind letters G/H, P/Q, Y/Z
    [
      [2.65, 3.15, -2.11],
      [2.22, 2.82, -2.10],
      [1.75, 2.48, -2.09],
      [1.25, 2.05, -2.10],
      [0.82, 1.65, -2.11]
    ],
    // Lower-right creeping from behind the sofa onto the hardwood floor & rug
    [
      [1.95, 0.95, -2.10],
      [1.72, 0.35, -1.95],
      [1.52, 0.16, -1.25],
      [1.18, 0.16, -0.45],
      [0.78, 0.165, 0.25]
    ],
    // Left wall creeping down over wainscoting onto floor near armchair
    [
      [-2.58, 2.85, -1.25],
      [-2.58, 1.95, -0.65],
      [-2.58, 0.95, -0.15],
      [-2.42, 0.16, 0.35],
      [-1.85, 0.16, 0.85]
    ],
    // Bottom-left behind sideboard creeping toward coffee table
    [
      [-1.65, 0.16, -1.85],
      [-1.25, 0.16, -1.15],
      [-0.75, 0.165, -0.55],
      [-0.32, 0.165, 0.08]
    ]
  ];

  vinePaths.forEach((pts, idx) => {
    const vectors = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(vectors);
    const radius = idx < 3 ? 0.026 : 0.032;
    const geo = new THREE.TubeGeometry(curve, 32, radius, 6, false);
    const mesh = new THREE.Mesh(geo, vineMat);
    mesh.scale.setScalar(0.001);
    mesh.visible = false;
    mesh.castShadow = true;
    dioramaGroup.add(mesh);
    vineMeshes.push(mesh);
  });
}

buildCreepingTendrils();

// Low rolling ground fog planes for The Other Side
function createFogPatchTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  g.addColorStop(0, "rgba(155, 205, 235, 0.42)");
  g.addColorStop(0.55, "rgba(95, 145, 185, 0.18)");
  g.addColorStop(1, "rgba(50, 90, 125, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const groundFogTex = createFogPatchTexture();
const groundFogLayers = [];

for (let i = 0; i < 3; i++) {
  const fMat = new THREE.MeshBasicMaterial({
    map: groundFogTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const fPlane = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.8), fMat);
  fPlane.rotation.x = -Math.PI / 2;
  fPlane.position.set((i - 1) * 0.35, 0.21 + i * 0.06, 0.15);
  dioramaGroup.add(fPlane);
  groundFogLayers.push({ mesh: fPlane, mat: fMat, speed: 0.22 + i * 0.11, phase: i * 2.1 });
}

// ============================================================================
// 8. LIGHTING & FLOATING DUST MOTES / THICK OTHER-SIDE SPORES
// ============================================================================
// Slightly dimmer room ambient so the Christmas bulbs & lamps are the hero light sources
const ambientLight = new THREE.HemisphereLight(0xffdca8, 0x1e130c, 0.42);
scene.add(ambientLight);

// Floor Lamp Warm PointLight (in front-left corner)
const lampLight = new THREE.PointLight(0xffa13d, 3.4, 8.8, 1.5);
lampLight.position.set(-2.05, 1.78, 1.32);
lampLight.castShadow = true;
lampLight.shadow.mapSize.width = 1024;
lampLight.shadow.mapSize.height = 1024;
lampLight.shadow.bias = -0.002;
lampLight.shadow.radius = 3.5;
dioramaGroup.add(lampLight);

// Table Lamp Warm Accent Light (on left sideboard)
const tableLampLight = new THREE.PointLight(0xff9c38, 1.65, 4.5, 1.6);
tableLampLight.position.set(-1.95, 1.32, -0.86);
dioramaGroup.add(tableLampLight);

// CRT TV Flicker Glow Light
const tvLight = new THREE.PointLight(0x7cbfff, 1.25, 4.2, 1.6);
tvLight.position.set(1.42, 0.62, 0.42);
dioramaGroup.add(tvLight);

// Soft overhead gallery spot for wall readability
const fillSpot = new THREE.SpotLight(0xffdfb0, 1.55, 15, Math.PI * 0.42, 0.7, 1.2);
fillSpot.position.set(1.4, 5.4, 4.2);
fillSpot.target.position.set(0, 1.45, -1.0);
dioramaGroup.add(fillSpot);
dioramaGroup.add(fillSpot.target);

// Floating Dust Motes (Warm World) / Thick Drifting Spores & Ash (The Other Side)
const PARTICLE_COUNT = 260;
const particleGeo = new THREE.BufferGeometry();
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleSeeds = new Float32Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 5.0;
  particlePositions[i * 3 + 1] = 0.22 + Math.random() * 2.95;
  particlePositions[i * 3 + 2] = -2.05 + Math.random() * 4.2;
  particleSeeds[i] = Math.random() * Math.PI * 2;
}
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

const particleMat = new THREE.PointsMaterial({
  map: glowSpriteTex,
  color: 0xffe4ad,
  size: 0.075,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const dustParticles = new THREE.Points(particleGeo, particleMat);
dioramaGroup.add(dustParticles);

// ============================================================================
// 9. INTERACTIONS: SPELLING WALL, DEMO SEQUENCE & DIMENSION SHIFT
// ============================================================================
const spelledCharacters = [];
let isOtherSide = false;
let otherSideProgress = 0;
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
  } else {
    readoutTextEl.textContent = spelledCharacters.join("");
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
  document.documentElement.classList.toggle("other-side", isOtherSide);
  btnDimension.setAttribute("aria-pressed", String(isOtherSide));
  dimensionLabel.textContent = isOtherSide ? "Return Home" : "The Other Side";
  dimensionIcon.textContent = isOtherSide ? "☀" : "☾";
  audio.setDimensionAudio(isOtherSide);
}

btnDemo.addEventListener("click", () => playDemoPhrase("RUN"));
btnDimension.addEventListener("click", () => toggleOtherSide());

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
// 10. POINTER RAYCASTING & LONG-PRESS HOLD FOR "THE OTHER SIDE"
// ============================================================================
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();

let pointerDownPos = { x: 0, y: 0 };
let pointerDownTime = 0;
let isHoldingBackground = false;
let holdStartTime = 0;
const HOLD_DURATION_MS = 950;

function getHitLetterNode(clientX, clientY) {
  // Screen-space nearest-bulb picking: forgiving for finger taps on small phones.
  const rect = renderer.domElement.getBoundingClientRect();
  const maxDist = Math.max(22, Math.min(34, rect.width * 0.07));
  const v = new THREE.Vector3();
  let best = null;
  let bestD = maxDist;
  interactiveHitMeshes.forEach((m) => {
    m.getWorldPosition(v);
    v.project(camera);
    if (v.z > 1) return;
    const sx = rect.left + ((v.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - v.y) / 2) * rect.height;
    const d = Math.hypot(sx - clientX, sy - clientY);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  });
  return best ? letterNodes[best.userData.letterIndex] : null;
}

renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  pointerDownPos = { x: e.clientX, y: e.clientY };
  pointerDownTime = performance.now();

  const hitNode = getHitLetterNode(e.clientX, e.clientY);
  if (!hitNode) {
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
    isHoldingBackground = false;
    holdIndicator.classList.remove("active");
    dismissHintBanner();
  }

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

  if (dist < 12 && elapsed < 420) {
    const hitNode = getHitLetterNode(e.clientX, e.clientY);
    if (hitNode) {
      toggleLetterNode(hitNode);
    }
  }
});

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
// 11. ANIMATION LOOP (Twinkle, Blackouts, Vines, Heartbeat & Camera Breathing)
// ============================================================================
const clock = new THREE.Clock();
let lastStaticFrame = 0;
let lastHeartbeatStep = -1;
let baseCameraFov = 38;

const warmFogColor = new THREE.Color(0x120c08);
const coldFogColor = new THREE.Color(0x0a1624);
const warmLampColor = new THREE.Color(0xffa13d);
const coldLampColor = new THREE.Color(0x2e6ea6);
const warmSkyColor = new THREE.Color(0xffdca8);
const coldSkyColor = new THREE.Color(0x3a6288);
const warmWallTint = new THREE.Color(0xffffff);
const coldWallTint = new THREE.Color(0x6a8aa6);
const warmParticleColor = new THREE.Color(0xffe4ad);
const coldParticleColor = new THREE.Color(0xc2e9ff);
const tempColor = new THREE.Color();

function updateCRTStatic(elapsed, upsideDownAmt) {
  if (!crtStaticCtx || elapsed - lastStaticFrame < 0.055) return;
  lastStaticFrame = elapsed;

  const w = 128;
  const h = 96;
  const imgData = crtStaticCtx.createImageData(w, h);
  const data = imgData.data;

  const rollY = Math.floor((elapsed * (upsideDownAmt > 0.3 ? 105 : 28)) % h);

  for (let y = 0; y < h; y++) {
    const scanline = y % 2 === 0 ? 0.76 : 1.0;
    const isSyncBar = Math.abs(y - rollY) < (upsideDownAmt > 0.3 ? 11 : 4);

    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const noise = Math.random();
      const base = (noise * 170 + (isSyncBar ? 70 : 12)) * scanline;

      data[i] = base * (1 - upsideDownAmt * 0.48);
      data[i + 1] = base * (1 - upsideDownAmt * 0.12);
      data[i + 2] = Math.min(255, base * (1.12 + upsideDownAmt * 0.45));
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

  // Check hold-to-shift progress
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

  // Smooth ~2s interpolation between Warm World (0) and The Other Side (1)
  const targetShift = isOtherSide ? 1.0 : 0.0;
  otherSideProgress = THREE.MathUtils.lerp(otherSideProgress, targetShift, dt * 2.1);

  // Subtle rhythmic heartbeat pulse (~0.85 Hz lub-dub) in The Other Side
  const beatCycle = (elapsed * 0.82) % 1.0;
  const lub = Math.exp(-Math.pow((beatCycle - 0.12) / 0.045, 2));
  const dub = 0.65 * Math.exp(-Math.pow((beatCycle - 0.30) / 0.055, 2));
  const heartbeatPulse = (lub + dub) * otherSideProgress;

  const currentBeatIndex = Math.floor(elapsed * 0.82);
  if (otherSideProgress > 0.65 && currentBeatIndex !== lastHeartbeatStep) {
    lastHeartbeatStep = currentBeatIndex;
    audio.playHeartbeatThump(otherSideProgress);
  }

  // Unsettling subtle camera FOV breathing while in The Other Side
  const fovBreath =
    otherSideProgress * (Math.sin(elapsed * 1.45) * 0.65 + heartbeatPulse * 0.55);
  if (Math.abs(camera.fov - (baseCameraFov + fovBreath)) > 0.01) {
    camera.fov = baseCameraFov + fovBreath;
    camera.updateProjectionMatrix();
  }

  // Atmosphere, wall discoloration & peeling grime overlay
  scene.fog.color.lerpColors(warmFogColor, coldFogColor, otherSideProgress);
  ambientLight.color.lerpColors(warmSkyColor, coldSkyColor, otherSideProgress);
  ambientLight.intensity = THREE.MathUtils.lerp(0.42, 0.78, otherSideProgress);
  wallpaperMat.color.lerpColors(warmWallTint, coldWallTint, otherSideProgress);
  sideWallpaperMat.color.copy(wallpaperMat.color);
  decayWallMat.opacity = otherSideProgress * 0.42;

  // Creeping 3D tendrils/vines growth across walls and floor
  vineMeshes.forEach((vm, idx) => {
    const delayedProgress = THREE.MathUtils.clamp((otherSideProgress - idx * 0.06) / 0.72, 0, 1);
    vm.visible = delayedProgress > 0.01;
    if (vm.visible) {
      const pulseScale = 1.0 + heartbeatPulse * 0.08 * Math.sin(elapsed * 3 + idx);
      vm.scale.set(delayedProgress * pulseScale, delayedProgress, delayedProgress * pulseScale);
    }
  });

  // Subtle furniture & picture frame distortion in The Other Side
  distortableProps.forEach((dp) => {
    dp.mesh.rotation.z = THREE.MathUtils.lerp(dp.baseRotZ, dp.targetRotZ, otherSideProgress);
  });

  // Rolling floor-level fog layers in The Other Side
  groundFogLayers.forEach((layer, idx) => {
    layer.mat.opacity = otherSideProgress * (0.28 + 0.08 * Math.sin(elapsed * 0.9 + layer.phase));
    layer.mesh.position.x = Math.sin(elapsed * layer.speed + layer.phase) * 0.38;
    layer.mesh.position.z = 0.15 + Math.cos(elapsed * layer.speed * 0.8 + idx) * 0.25;
  });

  // Occasional eerie power blackout drops in The Other Side
  const blackoutWave = Math.sin(elapsed * 6.7) * Math.cos(elapsed * 15.3) * Math.sin(elapsed * 2.9);
  const isBlackoutDrop = otherSideProgress > 0.45 && blackoutWave > 0.66;
  const blackoutFactor = isBlackoutDrop ? 0.08 : 1.0;

  // Lamp flicker + heartbeat pulse
  const normalFlicker = 1.0 + Math.sin(elapsed * 3.1) * 0.025 + Math.sin(elapsed * 7.3) * 0.012;
  const eerieFlicker =
    (0.88 + Math.sin(elapsed * 19.0) * 0.2 + heartbeatPulse * 0.35) * blackoutFactor;
  const combinedFlicker = THREE.MathUtils.lerp(normalFlicker, eerieFlicker, otherSideProgress);

  lampLight.color.lerpColors(warmLampColor, coldLampColor, otherSideProgress);
  lampLight.intensity = THREE.MathUtils.lerp(3.4, 3.0, otherSideProgress) * combinedFlicker;
  tableLampLight.color.copy(lampLight.color);
  tableLampLight.intensity = THREE.MathUtils.lerp(1.65, 1.4, otherSideProgress) * combinedFlicker;
  wallStringGlowLight.color.lerpColors(warmLampColor, coldLampColor, otherSideProgress);
  wallStringGlowLight.intensity = THREE.MathUtils.lerp(1.35, 2.2, otherSideProgress) * combinedFlicker;

  if (floorLampShadeMat) {
    floorLampShadeMat.emissive.copy(lampLight.color);
    floorLampShadeMat.emissiveIntensity = 0.75 * combinedFlicker;
  }
  if (tableLampShadeMat) {
    tableLampShadeMat.emissive.copy(lampLight.color);
    tableLampShadeMat.emissiveIntensity = 0.65 * combinedFlicker;
  }

  // CRT TV static & glow
  updateCRTStatic(elapsed, otherSideProgress);
  const tvJitter = 1.0 + Math.sin(elapsed * 19.0) * (0.1 + otherSideProgress * 0.35);
  tvLight.intensity = THREE.MathUtils.lerp(1.25, 2.75, otherSideProgress) * tvJitter;
  if (crtScreenMat) {
    crtScreenMat.emissiveIntensity = THREE.MathUtils.lerp(1.05, 2.25, otherSideProgress) * tvJitter;
  }

  // Update all 26 Christmas bulbs on the Alphabet Wall
  let anyLitCount = 0;
  letterNodes.forEach((node, i) => {
    node.pulseEnergy = Math.max(0, node.pulseEnergy - dt * 1.8);

    // Warm room: rich glowing colored bulbs; Other Side: cold erratic surges & occasional blackouts
    const gentleTwinkle = 0.68 + 0.14 * Math.sin(elapsed * 2.1 + i * 0.85);
    const localBlackout =
      otherSideProgress > 0.5 && Math.sin(elapsed * 14.0 + i * 2.7) > 0.82 ? 0.03 : 1.0;
    const coldSurge =
      (0.5 +
        0.75 * Math.pow(Math.max(0, Math.sin(elapsed * 9.2 + i * 1.67)), 6) +
        heartbeatPulse * 0.35) *
      blackoutFactor *
      localBlackout;

    const idleGlow = THREE.MathUtils.lerp(gentleTwinkle, coldSurge, otherSideProgress);

    tempColor.lerpColors(node.warmColor, node.coldColor, otherSideProgress);
    node.bulbMat.color.copy(tempColor);
    node.bulbMat.emissive.copy(tempColor);
    node.haloMat.color.copy(tempColor);

    if (node.isLit) {
      anyLitCount++;
      const litFlicker =
        (1.0 + Math.sin(elapsed * 12 + i) * (0.05 + otherSideProgress * 0.25)) *
        (isBlackoutDrop ? 0.28 : 1.0);
      const boost = (3.8 + node.pulseEnergy * 2.6) * litFlicker;
      node.bulbMat.emissiveIntensity = boost;
      node.haloMat.opacity = Math.min(0.98, 0.76 + node.pulseEnergy * 0.24);
      const s = 1.0 + node.pulseEnergy * 0.24;
      node.bulbMesh.scale.set(0.95 * s, 1.24 * s, 0.95 * s);
    } else {
      node.bulbMat.emissiveIntensity = idleGlow;
      node.haloMat.opacity = idleGlow * 0.36;
      node.bulbMesh.scale.set(0.95, 1.24, 0.95);
    }
  });

  const targetBulbLightIntensity = anyLitCount > 0 ? 2.6 : 0.0;
  activeBulbLight.intensity = THREE.MathUtils.lerp(activeBulbLight.intensity, targetBulbLightIntensity, dt * 8);
  activeBulbLight.color.lerpColors(warmLampColor, coldParticleColor, otherSideProgress);

  // Drifting Dust Motes vs Thick Ash/Spores in The Other Side
  particleMat.color.lerpColors(warmParticleColor, coldParticleColor, otherSideProgress);
  particleMat.size = THREE.MathUtils.lerp(0.072, 0.135, otherSideProgress);
  particleMat.opacity = THREE.MathUtils.lerp(0.42, 0.88, otherSideProgress);

  const posAttr = particleGeo.getAttribute("position");
  const speedMult = 1.0 + otherSideProgress * 2.1;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const seed = particleSeeds[i];
    let px = posAttr.getX(i) + Math.sin(elapsed * 0.65 + seed) * 0.0019 * speedMult;
    let py = posAttr.getY(i) + (0.0014 + Math.cos(elapsed * 0.45 + seed) * 0.0009) * speedMult;
    let pz = posAttr.getZ(i) + Math.cos(elapsed * 0.55 + seed) * 0.0016 * speedMult;

    if (py > 3.15) py = 0.2;
    if (px > 2.45) px = -2.45;
    if (px < -2.45) px = 2.45;

    posAttr.setXYZ(i, px, py, pz);
  }
  posAttr.needsUpdate = true;

  // Gentle miniature float + subtle unsettling sway in The Other Side
  const swayAmp = 1.0 + otherSideProgress * 0.85;
  dioramaGroup.position.y = Math.sin(elapsed * 0.85) * 0.024 * swayAmp;
  dioramaGroup.rotation.y = Math.sin(elapsed * 0.32) * 0.032 * swayAmp;
  dioramaGroup.rotation.z = otherSideProgress * Math.sin(elapsed * 0.55) * 0.015;

  controls.update();
  renderer.render(scene, camera);
}

// ============================================================================
// 12. 320px PORTRAIT-SAFE CAMERA FIT (First Layout & Orientation Change Only)
// ============================================================================
let initialFitDone = false;
let lastOrientationIsPortrait = window.innerHeight >= window.innerWidth;

function fitCameraToWall() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = w / Math.max(1, h);

  camera.aspect = aspect;

  // Ensure all 26 letters (A-Z) fit comfortably even at 320px portrait
  baseCameraFov = aspect < 0.75 ? 48 : aspect < 1.0 ? 43 : 36;
  camera.fov = baseCameraFov;
  camera.updateProjectionMatrix();

  const vFovRad = THREE.MathUtils.degToRad(baseCameraFov);
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

  // Required width to fit the full alphabet wall with breathing room on 320px screens
  const requiredWidth = aspect < 0.75 ? 5.5 : 6.75;
  const requiredHeight = 4.65;

  const distH = requiredWidth / 2 / Math.tan(hFovRad / 2);
  const distV = requiredHeight / 2 / Math.tan(vFovRad / 2);
  const distance = Math.max(distH, distV, 7.6);

  // On narrow portrait screens, center the azimuth slightly so neither A/I/R nor H/Q/Z gets clipped
  const azimuth = aspect < 0.85 ? 0.16 : 0.38;
  const elevation = aspect < 0.85 ? 0.30 : 0.33;

  controls.target.set(0.05, 1.38, -0.35);
  camera.position.set(
    controls.target.x + distance * Math.sin(azimuth) * Math.cos(elevation),
    controls.target.y + distance * Math.sin(elevation),
    controls.target.z + distance * Math.cos(azimuth) * Math.cos(elevation)
  );
  controls.update();
}

function handleResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isPortrait = h >= w;

  renderer.setSize(w, h);

  if (!initialFitDone || isPortrait !== lastOrientationIsPortrait) {
    initialFitDone = true;
    lastOrientationIsPortrait = isPortrait;
    fitCameraToWall();
  } else {
    // Preserve user's current orbit position on ordinary window resize
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
}

// Keep the fixed bokeh backdrop covering the visual viewport even when the page
// is pinch-zoomed out (mobile browsers can ignore user-scalable=no), so no bare
// background strips appear around it. The html background matches the backdrop
// gradient's edge colour in each mode as a fallback for older engines.
(function fitBackdropToVisualViewport() {
  const backdropEl = document.getElementById("backdrop");
  const vv = window.visualViewport;
  if (!backdropEl || !vv) return;
  backdropEl.style.right = "auto";
  backdropEl.style.bottom = "auto";
  function fitBackdrop() {
    backdropEl.style.left = -vv.offsetLeft + "px";
    backdropEl.style.top = -vv.offsetTop + "px";
    backdropEl.style.width = vv.width + "px";
    backdropEl.style.height = vv.height + "px";
  }
  vv.addEventListener("resize", fitBackdrop);
  vv.addEventListener("scroll", fitBackdrop);
  fitBackdrop();
})();

window.addEventListener("resize", handleResize);
handleResize();

// Start render loop and fade out minimal loading overlay
requestAnimationFrame(() => {
  animate();
  setTimeout(() => {
    loaderEl.classList.add("hidden");
  }, 350);
});
