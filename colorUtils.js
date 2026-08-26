// Gera uma rampa de tons (50 a 950) a partir de uma única cor escolhida pelo
// administrador, para popular as variáveis CSS que alimentam a paleta "forest"
// do Tailwind (ver tailwind.config.js e index.css).

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

const STOP_LIGHTNESS = { 50: 96, 100: 91, 200: 82, 300: 70, 400: 56, 500: 42, 600: 34, 700: 27, 800: 21, 900: 16, 950: 10 };
const STOP_SATURATION_MULT = { 50: 0.5, 100: 0.6, 200: 0.72, 300: 0.85, 400: 0.95, 500: 1, 600: 1, 700: 0.95, 800: 0.88, 900: 0.8, 950: 0.7 };

/**
 * Retorna um objeto { 50: "r g b", ..., 950: "r g b" } pronto para ser
 * aplicado como variáveis CSS (--c-50, --c-100, ...).
 */
export function generateRamp(hex) {
  const { h, s } = rgbToHsl(hexToRgb(hex));
  const baseSaturation = Math.max(s, 25); // evita rampas muito acinzentadas se a cor de origem for quase neutra
  const ramp = {};
  Object.entries(STOP_LIGHTNESS).forEach(([stop, l]) => {
    const satMult = STOP_SATURATION_MULT[stop];
    const { r, g, b } = hslToRgb({ h, s: Math.min(baseSaturation * satMult, 100), l });
    ramp[stop] = `${r} ${g} ${b}`;
  });
  return ramp;
}

export function applyRampToRoot(ramp) {
  Object.entries(ramp).forEach(([stop, rgb]) => {
    document.documentElement.style.setProperty(`--c-${stop}`, rgb);
  });
}

export function resetRampToDefault() {
  Object.keys(STOP_LIGHTNESS).forEach((stop) => {
    document.documentElement.style.removeProperty(`--c-${stop}`);
  });
}
