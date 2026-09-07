import { PresentationSettings } from "./types";
import { measureTextWidth } from "./textMeasure";

export interface SlideSectionInput {
  section_type: string;
  section_label: string;
  content: string;
}

export interface Slide {
  /** Index of the section (0-based) in presentation order. */
  sectionIndex: number;
  sectionLabel: string;
  sectionType: string;
  /**
   * Visual lines for this slide, already wrapped at word boundaries by the
   * layout engine. Both the preview and the PowerPoint export render exactly
   * these lines, so the two are guaranteed to match.
   */
  lines: string[];
  /**
   * Effective font size in points for this slide, after auto-fit reduction.
   * Never below the auto-fit floor.
   */
  fontSize: number;
  /** 1-based index of this slide within its section. */
  slideNumberInSection: number;
  totalSlidesInSection: number;
  songIndex?: number;
  songTitle?: string;
  isSongTitle?: boolean;
  sourceStartLine?: number;
  sourceLineCount?: number;
  sourceText?: string;
  dateLabel?: string | null;
}

export interface WorshipSetSlideInput {
  title: string;
  artist?: string | null;
  sections: SlideSectionInput[];
}

export function replaceSlideSource(
  content: string,
  slide: Slide,
  replacement: string,
): string {
  if (slide.sourceStartLine == null || slide.sourceLineCount == null)
    return content;
  const lines = content.split("\n");
  lines.splice(
    slide.sourceStartLine,
    slide.sourceLineCount,
    ...replacement.split("\n"),
  );
  return lines.join("\n");
}

export function sundayDateLabel(date = new Date()): string | null {
  return date.getDay() === 0
    ? date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

/* ------------------------------- geometry -------------------------------- */

export const SLIDE_DIMENSIONS = {
  "16:9": { widthIn: 13.333, heightIn: 7.5 },
  "4:3": { widthIn: 10, heightIn: 7.5 },
};

export const PX_PER_IN = 96;
/** Line height multiplier shared by preview and PowerPoint export. */
export const LINE_HEIGHT = 1.2;
const PAD_X_RATIO = 0.09;
const PAD_Y_RATIO = 0.08;
const LABEL_FONT_PT = 12;
const LABEL_GAP_PX = 16;

export function slideSizePx(ratio: PresentationSettings["aspectRatio"]): {
  width: number;
  height: number;
} {
  const d = SLIDE_DIMENSIONS[ratio] ?? SLIDE_DIMENSIONS["16:9"];
  return {
    width: Math.round(d.widthIn * PX_PER_IN),
    height: Math.round(d.heightIn * PX_PER_IN),
  };
}

/** Symmetric slide padding in px (matches the PowerPoint margins). */
export function slidePaddingPx(ratio: PresentationSettings["aspectRatio"]): {
  x: number;
  y: number;
} {
  const { width, height } = slideSizePx(ratio);
  return {
    x: Math.round(width * PAD_X_RATIO),
    y: Math.round(height * PAD_Y_RATIO),
  };
}

/** Font size in px for a point size (96dpi logical px). */
export function ptToPx(pt: number): number {
  return (pt / 72) * PX_PER_IN;
}

/** Auto-fit never reduces the font below this. */
export function minFontSize(basePt: number): number {
  return Math.max(18, Math.round(basePt * 0.55));
}

interface UsableArea {
  width: number;
  height: number;
  labelHeight: number;
}

function usableArea(settings: PresentationSettings): UsableArea {
  const { width, height } = slideSizePx(settings.aspectRatio);
  const pad = slidePaddingPx(settings.aspectRatio);
  const labelHeight = settings.showSectionLabel
    ? ptToPx(LABEL_FONT_PT) * LINE_HEIGHT + LABEL_GAP_PX
    : 0;
  return {
    width: width - pad.x * 2,
    height: height - pad.y * 2 - labelHeight,
    labelHeight,
  };
}

/* ------------------------------- wrapping -------------------------------- */

/**
 * Wraps a single original (semantic) lyric line into visual lines that fit
 * `maxWidthPx` at the given font. Always wraps at word boundaries; words are
 * never split. A single word wider than the line is kept alone on its line.
 */
function wrapSemanticLine(
  line: string,
  settings: PresentationSettings,
  fontSizePx: number,
  maxWidthPx: number,
): string[] {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const { fontFamily, fontWeight } = settings;
  const out: string[] = [];
  let row = words[0];
  let rowWidth = measureTextWidth(row, fontFamily, fontWeight, fontSizePx);

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const spaceW = measureTextWidth(" ", fontFamily, fontWeight, fontSizePx);
    const wordW = measureTextWidth(word, fontFamily, fontWeight, fontSizePx);
    if (rowWidth + spaceW + wordW <= maxWidthPx) {
      row += " " + word;
      rowWidth += spaceW + wordW;
    } else {
      out.push(row);
      row = word;
      rowWidth = wordW;
    }
  }
  out.push(row);
  return out;
}

