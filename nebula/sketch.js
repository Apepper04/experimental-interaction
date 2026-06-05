// Nebula Generator
// Each click of Generate produces a unique procedural nebula
// inspired by Hubble Space Telescope imagery

const CANVAS_W = 800;
const CANVAS_H = 800;

// Curated color palettes — each based on real nebula color schemes
// Hubble images use specific gas emission colors:
// Hydrogen = red/pink, Oxygen = blue/teal, Sulfur = orange/gold
const PALETTES = [
  // Orion Nebula — blues, teals, magentas
  ["#0a00ff", "#00ccff", "#cc00ff", "#ff00aa", "#ffffff"],
  // Eagle Nebula — reds, oranges, gold
  ["#ff2200", "#ff6600", "#ffaa00", "#ff0066", "#ffffff"],
  // Crab Nebula — teals, blues, pale gold
  ["#00ffcc", "#0088ff", "#004466", "#ffeeaa", "#ffffff"],
  // Lagoon Nebula — deep magentas, blues, pink
  ["#cc0066", "#6600cc", "#0033cc", "#ff66aa", "#ffffff"],
  // Helix Nebula — teals, blues, reds
  ["#00ccaa", "#0055ff", "#cc2200", "#00ffee", "#ffffff"],
  // Pillars of Creation — amber, teal, deep blue
  ["#ffaa22", "#00bbcc", "#001133", "#ff6600", "#ffffff"],
  // Rosette Nebula — pinks, reds, purples
  ["#ff3366", "#cc0033", "#660099", "#ff99cc", "#ffffff"],
  // Butterfly Nebula — electric blues, whites, cyan
  ["#0011ff", "#00ddff", "#ffffff", "#aaaaff", "#ffffff"],
];

// Perlin noise offsets — randomized each generation
// so every nebula has a different organic shape
let noiseOffsetX;
let noiseOffsetY;
let currentPalette;

function setup() {
  let cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent(document.body);
  
  // Use WEBGL blending for additive glow effect
  // This makes overlapping colors brighten rather than just stack
  blendMode(ADD);
  
  generateNebula();
}

function generateNebula() {
  // Randomize noise offsets for a completely new organic shape
  noiseOffsetX = random(1000);
  noiseOffsetY = random(1000);
  
  // Pick a random palette
  currentPalette = random(PALETTES);
  
  drawNebula();
}

function drawNebula() {
  // Black background — important for additive blending to work correctly
  blendMode(BLEND);
  background(0);
  blendMode(ADD);

  // --- Nebula cloud layers ---
  // We draw multiple passes of soft glowing ellipses
  // Each pass uses a different color from the palette
  // The result is layered, organic-looking gas clouds

  let centerX = CANVAS_W / 2 + random(-80, 80);
  let centerY = CANVAS_H / 2 + random(-80, 80);

  // Draw 4 color layers
  for (let layer = 0; layer < 4; layer++) {
    let col = currentPalette[layer];
    let r = red(color(col));
    let g = green(color(col));
    let b = blue(color(col));

    // Each layer has a slightly different center and spread
    let layerX = centerX + random(-120, 120);
    let layerY = centerY + random(-120, 120);
    let spread = random(180, 320);

    // Draw many small transparent ellipses
    // Their positions are shaped by Perlin noise
    // so they cluster organically rather than randomly
    for (let i = 0; i < 800; i++) {
      // Use noise to create organic clustering
      let angle = random(TWO_PI);
      let noiseVal = noise(
        cos(angle) * 0.5 + noiseOffsetX + layer,
        sin(angle) * 0.5 + noiseOffsetY + layer
      );
      
      // Distance from center is controlled by noise
      let dist = noiseVal * spread * random(0.5, 1.5);
      let x = layerX + cos(angle) * dist;
      let y = layerY + sin(angle) * dist * random(0.6, 1.0);

      // Size varies — larger blobs in center, smaller at edges
      let sz = map(dist, 0, spread, random(60, 120), random(10, 40));
      
      // Very low alpha so hundreds of them build up gradually
      let alpha = random(3, 12);

      fill(r, g, b, alpha);
      noStroke();
      ellipse(x, y, sz * random(0.8, 1.4), sz * random(0.5, 1.2));
    }
  }

  // --- Bright core ---
  // A concentrated bright center where the nebula is densest
  let coreColor = color(currentPalette[0]);
  for (let i = 0; i < 200; i++) {
    let x = centerX + randomGaussian(0, 60);
    let y = centerY + randomGaussian(0, 60);
    let sz = random(20, 80);
    fill(
      red(coreColor),
      green(coreColor),
      blue(coreColor),
      random(5, 18)
    );
    noStroke();
    ellipse(x, y, sz, sz);
  }

  // --- Stars ---
  // Switch back to normal blend mode for stars
  // so they appear as crisp white points over the nebula
  blendMode(BLEND);

  // Background stars — small and dim
  for (let i = 0; i < 300; i++) {
    let x = random(CANVAS_W);
    let y = random(CANVAS_H);
    let sz = random(0.5, 1.5);
    let brightness = random(120, 255);
    fill(brightness, brightness, brightness, random(150, 255));
    noStroke();
    ellipse(x, y, sz, sz);
  }

  // Foreground stars — a few brighter ones with a subtle glow
  for (let i = 0; i < 40; i++) {
    let x = random(CANVAS_W);
    let y = random(CANVAS_H);
    
    // Glow
    fill(255, 255, 255, 20);
    noStroke();
    ellipse(x, y, random(6, 14), random(6, 14));
    
    // Star point
    fill(255, 255, 255, 220);
    ellipse(x, y, random(1.5, 3), random(1.5, 3));
  }
}

function saveNebula() {
  saveCanvas(
    "nebula-" + hour() + minute() + second(),
    "png"
  );
}