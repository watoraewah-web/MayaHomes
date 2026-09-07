"use client";

import { SectionType, SECTION_TYPE_OPTIONS } from "@/lib/types";
import { Button, Select } from "@/components/ui";
import { CopyIcon, DeleteIcon, MoveDownIcon, MoveUpIcon } from "@/components/icons";

export interface EditorSection {
  key: string;
  section_type: SectionType;
  section_label: string;
  content: string;
}

let keyCounter = 0;
export function makeSectionKey(): string {
  keyCounter += 1;
  return `sec-${Date.now()}-${keyCounter}`;
}

export function toEditorSections(rows: EditorSectionSource[]): EditorSection[] {
  return rows.map((r) => ({
    key: makeSectionKey(),
    section_type: r.section_type,
    section_label: r.section_label,
    content: r.content,
  }));
}
type EditorSectionSource = { section_type: SectionType; section_label: string; content: string };

const TYPE_BADGE_STYLES: Record<string, string> = {
  verse: "text-zinc-600",
  chorus: "text-zinc-900",
  "pre-chorus": "text-zinc-600",
  bridge: "text-zinc-600",
  intro: "text-zinc-500",
  outro: "text-zinc-500",
  tag: "text-zinc-500",
  refrain: "text-zinc-600",
  ending: "text-zinc-500",
  interlude: "text-zinc-500",
  custom: "text-zinc-700",
  uncategorized: "text-amber-700",
};

export function SectionCard({
  index,
  total,
  section,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: {
  index: number;
  total: number;
  section: EditorSection;
  onChange: (patch: Partial<EditorSection>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const contentLines = section.content ? section.content.split("\n").length : 1;
  const rows = Math.min(14, Math.max(3, contentLines + 1));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2">
        <span className="w-6 text-center text-xs font-medium text-zinc-400" title={`Section ${index + 1}`}>
          {index + 1}
        </span>
        <Select
          value={section.section_type}
          onChange={(e) => {
            const type = e.target.value as SectionType;
            const label = SECTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Custom";
            // Only auto-rename when the label still matches the old default.
            const oldDefault =
              SECTION_TYPE_OPTIONS.find((o) => o.value === section.section_type)?.label ?? "";
            const labelUntouched = !section.section_label || section.section_label === oldDefault;
            onChange({
              section_type: type,
              ...(labelUntouched ? { section_label: label } : {}),
            });
          }}
          className="h-8 w-36 py-0 text-xs"
          aria-label="Section type"
        >
          {SECTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <input
          value={section.section_label}
          onChange={(e) => onChange({ section_label: e.target.value })}
          placeholder="Enter section label"
          maxLength={60}
          className={`focus-ring h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-xs font-semibold uppercase tracking-wide ${TYPE_BADGE_STYLES[section.section_type] ?? "text-zinc-600"} hover:border-zinc-200`}
          aria-label="Section label"
        />
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            icon={<MoveUpIcon />}
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move section up"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<MoveDownIcon />}
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move section down"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<CopyIcon />}
            onClick={onDuplicate}
            aria-label="Duplicate section"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<DeleteIcon />}
            onClick={onDelete}
            className="text-zinc-400 hover:text-red-600"
            aria-label="Delete section"
          />
        </div>
      </div>
      <div className="p-3">
        <textarea
          value={section.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={rows}
          placeholder="Enter lyrics for this section"
          spellCheck={false}
          className="focus-ring w-full resize-y rounded-md border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-zinc-800 placeholder:text-zinc-300"
        />
      </div>
    </div>
  );
}
