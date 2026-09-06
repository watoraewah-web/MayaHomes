import { SectionType } from "./types";

export interface ParsedSection {
  section_type: SectionType;
  section_label: string;
  content: string;
}

/**
 * Recognized section labels. Each alias maps to a canonical SectionType.
 * Recognition is line-anchored and case-insensitive so pasted lyrics in any
 * of the common formats ([Verse 1], CHORUS, Pre-Chorus, verse 2:) parse.
 */
const LABEL_ALIASES: { pattern: RegExp; type: SectionType }[] = [
  { pattern: /^(pre[-\s]?chorus|prechorus)(\s*\d+)?$/i, type: "pre-chorus" },
  { pattern: /^verse(\s*\d+)?$/i, type: "verse" },
  { pattern: /^(chorus|hook)(\s*\d+)?$/i, type: "chorus" },
  { pattern: /^refrain(\s*\d+)?$/i, type: "refrain" },
  { pattern: /^bridge(\s*\d+)?$/i, type: "bridge" },
  { pattern: /^(intro|introduction)(\s*\d+)?$/i, type: "intro" },
  { pattern: /^interlude(\s*\d+)?$/i, type: "interlude" },
  { pattern: /^(outro|coda)(\s*\d+)?$/i, type: "outro" },
  { pattern: /^(ending|end)(\s*\d+)?$/i, type: "ending" },
  { pattern: /^(tag|vamp)(\s*\d+)?$/i, type: "tag" },
  { pattern: /^v(\s*\d+)$/i, type: "verse" },
  { pattern: /^c(\s*\d+)?$/i, type: "chorus" },
  { pattern: /^b(\s*\d+)?$/i, type: "bridge" },
];

/**
 * Returns the canonical section for a bare label line such as "[Verse 2]",
 * "CHORUS", "pre-chorus", or "Bridge:". Returns null for ordinary lyric lines.
 */
export function matchSectionLabel(line: string): { type: SectionType; label: string } | null {
  let text = line.trim();
  text = text.replace(/^[\[(]+\s*/, "").replace(/\s*[\])]+$/, "");
  text = text.replace(/[:\-–—]\s*$/, "").trim();
  if (!text || text.length > 40) return null;

  for (const { pattern, type } of LABEL_ALIASES) {
    if (pattern.test(text)) {
      const label = text.replace(/\s+/g, " ");
      return { type, label: label.charAt(0).toUpperCase() + label.slice(1) };
    }
  }
  return null;
}

const TYPE_TITLES: Record<SectionType, string> = {
  verse: "Verse",
  chorus: "Chorus",
  "pre-chorus": "Pre-Chorus",
  bridge: "Bridge",
  intro: "Intro",
  outro: "Outro",
  tag: "Tag",
  refrain: "Refrain",
  ending: "Ending",
  interlude: "Interlude",
  custom: "Custom",
  uncategorized: "Uncategorized",
};

export function titleCaseType(type: SectionType): string {
  return TYPE_TITLES[type] ?? "Uncategorized";
}

/**
 * Parses pasted lyrics into structured sections.
 *
 * - A recognized label line ([Verse 1], CHORUS, Pre-Chorus, ...) starts a new
 *   section; the non-empty lines that follow it become its content.
 * - A label with no lines beneath it is kept as an empty section.
 * - Blank lines end the current block of content.
 * - Content with no recognized label becomes an "Uncategorized" section.
 * - Lyric content is never rewritten; only labels are interpreted.
 */
export function parseLyrics(raw: string): ParsedSection[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const sections: ParsedSection[] = [];

  let current: ParsedSection | null = null;
  let pendingLabel: { type: SectionType; label: string } | null = null;

  const pushEmpty = (label: { type: SectionType; label: string }) => {
    sections.push({ section_type: label.type, section_label: label.label, content: "" });
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      // Blank line closes the current block of content. A label waiting for
      // its lyrics survives, since blank lines often follow the label.
      current = null;
      continue;
    }

    const match = matchSectionLabel(trimmed);

    if (match) {
      // A label line starts a new section. If a previous label never received
      // content, keep it as an empty section so nothing silently disappears.
      if (pendingLabel) pushEmpty(pendingLabel);
      current = null;
      pendingLabel = match;
      continue;
    }

    // Ordinary lyric line: attach to the pending label, or open a block.
    if (pendingLabel) {
      current = { section_type: pendingLabel.type, section_label: pendingLabel.label, content: trimmed };
      sections.push(current);
      pendingLabel = null;
      continue;
    }

    if (!current) {
      current = { section_type: "uncategorized", section_label: "Uncategorized", content: trimmed };
      sections.push(current);
      continue;
    }

    current.content += "\n" + trimmed;
  }

  if (pendingLabel) pushEmpty(pendingLabel);

  return sections;
}
