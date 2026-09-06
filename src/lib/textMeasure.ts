/**
 * Text measurement for slide layout.
 *
 * In the browser this uses a canvas 2D context with the real font, so the
 * wrapping math matches what the preview renders and what PowerPoint draws
 * (the same font family/size is passed to the .pptx). In non-browser
 * environments (tests) a per-character Arial metric estimate is used.
 *
 * All widths are computed for a 100px font and cached per unique string, then
 * scaled linearly to the requested pixel size.
 */

let ctx: CanvasRenderingContext2D | null | undefined;

function getContext(): CanvasRenderingContext2D | null {
  if (ctx === undefined) {
    try {
      ctx =
        typeof document !== "undefined"
          ? document.createElement("canvas").getContext("2d")
          : null;
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

/** Approximate Arial advance widths in em units for common characters. */
const CHAR_EM: Record<string, number> = {
  " ": 0.278,
  "!": 0.278,
  "'": 0.191,
  '"': 0.355,
  "#": 0.556,
  $: 0.556,
  "%": 0.889,
  "&": 0.667,
  "(": 0.333,
  ")": 0.333,
  "*": 0.389,
  "+": 0.584,
  ",": 0.278,
  "-": 0.333,
  ".": 0.278,
  "/": 0.278,
  ":": 0.278,
  ";": 0.278,
  "<": 0.584,
  "=": 0.584,
  ">": 0.584,
  "?": 0.556,
  "@": 1.015,
  "[": 0.278,
  "]": 0.278,
  "\\": 0.278,
  "^": 0.556,
  _: 0.556,
  "`": 0.333,
  "{": 0.35,
  "}": 0.35,
  "~": 0.584,
  "|": 0.26,
  "\u2019": 0.191,
  "\u2018": 0.191,
  "\u201c": 0.355,
  "\u201d": 0.355,
  "\u2013": 0.556,
  "\u2014": 1.0,
};

const NARROW_LOWER = new Set(["i", "j", "l", "t", "f", "r"]);
const WIDE_LOWER = new Set(["m", "w"]);
const WIDE_UPPER = new Set(["M", "W", "Q", "G", "O", "D", "B", "R", "U", "H", "N", "A"]);
const NARROW_UPPER = new Set(["I", "J", "T", "F", "L", "Y", "Z", "V", "X"]);

function estimateWidthEm(text: string): number {
  let total = 0;
  for (const ch of text) {
    const known = CHAR_EM[ch];
    if (known !== undefined) {
      total += known;
    } else if (NARROW_LOWER.has(ch)) {
      total += 0.26;
    } else if (WIDE_LOWER.has(ch)) {
      total += 0.78;
    } else if (WIDE_UPPER.has(ch)) {
      total += 0.68;
    } else if (NARROW_UPPER.has(ch)) {
      total += 0.32;
    } else if (ch >= "0" && ch <= "9") {
      total += 0.556;
    } else if (ch >= "A" && ch <= "Z") {
      total += 0.6;
    } else if (ch >= "a" && ch <= "z") {
      total += 0.52;
    } else {
      total += 0.55;
    }
  }
  return total;
}

const cache = new Map<string, number>();
const CACHE_LIMIT = 5000;

/**
 * Width of `text` in pixels when rendered at `fontSizePx` with the given
 * font family and weight.
 */
export function measureTextWidth(
  text: string,
  fontFamily: string,
  fontWeight: string,
  fontSizePx: number
): number {
  if (!text) return 0;
  const key = `${fontFamily}|${fontWeight}|${text}`;
  let widthEm = cache.get(key);
  if (widthEm === undefined) {
    const c = getContext();
    if (c) {
      c.font = `${fontWeight} 100px "${fontFamily}", Arial, sans-serif`;
      widthEm = c.measureText(text).width / 100;
    } else {
      widthEm = estimateWidthEm(text) * (fontWeight === "bold" ? 1.05 : 1);
    }
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(key, widthEm);
  }
  return widthEm * fontSizePx;
}

/** Resets the measurement cache (used by tests). */
export function clearMeasureCache(): void {
  cache.clear();
}
