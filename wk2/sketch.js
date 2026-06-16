// ── Nebula Generator ──────────────────────────────────────────────────────────
// 4:3 canvas (960x720)
// Uses a seeded pseudo-random number generator (mulberry32) so nebulas look
// fully organic (like the original random version) but are 100% deterministic —
// the same inputs always produce the exact same result.

const NEBULA_W = 960;
const NEBULA_H = 720;

// ── Color Palettes ────────────────────────────────────────────────────────────
const PALETTES = [
  ["#4a0080", "#6a5bcd", "#00bfff", "#00fa9a", "#ffffff"],  // 0 — violet to cyan
  ["#0b1f3a", "#76101e", "#c9374c", "#c2dde4", "#ffffff"],  // 1 — crimson and ice
  ["#0b0d21", "#1e1860", "#6a00ff", "#ff6b35", "#ffffff"],  // 2 — indigo and coral
  ["#062c43", "#054569", "#5591a9", "#9ccddc", "#ffffff"],  // 3 — monochromatic blue
  ["#001a1a", "#003d3d", "#00b4b4", "#ffaa22", "#ffffff"],  // 4 — teal and amber
];

// ── State ─────────────────────────────────────────────────────────────────────
let seedValue;
let currentPalette;
let selectedPaletteIndex = -1;
let nebulaName   = "";
let nebulaCoords = "";

// ── P5 instances ──────────────────────────────────────────────────────────────
let nebulaSketch;
let stars = [];

// ══════════════════════════════════════════════════════════════════════════════
// SEEDED PSEUDO-RANDOM NUMBER GENERATOR (mulberry32)
// Returns a function that produces reproducible random numbers from a seed.
// This replaces p5's random() in the nebula draw so the same seed always
// produces the same sequence of numbers — and therefore the same nebula.
// ══════════════════════════════════════════════════════════════════════════════
function createSeededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// seededRandom() is reset to a fresh generator each time generateNebula() runs
let seededRandom;

