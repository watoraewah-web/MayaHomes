export type SectionType =
  | "verse"
  | "chorus"
  | "pre-chorus"
  | "bridge"
  | "intro"
  | "outro"
  | "tag"
  | "refrain"
  | "ending"
  | "interlude"
  | "custom"
  | "uncategorized";

export const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: "verse", label: "Verse" },
  { value: "chorus", label: "Chorus" },
  { value: "pre-chorus", label: "Pre-Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "tag", label: "Tag" },
  { value: "refrain", label: "Refrain" },
  { value: "ending", label: "Ending" },
  { value: "interlude", label: "Interlude" },
  { value: "custom", label: "Custom" },
  { value: "uncategorized", label: "Uncategorized" },
];

export interface SongSection {
  id: string;
  song_id: string;
  section_type: SectionType;
  section_label: string;
  content: string;
  section_order: number;
  created_at?: string;
}

export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  raw_lyrics: string;
  created_at?: string;
  updated_at?: string;
}

export interface Presentation {
  id: string;
  user_id: string;
  song_id: string;
  settings: PresentationSettings;
  created_at?: string;
  updated_at?: string;
}

export interface WorshipSet {
  id: string;
  user_id: string;
  name: string;
  settings: PresentationSettings;
  add_song_title_slides: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorshipSetSong {
  id: string;
  worship_set_id: string;
  song_id: string;
  song_order: number;
  created_at?: string;
  song?: Song | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at?: string;
}

export type AspectRatio = "16:9" | "4:3";
export type TextAlignment = "left" | "center" | "right";
export type VerticalPosition = "top" | "center" | "bottom";
export type BackgroundType = "solid" | "image" | "video";

export interface PresentationSettings {
  aspectRatio: AspectRatio;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  fontWeight: "normal" | "bold";
  textAlign: TextAlignment;
  verticalPosition: VerticalPosition;
  maxLinesPerSlide: number;
  showSectionLabel: boolean;
  backgroundType: BackgroundType;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
}

export const DEFAULT_SETTINGS: PresentationSettings = {
  aspectRatio: "16:9",
  fontFamily: "Arial",
  fontSize: 36,
  textColor: "#ffffff",
  fontWeight: "normal",
  textAlign: "center",
  verticalPosition: "center",
  maxLinesPerSlide: 4,
  showSectionLabel: false,
  backgroundType: "solid",
  backgroundColor: "#000000",
  backgroundImageUrl: null,
  backgroundVideoUrl: null,
};

export function normalizeSettings(raw: unknown): PresentationSettings {
  const s = (raw ?? {}) as Partial<PresentationSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    textColor:
      typeof s.textColor === "string" && /^#[0-9a-f]{6}$/i.test(s.textColor)
        ? s.textColor
        : DEFAULT_SETTINGS.textColor,
    fontSize:
      typeof s.fontSize === "number" && s.fontSize >= 14 && s.fontSize <= 72
        ? s.fontSize
        : DEFAULT_SETTINGS.fontSize,
    maxLinesPerSlide:
      typeof s.maxLinesPerSlide === "number" &&
      s.maxLinesPerSlide >= 1 &&
      s.maxLinesPerSlide <= 12
        ? s.maxLinesPerSlide
        : DEFAULT_SETTINGS.maxLinesPerSlide,
  };
}

/** Text color that stays readable on any background. */
export function readableTextColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 150 ? "#111111" : "#ffffff";
}