interface FitResult {
  fits: boolean;
  fontPt: number;
  wrapped: string[];
}

/**
 * Finds the largest font size (from the user's chosen size down to the
 * auto-fit floor) at which the given semantic lines wrap into visual lines
 * that all fit inside the usable slide area.
 */
function fitChunk(
  semanticLines: string[],
  settings: PresentationSettings,
  area: UsableArea,
): FitResult {
  const base = settings.fontSize;
  const floor = minFontSize(base);
  let last: FitResult | null = null;

  for (let f = base; f >= floor; f -= 2) {
    const px = ptToPx(f);
    const wrapped = semanticLines.flatMap((l) =>
      wrapSemanticLine(l, settings, px, area.width),
    );
    const needed = wrapped.length * px * LINE_HEIGHT;
    last = { fits: needed <= area.height, fontPt: f, wrapped };
    if (last.fits) return last;
  }
  return last ?? { fits: false, fontPt: floor, wrapped: semanticLines };
}

/* ----------------------------- slide building ---------------------------- */

/**
 * Converts song sections into presentation slides.
 *
 * - Each original lyric line is a semantic line: breaks the user typed are
 *   respected and lines are never merged across them.
 * - A semantic line wider than the slide is wrapped at word boundaries.
 * - Semantic lines are grouped into slides of at most `maxLinesPerSlide`
 *   original lines, and only kept together when the wrapped text fits the
 *   usable area (auto-fit reduces the font first, then the group splits).
 * - Repeated sections (e.g. Chorus) are preserved in order.
 */