// ══════════════════════════════════════════════════════════════════════════════
// STARFIELD P5 INSTANCE
// Animated — runs continuously behind both screens
// ══════════════════════════════════════════════════════════════════════════════
const starfieldSketchFn = function (p) {
  const STAR_COUNT = 260;

  p.setup = function () {
    let cnv = p.createCanvas(window.innerWidth, window.innerHeight);
    cnv.parent("starfield");
    p.noStroke();

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x:      p.random(p.width),
        y:      p.random(p.height),
        size:   p.random(0.5, 2.2),
        speed:  p.random(0.015, 0.06),
        offset: p.random(1000),
        drift:  p.random(-0.03, 0.03),
      });
    }
  };

  p.draw = function () {
    p.background(6, 6, 16);
    for (let s of stars) {
      let twinkle    = p.noise(s.offset + p.frameCount * s.speed);
      let brightness = p.map(twinkle, 0, 1, 60, 255);
      let alpha      = p.map(twinkle, 0, 1, 80, 240);
      p.fill(brightness, brightness, brightness, alpha);
      p.ellipse(s.x, s.y, s.size, s.size);
      s.x += s.drift;
      if (s.x < 0)       s.x = p.width;
      if (s.x > p.width) s.x = 0;
    }
  };

  p.windowResized = function () {
    p.resizeCanvas(window.innerWidth, window.innerHeight);
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// NEBULA P5 INSTANCE
// Static — only redraws when generateNebula() calls redraw()
// ══════════════════════════════════════════════════════════════════════════════
const nebulaSketchFn = function (p) {
  p.setup = function () {
    let cnv = p.createCanvas(NEBULA_W, NEBULA_H);
    cnv.parent("canvas-wrapper");
    p.noLoop();
  };

  p.draw = function () {
    drawNebulaFrame(p);
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// PALETTE CARD UI
// Row 1: RANDOM + palettes 0 and 1
// Row 2: palettes 2, 3, and 4
// ══════════════════════════════════════════════════════════════════════════════
function buildPaletteCards() {
  const container = document.getElementById("palette-cards");

  // Helper — builds a swatch card for a given palette index
  function makeCard(idx) {
    const card = document.createElement("div");
    card.className = "palette-card";
    card.dataset.index = idx;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Color palette " + (idx + 1));
    card.setAttribute("aria-pressed", "false");

    const swatches = document.createElement("div");
    swatches.className = "swatches";

    PALETTES[idx].slice(0, 4).forEach(hex => {
      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = hex;
      swatches.appendChild(swatch);
    });

    card.appendChild(swatches);
    card.addEventListener("click", () => selectPalette(idx, card));
    card.addEventListener("keydown", e => handleCardKey(e, idx, card));
    return card;
  }

  // Row 1: RANDOM + palette 0 + palette 1
  const row1 = document.createElement("div");
  row1.className = "palette-row";

  const randomCard = document.createElement("div");
  randomCard.className = "palette-card random-card active";
  randomCard.dataset.index = "-1";
  randomCard.tabIndex = 0;
  randomCard.setAttribute("role", "button");
  randomCard.setAttribute("aria-label", "Random palette");
  randomCard.setAttribute("aria-pressed", "true");
  randomCard.textContent = "RANDOM";
  randomCard.addEventListener("click", () => selectPalette(-1, randomCard));
  randomCard.addEventListener("keydown", e => handleCardKey(e, -1, randomCard));
  row1.appendChild(randomCard);
  row1.appendChild(makeCard(0));
  row1.appendChild(makeCard(1));
  container.appendChild(row1);

  // Row 2: palette 2 + palette 3 + palette 4
  const row2 = document.createElement("div");
  row2.className = "palette-row";
  row2.appendChild(makeCard(2));
  row2.appendChild(makeCard(3));
  row2.appendChild(makeCard(4));
  container.appendChild(row2);
}

function handleCardKey(e, index, card) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    selectPalette(index, card);
  }
}

function selectPalette(index, clickedCard) {
  selectedPaletteIndex = index;
  document.querySelectorAll(".palette-card").forEach(c => {
    c.classList.remove("active");
    c.setAttribute("aria-pressed", "false");
  });
  clickedCard.classList.add("active");
  clickedCard.setAttribute("aria-pressed", "true");
}

// ══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
function getAndValidateInputs() {
  const lastName = document.getElementById("input-lastname").value.trim();
  const month    = document.getElementById("input-month").value.trim();
  const day      = document.getElementById("input-day").value.trim();
  const year     = document.getElementById("input-year").value.trim();
  const city     = document.getElementById("input-city").value.trim();

  ["err-lastname", "err-month", "err-day", "err-year", "err-city"].forEach(id => {
    document.getElementById(id).textContent = "";
  });

  let valid = true;
  let firstErrorId = null;

  if (!lastName) {
    document.getElementById("err-lastname").textContent = "Required";
    firstErrorId = firstErrorId || "input-lastname";
    valid = false;
  }
  if (!month || isNaN(month) || month < 1 || month > 12) {
    document.getElementById("err-month").textContent = "1–12";
    firstErrorId = firstErrorId || "input-month";
    valid = false;
  }
  if (!day || isNaN(day) || day < 1 || day > 31) {
    document.getElementById("err-day").textContent = "1–31";
    firstErrorId = firstErrorId || "input-day";
    valid = false;
  }
  if (!year || isNaN(year) || year < 1900 || year > 2099) {
    document.getElementById("err-year").textContent = "e.g. 1988";
    firstErrorId = firstErrorId || "input-year";
    valid = false;
  }
  if (!city) {
    document.getElementById("err-city").textContent = "Required";
    firstErrorId = firstErrorId || "input-city";
    valid = false;
  }

  if (!valid) {
    document.getElementById(firstErrorId).focus();
    return null;
  }

  return { lastName, month, day, year, city };
}

// ══════════════════════════════════════════════════════════════════════════════
// IDENTITY GENERATION
// ══════════════════════════════════════════════════════════════════════════════
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildNebulaName(lastName, city) {
  const capitalize = str => str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `${capitalize(lastName)}-${capitalize(city)} Nebula`;
}

function buildCoordinates(month, day, year) {
  const y     = String(year);
  const first = y.slice(0, 2);
  const last  = y.slice(2, 4);
  const mm    = String(month).padStart(2, "0");
  const dd    = String(day).padStart(2, "0");
  return `${last}.${dd}–${first}.${mm}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN TRANSITIONS
// ══════════════════════════════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.remove("active");
    s.style.display = "none";
  });
  const target = document.getElementById(id);
  target.style.display = "";
  setTimeout(() => target.classList.add("active"), 10);
  window.scrollTo(0, 0);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATE
// ══════════════════════════════════════════════════════════════════════════════
function generateNebula() {
  const inputs = getAndValidateInputs();
  if (!inputs) return;

  const { lastName, month, day, year, city } = inputs;

  nebulaName   = buildNebulaName(lastName, city);
  nebulaCoords = buildCoordinates(month, day, year);

  // Derive a single integer seed from all inputs combined
  // This seeds the mulberry32 RNG so the full nebula is deterministic
  const combined = (lastName + month + day + year + city).toUpperCase();
  seedValue = hashString(combined);

  // Palette selection — also deterministic when RANDOM is chosen,
  // reusing the seed we already derived above
  currentPalette = selectedPaletteIndex === -1
    ? PALETTES[seedValue % PALETTES.length]
    : PALETTES[selectedPaletteIndex];

  showScreen("screen-result");
  nebulaSketch.redraw();
}

// ══════════════════════════════════════════════════════════════════════════════
// EDIT / START OVER
// ══════════════════════════════════════════════════════════════════════════════
function goToEdit() {
  showScreen("screen-input");
}

function startOver() {
  ["input-lastname", "input-month", "input-day", "input-year", "input-city"].forEach(id => {
    document.getElementById(id).value = "";
  });
  ["err-lastname", "err-month", "err-day", "err-year", "err-city"].forEach(id => {
    document.getElementById(id).textContent = "";
  });
  selectedPaletteIndex = -1;
  document.querySelectorAll(".palette-card").forEach(c => {
    c.classList.remove("active");
    c.setAttribute("aria-pressed", "false");
  });
  const randomCard = document.querySelector(".random-card");
  randomCard.classList.add("active");
  randomCard.setAttribute("aria-pressed", "true");
  showScreen("screen-input");
}

// ══════════════════════════════════════════════════════════════════════════════
// SAVE
// ══════════════════════════════════════════════════════════════════════════════
function saveNebula() {
  const safeName = nebulaName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  nebulaSketch.saveCanvas("nebula-" + safeName, "png");
}

// ══════════════════════════════════════════════════════════════════════════════
// NEBULA DRAW
// Uses seeded RNG (seededRandom) instead of p5's random() so the result is
// fully deterministic while still looking completely organic.
// ══════════════════════════════════════════════════════════════════════════════
function drawNebulaFrame(p) {
  // Reset the seeded RNG at the start of every draw so the same seed
  // always produces the same sequence
  seededRandom = createSeededRandom(seedValue);

  // Seed p5's Perlin noise too. Without this, noise() is seeded from
  // Math.random() at page load, so the same inputs would produce a
  // DIFFERENT nebula after a reload — breaking the core promise.
  p.noiseSeed(seedValue);

  // Convenience wrappers that mirror p5's random() signature
  const sr  = () => seededRandom();                          // 0–1
  const srR = (lo, hi) => lo + seededRandom() * (hi - lo);  // lo–hi

  p.blendMode(p.BLEND);
  p.background(0);
  p.blendMode(p.ADD);

  // Center — offset within the middle portion of the canvas
  let centerX = NEBULA_W / 2 + srR(-80, 80);
  let centerY = NEBULA_H / 2 + srR(-80, 80);

  // Four cloud layers — original organic approach
  for (let layer = 0; layer < 4; layer++) {
    let col = currentPalette[layer];
    let r   = p.red(p.color(col));
    let g   = p.green(p.color(col));
    let b   = p.blue(p.color(col));

    let layerX = centerX + srR(-120, 120);
    let layerY = centerY + srR(-120, 120);
    let spread = srR(180, 320);

    for (let i = 0; i < 800; i++) {
      let angle    = sr() * p.TWO_PI;
      let noiseVal = p.noise(
        p.cos(angle) * 0.5 + (seedValue % 1000) / 1000 * 999 + layer,
        p.sin(angle) * 0.5 + ((seedValue * 7) % 1000) / 1000 * 999 + layer
      );

      let dist  = noiseVal * spread * srR(0.5, 1.5);
      let x     = layerX + p.cos(angle) * dist;
      let y     = layerY + p.sin(angle) * dist * srR(0.6, 1.0);
      let sz    = p.map(dist, 0, spread, srR(60, 120), srR(10, 40));
      let alpha = srR(3, 12);

      p.fill(r, g, b, alpha);
      p.noStroke();
      p.ellipse(x, y, sz * srR(0.8, 1.4), sz * srR(0.5, 1.2));
    }
  }

  // Bright core
  let coreColor = p.color(currentPalette[0]);
  for (let i = 0; i < 200; i++) {
    let u  = sr();
    let v  = sr();
    let gz = Math.sqrt(-2 * Math.log(u + 0.0001)) * Math.cos(2 * Math.PI * v);
    let gy = Math.sqrt(-2 * Math.log(u + 0.0001)) * Math.sin(2 * Math.PI * v);
    let x  = centerX + gz * 60;
    let y  = centerY + gy * 60;
    let sz = srR(20, 80);
    p.fill(p.red(coreColor), p.green(coreColor), p.blue(coreColor), srR(5, 18));
    p.noStroke();
    p.ellipse(x, y, sz, sz);
  }

  // Stars — scattered across the FULL canvas using seeded random
  p.blendMode(p.BLEND);

  // Background stars — 300 small dim dots across the entire canvas
  for (let i = 0; i < 300; i++) {
    let x          = sr() * NEBULA_W;
    let y          = sr() * NEBULA_H;
    let sz         = srR(0.5, 1.5);
    let brightness = srR(120, 255);
    p.fill(brightness, brightness, brightness, srR(150, 255));
    p.noStroke();
    p.ellipse(x, y, sz, sz);
  }

  // Foreground stars — 40 brighter points with subtle glow, across full canvas
  for (let i = 0; i < 40; i++) {
    let x = sr() * NEBULA_W;
    let y = sr() * NEBULA_H;
    // Glow
    p.fill(255, 255, 255, 20);
    p.noStroke();
    p.ellipse(x, y, srR(6, 14), srR(6, 14));
    // Point
    p.fill(255, 255, 255, 220);
    p.ellipse(x, y, srR(1.5, 3), srR(1.5, 3));
  }

  drawOverlay(p);
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERLAY — corner brackets and identity label
// ══════════════════════════════════════════════════════════════════════════════
function drawOverlay(p) {
  p.blendMode(p.BLEND);

  const margin = 32;
  const bLen   = 120;

  p.stroke(255);
  p.strokeWeight(2.5);
  p.noFill();

  // Top-left
  p.line(margin, margin + bLen, margin, margin);
  p.line(margin, margin, margin + bLen, margin);

  // Top-right
  p.line(NEBULA_W - margin - bLen, margin, NEBULA_W - margin, margin);
  p.line(NEBULA_W - margin, margin, NEBULA_W - margin, margin + bLen);

  // Bottom-left
  p.line(margin, NEBULA_H - margin - bLen, margin, NEBULA_H - margin);
  p.line(margin, NEBULA_H - margin, margin + bLen, NEBULA_H - margin);

  // Bottom-right
  p.line(NEBULA_W - margin - bLen, NEBULA_H - margin, NEBULA_W - margin, NEBULA_H - margin);
  p.line(NEBULA_W - margin, NEBULA_H - margin, NEBULA_W - margin, NEBULA_H - margin - bLen);

  // Nebula name
  p.noStroke();
  p.fill(255);
  p.textFont("monospace");
  p.textSize(22);
  p.textStyle(p.BOLD);
  p.textAlign(p.LEFT, p.TOP);
  p.text(nebulaName, margin + 14, margin + 14);

  // Coordinates
  p.fill(180);
  p.textSize(16);
  p.textStyle(p.NORMAL);
  p.text(nebulaCoords, margin + 14, margin + 44);
}

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
  const input = document.getElementById("screen-input");
  input.style.display = "";
  input.classList.add("active");

  new p5(starfieldSketchFn);
  nebulaSketch = new p5(nebulaSketchFn);
  buildPaletteCards();

  // Enter from any input submits the form
  ["input-lastname", "input-month", "input-day", "input-year", "input-city"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        generateNebula();
      }
    });
  });
});