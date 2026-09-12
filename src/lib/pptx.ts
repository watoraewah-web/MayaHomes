import PptxGenJS from "pptxgenjs";
import { PresentationSettings } from "./types";
import {
  Slide,
  slideSizePx,
  slidePaddingPx,
  ptToPx,
  LINE_HEIGHT,
  SLIDE_DIMENSIONS,
} from "./slides";
import { getMedia } from "./mediaStorage";
import { getPresentationPreset } from "./presentationPresets";

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Could not load background image (${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Could not read the background image."));
    reader.readAsDataURL(blob);
  });
}

export interface GenerateOptions {
  songTitle: string;
  artist?: string | null;
  slides: Slide[];
  settings: PresentationSettings;
}

export interface GenerateWorshipSetOptions {
  setTitle: string;
  slides: Slide[];
  settings: PresentationSettings;
}

/**
 * Builds a real .pptx file from the shared slide model (the exact same model
 * the preview renders) and triggers a browser download named
 * "WFICM - [Song Title].pptx".
 */
export async function generatePowerPoint({
  songTitle,
  artist,
  slides,
  settings,
}: GenerateOptions): Promise<void> {
  await writePowerPoint({
    title: songTitle,
    author: artist,
    slides,
    settings,
    fileName: `WFICM - ${safeFilePart(songTitle)}.pptx`,
  });
}

export async function generateWorshipSetPowerPoint({
  setTitle,
  slides,
  settings,
}: GenerateWorshipSetOptions): Promise<void> {
  await writePowerPoint({
    title: setTitle,
    slides,
    settings,
    fileName: `WFICM - ${safeFilePart(setTitle)}.pptx`,
  });
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[/\\:*?"<>|]/g, "-") || "Untitled";
}

async function writePowerPoint({
  title,
  author,
  slides,
  settings,
  fileName,
}: {
  title: string;
  author?: string | null;
  slides: Slide[];
  settings: PresentationSettings;
  fileName: string;
}): Promise<void> {
  if (slides.length === 0) {
    throw new Error(
      "There are no slides to generate. Add at least one section with lyrics.",
    );
  }

  const pptx = new PptxGenJS();
  const dim =
    SLIDE_DIMENSIONS[settings.aspectRatio] ?? SLIDE_DIMENSIONS["16:9"];
  pptx.defineLayout({
    name: "MAYA",
    width: dim.widthIn,
    height: dim.heightIn,
  });
  pptx.layout = "MAYA";
  pptx.title = title;
  if (author) pptx.author = author;

  const { width: Wpx, height: Hpx } = slideSizePx(settings.aspectRatio);
  const pad = slidePaddingPx(settings.aspectRatio);
  const toIn = (px: number) => px / 96;

  const hasImageBackground =
    settings.backgroundType === "image" &&
    (settings.backgroundImageUrl ||
      settings.backgroundImageId ||
      settings.backgroundPresetId);
  let bgDataUrl: string | null = null;
  if (hasImageBackground) {
    let temporaryUrl: string | null = null;
    try {
      let imageUrl = settings.backgroundImageUrl;
      if (!imageUrl && settings.backgroundImageId) {
        const media = await getMedia(settings.backgroundImageId);
        if (media) {
          temporaryUrl = URL.createObjectURL(media.blob);
          imageUrl = temporaryUrl;
        }
      }
      if (!imageUrl && settings.backgroundPresetId) {
        imageUrl =
          getPresentationPreset(settings.backgroundPresetId)?.asset ?? null;
      }
      if (imageUrl) bgDataUrl = await toDataUrl(imageUrl);
    } catch {
      bgDataUrl = null;
    } finally {
      if (temporaryUrl) URL.revokeObjectURL(temporaryUrl);
    }
  }

  // Video backgrounds cannot be embedded in a static .pptx; fall back to a
  // neutral dark background so exported slides remain usable.
  const exportBgColor =
    settings.backgroundType === "video" ? "#111111" : settings.backgroundColor;
  const textColor = settings.textColor.replace("#", "");
  const labelColor = textColor;
  const dateLabel = slides[0]?.dateLabel ?? null;

  const labelHeightPx = settings.showSectionLabel
    ? ptToPx(12) * LINE_HEIGHT + 16
    : 0;

  for (const [slideIndex, slide] of slides.entries()) {
    const s = pptx.addSlide();
    s.background = bgDataUrl
      ? { data: bgDataUrl }
      : { color: exportBgColor.replace("#", "") };

    if (settings.showSectionLabel) {
      s.addText(slide.sectionLabel.toUpperCase(), {
        x: toIn(pad.x),
        y: toIn(pad.y),
        w: toIn(Wpx - pad.x * 2),
        h: toIn(ptToPx(12) * LINE_HEIGHT),
        align: settings.textAlign,
        fontFace: settings.fontFamily,
        fontSize: 12,
        charSpacing: 2,
        color: labelColor,
      });
    }

    s.addText(slide.lines.join("\n"), {
      x: toIn(pad.x),
      y: toIn(pad.y + labelHeightPx),
      w: toIn(Wpx - pad.x * 2),
      h: toIn(Hpx - pad.y * 2 - labelHeightPx),
      align: settings.textAlign,
      valign:
        settings.verticalPosition === "top"
          ? "top"
          : settings.verticalPosition === "bottom"
            ? "bottom"
            : "middle",
      fontFace: settings.fontFamily,
      fontSize: slide.fontSize,
      bold: settings.fontWeight === "bold",
      color: textColor,
      lineSpacingMultiple: LINE_HEIGHT,
    });

    if (slideIndex === 0 && dateLabel) {
      s.addText(dateLabel, {
        x: toIn(pad.x),
        y: toIn(Hpx - pad.y - ptToPx(12)),
        w: toIn(Wpx - pad.x * 2),
        h: toIn(ptToPx(12)),
        align: settings.textAlign,
        fontFace: settings.fontFamily,
        fontSize: 12,
        color: labelColor,
      });
    }
  }

  await pptx.writeFile({ fileName });
}
