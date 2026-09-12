import { PresentationSettings } from "./types";

export type PresentationPreset = {
  id: string;
  name: string;
  asset: string;
  settings: Pick<
    PresentationSettings,
    | "aspectRatio"
    | "fontFamily"
    | "fontSize"
    | "textColor"
    | "fontWeight"
    | "textAlign"
    | "verticalPosition"
    | "maxLinesPerSlide"
    | "showSectionLabel"
    | "backgroundType"
    | "backgroundColor"
  >;
};

export const PRESENTATION_PRESETS: PresentationPreset[] = [
  {
    id: "classic-worship",
    name: "Classic Worship",
    asset: "/presets/classic-worship.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Georgia",
      fontSize: 38,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "bottom",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#111111",
    },
  },
  {
    id: "prayer",
    name: "Prayer",
    asset: "/presets/prayer.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Georgia",
      fontSize: 34,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "bottom",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#201e1d",
    },
  },
  {
    id: "youth",
    name: "Youth",
    asset: "/presets/youth.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Arial",
      fontSize: 36,
      textColor: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      verticalPosition: "center",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#162b63",
    },
  },
  {
    id: "modern-worship",
    name: "Modern Worship",
    asset: "/presets/modern-worship.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Helvetica",
      fontSize: 34,
      textColor: "#111111",
      fontWeight: "bold",
      textAlign: "center",
      verticalPosition: "bottom",
      maxLinesPerSlide: 4,
      showSectionLabel: true,
      backgroundType: "image",
      backgroundColor: "#e8e4df",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    asset: "/presets/minimal.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Arial",
      fontSize: 36,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "center",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#071426",
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    asset: "/presets/elegant.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Garamond",
      fontSize: 36,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "bottom",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#5a3d20",
    },
  },
  {
    id: "grace",
    name: "Grace",
    asset: "/presets/grace.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Georgia",
      fontSize: 34,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "center",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#4d4939",
    },
  },
  {
    id: "sanctuary",
    name: "Sanctuary",
    asset: "/presets/sanctuary.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Georgia",
      fontSize: 36,
      textColor: "#ffffff",
      fontWeight: "normal",
      textAlign: "center",
      verticalPosition: "center",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#32170a",
    },
  },
  {
    id: "praise",
    name: "Praise",
    asset: "/presets/praise.jpg",
    settings: {
      aspectRatio: "16:9",
      fontFamily: "Arial",
      fontSize: 36,
      textColor: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      verticalPosition: "bottom",
      maxLinesPerSlide: 4,
      showSectionLabel: false,
      backgroundType: "image",
      backgroundColor: "#301f32",
    },
  },
];

export function getPresentationPreset(
  id: string | null | undefined,
): PresentationPreset | null {
  return PRESENTATION_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function applyPresentationPreset(
  id: string,
): Partial<PresentationSettings> | null {
  const preset = getPresentationPreset(id);
  if (!preset) return null;
  return {
    ...preset.settings,
    backgroundPresetId: preset.id,
    backgroundImageId: null,
    backgroundVideoId: null,
    backgroundImageUrl: preset.asset,
    backgroundVideoUrl: null,
  };
}
