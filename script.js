const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let originalImage = null;
let imageHistory = [];
let redoHistory = [];

const upload = document.getElementById("upload");
const blackLevel = document.getElementById("blackLevel");
const whiteLevel = document.getElementById("whiteLevel");
const blur = document.getElementById("blur");
const grainSize = document.getElementById("grainSize");
const grainStrength = document.getElementById("grainStrength");
const overlayMode = document.getElementById("overlayMode");
const randomizeColors = document.getElementById("randomizeColors");

const colors = [
  document.getElementById("color1"),
  document.getElementById("color2"),
  document.getElementById("color3"),
  document.getElementById("color4"),
];

function drawImage(image) {
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);
}

function applyGradientMap(data) {
  const stops = colors.map(c => hexToRgb(c.value));
  for (let i = 0; i < data.data.length; i += 4) {
    const avg = (data.data[i] + data.data[i + 1] + data.data[i + 2]) / 3;
    const t = (avg - blackLevel.value) / (whiteLevel.value - blackLevel.value);
    const stopIndex = Math.floor(t * (stops.length - 1));
    const ratio = t * (stops.length - 1) - stopIndex;
    const c1 = stops[clamp(stopIndex, 0, stops.length - 1)];
    const c2 = stops[clamp(stopIndex + 1, 0, stops.length - 1)];

    data.data[i] = lerp(c1[0], c2[0], ratio);
    data.data[i + 1] = lerp(c1[1], c2[1], ratio);
    data.data[i + 2] = lerp(c1[2], c2[2], ratio);
  }
  return data;
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function applyEffects() {
  if (!originalImage) return;

  ctx.filter = "none";
  drawImage(originalImage);

  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  imageData = applyGradientMap(imageData);
  ctx.putImageData(imageData, 0, 0);

  ctx.filter = `blur(${blur.value}px)`;
  ctx.drawImage(canvas, 0, 0);

  ctx.filter = "none";
  drawGrain();
  saveState();
}

function drawGrain() {
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = canvas.width;
  grainCanvas.height = canvas.height;
  const gctx = grainCanvas.getContext("2d");
  const imgData = gctx.createImageData(canvas.width, canvas.height);
  const size = Number(grainSize.value);
  const strength = Number(grainStrength.value) * 255;

  for (let i = 0; i < imgData.data.length; i += 4 * size) {
    const val = (Math.random() - 0.5) * 2 * strength;
    imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = 128 + val;
    imgData.data[i + 3] = 255;
  }

  gctx.putImageData(imgData, 0, 0);
  ctx.globalCompositeOperation = overlayMode.checked ? "overlay" : "source-over";
  ctx.drawImage(grainCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

upload.addEventListener("change", e => {
  const file = e.target.files[0];
  const img = new Image();
  img.onload = () => {
    originalImage = img;
    applyEffects();
  };
  img.src = URL.createObjectURL(file);
});

document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", applyEffects);
});

randomizeColors.addEventListener("click", () => {
  const current = colors.map(c => c.value);
  const shuffled = current.sort(() => Math.random() - 0.5);
  colors.forEach((c, i) => (c.value = shuffled[i]));
  blackLevel.value = Math.floor(Math.random() * 50);
  whiteLevel.value = 200 + Math.floor(Math.random() * 55);
  applyEffects();
});

document.getElementById("save").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "edited-image.png";
  link.href = canvas.toDataURL();
  link.click();
});

function saveState() {
  if (!canvas) return;
  imageHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (imageHistory.length > 50) imageHistory.shift();
  redoHistory = [];
}

document.getElementById("undo").addEventListener("click", () => {
  if (imageHistory.length < 2) return;
  redoHistory.push(imageHistory.pop());
  const prev = imageHistory[imageHistory.length - 1];
  ctx.putImageData(prev, 0, 0);
});

document.getElementById("redo").addEventListener("click", () => {
  if (!redoHistory.length) return;
  const redo = redoHistory.pop();
  imageHistory.push(redo);
  ctx.putImageData(redo, 0, 0);
});

document.getElementById("applyPreset").addEventListener("click", () => {
  blackLevel.value = 30;
  whiteLevel.value = 225;
  blur.value = 5;
  grainSize.value = 3;
  grainStrength.value = 0.3;
  overlayMode.checked = true;
  applyEffects();
});