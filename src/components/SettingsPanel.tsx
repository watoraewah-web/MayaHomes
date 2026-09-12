"use client";

import { useEffect, useRef, useState } from "react";
import {
  PresentationSettings,
  TextAlignment,
  VerticalPosition,
} from "@/lib/types";
import { useNotifications } from "@/components/Notifications";
import { Button, Input, Label, Select } from "@/components/ui";
import { ImageIcon, UploadIcon } from "@/components/icons";
import { deleteMedia, revokeObjectUrl, saveMedia } from "@/lib/mediaStorage";
import {
  applyPresentationPreset,
  PRESENTATION_PRESETS,
} from "@/lib/presentationPresets";

const FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Georgia",
  "Helvetica",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Aptos",
  "Century Gothic",
  "Garamond",
  "Gill Sans",
  "Palatino Linotype",
  "Book Antiqua",
  "Cambria",
];
const MEDIA_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
} as const;

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex w-full rounded-md border border-zinc-300 bg-zinc-50 p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`focus-ring flex-1 rounded-[5px] px-2 py-1.5 text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-white text-zinc-900 shadow-card"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Group({
  title,
  dataTour,
  children,
}: {
  title: string;
  dataTour?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-tour={dataTour}
      className="border-b border-zinc-100 px-4 py-4 last:border-b-0"
    >
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  scrollable = true,
}: {
  settings: PresentationSettings;
  onChange: (patch: Partial<PresentationSettings>) => void;
  scrollable?: boolean;
}) {
  const [uploading, setUploading] = useState<"image" | "video" | null>(null);
  const [maxLinesInput, setMaxLinesInput] = useState(
    String(settings.maxLinesPerSlide),
  );
  const { notify } = useNotifications();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setMaxLinesInput(String(settings.maxLinesPerSlide));
  }, [settings.maxLinesPerSlide]);

  useEffect(
    () => () => {
      if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
    },
    [],
  );

  async function handleUpload(kind: "image" | "video", file: File | undefined) {
    if (!file) return;
    const limit = MEDIA_SIZE_LIMITS[kind];
    if (file.size > limit) {
      notify(
        "error",
        `${kind === "video" ? "Video" : "Image"} files must be ${
          kind === "video" ? "50 MB" : "10 MB"
        } or smaller.`,
      );
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }
    setUploading(kind);
    try {
      const id = await saveMedia(file, kind);
      const url = URL.createObjectURL(file);
      const oldIds = [settings.backgroundImageId, settings.backgroundVideoId];
      await Promise.all(
        oldIds.filter(Boolean).map((oldId) => deleteMedia(oldId)),
      ).catch(() =>
        notify("error", "The previous background could not be cleaned up."),
      );
      revokeObjectUrl(settings.backgroundImageUrl);
      revokeObjectUrl(settings.backgroundVideoUrl);
      if (mediaUrlRef.current) revokeObjectUrl(mediaUrlRef.current);
      mediaUrlRef.current = url;
      onChange(
        kind === "image"
          ? {
              backgroundType: "image",
              backgroundPresetId: null,
              backgroundImageId: id,
              backgroundImageUrl: url,
              backgroundVideoId: null,
              backgroundVideoUrl: null,
            }
          : {
              backgroundType: "video",
              backgroundPresetId: null,
              backgroundVideoId: id,
              backgroundVideoUrl: url,
              backgroundImageId: null,
              backgroundImageUrl: null,
            },
      );
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Could not load media.");
    } finally {
      setUploading(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  function handleTextColorChange(color: string) {
    onChange({ textColor: color });
  }

  function selectPreset(id: string) {
    const patch = applyPresentationPreset(id);
    if (!patch) return;
    revokeObjectUrl(settings.backgroundImageUrl);
    revokeObjectUrl(settings.backgroundVideoUrl);
    if (mediaUrlRef.current) revokeObjectUrl(mediaUrlRef.current);
    mediaUrlRef.current = null;
    onChange(patch);
  }

  async function removeMedia() {
    await Promise.all([
      deleteMedia(settings.backgroundImageId),
      deleteMedia(settings.backgroundVideoId),
    ]).catch(() =>
      notify("error", "The local background could not be removed."),
    );
    revokeObjectUrl(settings.backgroundImageUrl);
    revokeObjectUrl(settings.backgroundVideoUrl);
    if (mediaUrlRef.current) revokeObjectUrl(mediaUrlRef.current);
    mediaUrlRef.current = null;
    onChange({
      backgroundType: "solid",
      backgroundPresetId: null,
      backgroundImageId: null,
      backgroundVideoId: null,
      backgroundImageUrl: null,
      backgroundVideoUrl: null,
    });
  }

  return (
    <div
      className={`${scrollable ? "max-h-[calc(100vh-10rem)] overflow-y-auto" : ""} rounded-lg border border-zinc-200 bg-white shadow-card`}
    >
      <Group title="Preset Themes" dataTour="preset-themes">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESENTATION_PRESETS.map((preset) => {
            const selected = settings.backgroundPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset.id)}
                className={`focus-ring overflow-hidden rounded-md border text-left transition-colors ${
                  selected
                    ? "border-zinc-900 ring-1 ring-zinc-900"
                    : "border-zinc-200 hover:border-zinc-500"
                }`}
                aria-pressed={selected}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preset.asset}
                  alt=""
                  className="h-14 w-full object-cover"
                />
                <span className="block truncate px-2 py-1.5 text-[11px] font-medium text-zinc-700">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Screen">
        <SegmentedControl
          ariaLabel="Aspect ratio"
          value={settings.aspectRatio}
          options={[
            { value: "16:9", label: "16:9" },
            { value: "4:3", label: "4:3" },
          ]}
          onChange={(v) => onChange({ aspectRatio: v })}
        />
      </Group>

      <Group title="Typography">
        <div>
          <Label htmlFor="font-family">Font family</Label>
          <Select
            id="font-family"
            value={settings.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="font-size">Font size</Label>
            <div className="flex items-center gap-2">
              <input
                id="font-size"
                type="range"
                min={14}
                max={72}
                step={2}
                value={settings.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                className="w-full accent-zinc-900"
              />
              <span className="w-10 text-right text-xs tabular-nums text-zinc-500">
                {settings.fontSize}pt
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="max-lines">Max lyric lines / slide</Label>
            <Input
              id="max-lines"
              type="number"
              min={1}
              max={12}
              value={maxLinesInput}
              onChange={(e) => setMaxLinesInput(e.target.value)}
              onBlur={() => {
                const parsed = Number(maxLinesInput);
                const next = Number.isFinite(parsed)
                  ? Math.min(12, Math.max(1, Math.round(parsed)))
                  : settings.maxLinesPerSlide;
                setMaxLinesInput(String(next));
                if (next !== settings.maxLinesPerSlide) {
                  onChange({ maxLinesPerSlide: next });
                }
              }}
            />
            <p className="mt-1 text-[11px] leading-snug text-zinc-400">
              Groups count original lyric lines. If a group does not fit, WFICM
              auto-fits the font or splits it into another slide.
            </p>
          </div>
        </div>
        <div>
          <Label>Font weight</Label>
          <SegmentedControl
            ariaLabel="Font weight"
            value={settings.fontWeight}
            options={[
              { value: "normal", label: "Regular" },
              { value: "bold", label: "Bold" },
            ]}
            onChange={(v) => onChange({ fontWeight: v })}
          />
        </div>
        <div>
          <Label htmlFor="text-color">Text color</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="text-color"
              type="color"
              value={settings.textColor}
              onChange={(e) => handleTextColorChange(e.target.value)}
              className="focus-ring h-8 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
              aria-label="Text color"
            />
            {["#ffffff", "#000000", "#facc15", "#38bdf8", "#f87171"].map(
              (color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleTextColorChange(color)}
                  className="focus-ring h-6 w-6 rounded border border-zinc-300"
                  style={{ backgroundColor: color }}
                  aria-label={`Set text color ${color}`}
                />
              ),
            )}
          </div>
        </div>
        <div>
          <Label>Text alignment</Label>
          <SegmentedControl<TextAlignment>
            ariaLabel="Text alignment"
            value={settings.textAlign}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            onChange={(v) => onChange({ textAlign: v })}
          />
        </div>
      </Group>

      <Group title="Layout">
        <Label>Text position</Label>
        <SegmentedControl<VerticalPosition>
          ariaLabel="Text position"
          value={settings.verticalPosition}
          options={[
            { value: "top", label: "Top" },
            { value: "center", label: "Center" },
            { value: "bottom", label: "Bottom" },
          ]}
          onChange={(v) => onChange({ verticalPosition: v })}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={settings.showSectionLabel}
            onChange={(e) => onChange({ showSectionLabel: e.target.checked })}
            className="h-3.5 w-3.5 accent-zinc-900"
          />
          Show section label on slides
        </label>
      </Group>

      <Group title="Background">
        <SegmentedControl
          ariaLabel="Background type"
          value={settings.backgroundType}
          options={[
            { value: "solid", label: "Solid" },
            { value: "image", label: "Image" },
            { value: "video", label: "Video" },
          ]}
          onChange={(v) =>
            onChange({
              backgroundType: v,
              ...(v === "solid" ? { backgroundPresetId: null } : {}),
            })
          }
        />

        {settings.backgroundType === "solid" ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="focus-ring h-8 w-12 cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
              aria-label="Background color"
            />
            <div className="flex gap-1">
              {["#000000", "#111111", "#1e3a5f", "#2d1b3d", "#f5f5f4"].map(
                (c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ backgroundColor: c })}
                    className="focus-ring h-6 w-6 rounded border border-zinc-300"
                    style={{ backgroundColor: c }}
                    aria-label={`Set background ${c}`}
                  />
                ),
              )}
            </div>
          </div>
        ) : null}

        {settings.backgroundType === "image" ? (
          <div className="space-y-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload("image", e.target.files?.[0])}
            />
            <Button
              size="sm"
              icon={<UploadIcon />}
              loading={uploading === "image"}
              onClick={() => imageInputRef.current?.click()}
            >
              Upload image
            </Button>
            {settings.backgroundImageId || settings.backgroundImageUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
                  <ImageIcon width={12} height={12} className="shrink-0" />
                  Image applied
                </p>
                <Button size="sm" variant="ghost" onClick={removeMedia}>
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {settings.backgroundType === "video" ? (
          <div className="space-y-2">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleUpload("video", e.target.files?.[0])}
            />
            <Button
              size="sm"
              icon={<UploadIcon />}
              loading={uploading === "video"}
              onClick={() => videoInputRef.current?.click()}
            >
              Upload video
            </Button>
            {settings.backgroundVideoId || settings.backgroundVideoUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs leading-relaxed text-zinc-500">
                  Video plays in preview. Exported slides use a dark background,
                  since .pptx does not support video backgrounds.
                </p>
                <Button size="sm" variant="ghost" onClick={removeMedia}>
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Group>
    </div>
  );
}