export function buildSlides(
  sections: SlideSectionInput[],
  settings: PresentationSettings,
): Slide[] {
  const area = usableArea(settings);
  const maxSemantic = Math.max(1, Math.round(settings.maxLinesPerSlide));
  const slides: Slide[] = [];

  // Verse copies are commonly pasted as separate numbered sections. Keep the
  // first occurrence, while preserving repeated choruses as intentional song
  // structure.
  const seenVerseContent = new Set<string>();
  const renderSections = sections.filter((section) => {
    if (section.section_type !== "verse") return true;
    const key = section.content
      .split("\n")
      .map((line) => line.trim().toLowerCase().replace(/\s+/g, " "))
      .filter(Boolean)
      .join("\n");
    if (!key || seenVerseContent.has(key)) return false;
    seenVerseContent.add(key);
    return true;
  });

  /** Splits an overlong single line across several slides at the floor font. */
  const splitSingleLine = (
    line: string,
    sectionIndex: number,
    section: SlideSectionInput,
    sourceLineIndex: number,
  ) => {
    const floor = minFontSize(settings.fontSize);
    const px = ptToPx(floor);
    const wrapped = wrapSemanticLine(line, settings, px, area.width);
    const perLine = px * LINE_HEIGHT;
    const capacity = Math.max(1, Math.floor(area.height / perLine));
    for (let i = 0; i < wrapped.length; i += capacity) {
      slides.push(
        makeSlide(
          sectionIndex,
          wrapped.slice(i, i + capacity),
          floor,
          section,
          sourceLineIndex,
          1,
        ),
      );
    }
  };

  renderSections.forEach((section) => {
    const sectionIndex = sections.indexOf(section);
    const semanticWithSource = section.content
      .split("\n")
      .map((line, sourceLineIndex) => ({ line: line.trim(), sourceLineIndex }))
      .filter((item) => item.line.length > 0);

    if (semanticWithSource.length === 0) {
      slides.push(makeSlide(sectionIndex, [""], settings.fontSize, section));
      return;
    }

    let buffer: string[] = [];
    let bufferStart = -1;
    let bufferEnd = -1;
    let targetMax = maxSemantic;

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const fit = fitChunk(buffer, settings, area);
      slides.push(
        makeSlide(
          sectionIndex,
          fit.wrapped,
          fit.fontPt,
          section,
          bufferStart,
          bufferEnd - bufferStart + 1,
        ),
      );
      buffer = [];
      bufferStart = -1;
      bufferEnd = -1;
    };

    for (
      let lineIndex = 0;
      lineIndex < semanticWithSource.length;
      lineIndex++
    ) {
      const { line, sourceLineIndex } = semanticWithSource[lineIndex];
      if (buffer.length === 0) {
        bufferStart = sourceLineIndex;
        const remaining = semanticWithSource.length - lineIndex;
        targetMax =
          remaining > maxSemantic && remaining <= maxSemantic * 2
            ? Math.ceil(remaining / 2)
            : maxSemantic;
      }
      const candidate = [...buffer, line];

      if (candidate.length > targetMax) {
        flushBuffer();
        buffer = [line];
        bufferStart = sourceLineIndex;
        bufferEnd = sourceLineIndex;
        const fit = fitChunk([line], settings, area);
        if (!fit.fits) {
          splitSingleLine(line, sectionIndex, section, sourceLineIndex);
          buffer = [];
          bufferStart = -1;
        }
        continue;
      }

      const fit = fitChunk(candidate, settings, area);
      if (fit.fits) {
        buffer = candidate;
      } else {
        // The group no longer fits even at the floor font: close the current
        // slide and start a new one with this line.
        flushBuffer();
        buffer = [line];
        bufferStart = sourceLineIndex;
        bufferEnd = sourceLineIndex;
        const single = fitChunk([line], settings, area);
        if (!single.fits) {
          splitSingleLine(line, sectionIndex, section, sourceLineIndex);
          buffer = [];
          bufferStart = -1;
        }
      }
      if (buffer.length > 0) bufferEnd = sourceLineIndex;
    }
    flushBuffer();

    const start = slides.findIndex((s) => s.sectionIndex === sectionIndex);
    const count = slides.length - start;
    for (let i = start; i < slides.length; i++) {
      slides[i].slideNumberInSection = i - start + 1;
      slides[i].totalSlidesInSection = count;
    }
  });

  const dateLabel = sundayDateLabel();
  return slides.map((slide) => ({ ...slide, dateLabel }));
}

function makeSlide(
  sectionIndex: number,
  lines: string[],
  fontPt: number,
  section: SlideSectionInput,
  sourceStartLine = 0,
  sourceLineCount = 1,
): Slide {
  return {
    sectionIndex,
    sectionLabel: section.section_label,
    sectionType: section.section_type,
    lines: lines.length ? lines : [""],
    fontSize: fontPt,
    slideNumberInSection: 1,
    totalSlidesInSection: 1,
    sourceStartLine,
    sourceLineCount,
    sourceText: section.content
      .split("\n")
      .slice(sourceStartLine, sourceStartLine + sourceLineCount)
      .join("\n"),
  };
}

/** Builds one continuous slide list for a worship set using the same song layout engine. */
export function buildWorshipSetSlides(
  songs: WorshipSetSlideInput[],
  settings: PresentationSettings,
  addTitleSlides = true,
): Slide[] {
  const output: Slide[] = [];
  songs.forEach((song, songIndex) => {
    if (addTitleSlides) {
      const titleSlide = buildSlides(
        [
          {
            section_type: "song-title",
            section_label: "",
            content: [song.title, song.artist?.trim()]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        settings,
      )[0];
      output.push({
        ...titleSlide,
        songIndex,
        songTitle: song.title,
        isSongTitle: true,
      });
    }
    const songSlides = buildSlides(song.sections, settings).map((slide) => ({
      ...slide,
      songIndex,
      songTitle: song.title,
    }));
    output.push(...songSlides);
  });
  return output;
}
