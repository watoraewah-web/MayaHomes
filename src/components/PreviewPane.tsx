"use client";

import { useEffect, useRef, useState } from "react";
import { PresentationSettings } from "@/lib/types";
import {
  Slide,
  slideSizePx,
  slidePaddingPx,
  ptToPx,
  LINE_HEIGHT,
} from "@/lib/slides";
import { Button, Select } from "@/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/icons";

/**
 * Renders one slide of the shared slide model on a fixed logical canvas
 * (1280x720 or 960x720 px, 96dpi) scaled to the container width. Because the
 * canvas matches the PowerPoint geometry exactly, the preview shows precisely
 * what the exported .pptx will look like.
 */
function SlideSurface({
  slide,
  settings,
  dimmed = false,
  badge,
  showDate = false,
  editable = false,
  selected = false,
  onSelect,
  onEdit,
  onPositionChange,
}: {
  slide: Slide | null;
  settings: PresentationSettings;
  dimmed?: boolean;
  badge?: string;
  showDate?: boolean;
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: (value: string) => void;
  onPositionChange?: (patch: Partial<PresentationSettings>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [editing, setEditing] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = slideSizePx(settings.aspectRatio);
  const pad = slidePaddingPx(settings.aspectRatio);
  const scale = containerWidth ? containerWidth / W : 0;

  const textColor = settings.textColor;
  const labelColor = textColor;
  const textShadow = undefined;

  const alignClass =
    settings.textAlign === "left"
      ? "items-start"
      : settings.textAlign === "right"
        ? "items-end"
        : "items-center";
  const textAlignStyle = settings.textAlign as React.CSSProperties["textAlign"];
  const justifyClass =
    settings.verticalPosition === "top"
      ? "justify-start"
      : settings.verticalPosition === "bottom"
        ? "justify-end"
        : "justify-center";

  const lyricPx = slide ? ptToPx(slide.fontSize) : ptToPx(settings.fontSize);
  const labelPx = ptToPx(12);
  const labelBox = settings.showSectionLabel ? labelPx * LINE_HEIGHT + 16 : 0;
  const usableH = H - pad.y * 2 - labelBox;

  return (
    <div
      ref={ref}
      className={`relative w-full select-none overflow-hidden rounded-md border border-zinc-700 ${dimmed ? "opacity-60" : ""}`}
      style={{
        aspectRatio: `${W} / ${H}`,
        backgroundColor:
          settings.backgroundType === "video"
            ? "#111111"
            : settings.backgroundColor,
      }}
    >
      {settings.backgroundType === "image" && settings.backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.backgroundImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {settings.backgroundType === "video" && settings.backgroundVideoUrl ? (
        <video
          src={settings.backgroundVideoUrl}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : null}

      {scale > 0 ? (
        <div
          className={`absolute left-0 top-0 flex flex-col ${alignClass}`}
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            padding: `${pad.y}px ${pad.x}px`,
          }}
        >
          {settings.showSectionLabel ? (
            <div
              className="w-full uppercase"
              style={{
                color: labelColor,
                fontSize: labelPx,
                lineHeight: LINE_HEIGHT,
                letterSpacing: "0.14em",
                fontWeight: 600,
                textAlign: textAlignStyle,
                marginBottom: 16,
                textShadow,
              }}
            >
              {slide?.sectionLabel ?? ""}
            </div>
          ) : null}

          <div
            className={`relative flex w-full flex-col ${justifyClass} ${alignClass} ${selected ? "rounded border border-zinc-400/70" : ""}`}
            style={{ height: usableH }}
            onClick={editable ? onSelect : undefined}
            onDoubleClick={editable ? () => setEditing(true) : undefined}
            onKeyDown={
              editable
                ? (event) => {
                    if (
                      (event.key === "Enter" || event.key === " ") &&
                      !editing
                    ) {
                      event.preventDefault();
                      setEditing(true);
                    }
                  }
                : undefined
            }
            role={editable && !editing ? "button" : undefined}
            tabIndex={editable && !editing ? 0 : undefined}
            aria-label={editable && !editing ? "Select lyric text" : undefined}
            onPointerDown={
              editable && selected && !editing
                ? (event) => {
                    pointerStart.current = {
                      x: event.clientX,
                      y: event.clientY,
                    };
                  }
                : undefined
            }
            onPointerUp={
              editable && selected && !editing
                ? (event) => {
                    const start = pointerStart.current;
                    pointerStart.current = null;
                    if (
                      !start ||
                      Math.hypot(
                        event.clientX - start.x,
                        event.clientY - start.y,
                      ) < 8
                    )
                      return;
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const x = (event.clientX - bounds.left) / bounds.width;
                    const y = (event.clientY - bounds.top) / bounds.height;
                    onPositionChange?.({
                      textAlign:
                        x < 0.34 ? "left" : x > 0.66 ? "right" : "center",
                      verticalPosition:
                        y < 0.34 ? "top" : y > 0.66 ? "bottom" : "center",
                    });
                  }
                : undefined
            }
          >
            {slide ? (
              editing && editable ? (
                <textarea
                  autoFocus
                  value={slide.sourceText ?? slide.lines.join("\n")}
                  onChange={(event) => onEdit?.(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setEditing(false);
                    }
                  }}
                  onBlur={() => setEditing(false)}
                  aria-label="Edit slide text"
                  className="w-full resize-none bg-transparent text-inherit outline-none"
                  style={{
                    height: usableH,
                    color: textColor,
                    fontSize: lyricPx,
                    lineHeight: LINE_HEIGHT,
                    fontWeight: settings.fontWeight === "bold" ? 700 : 400,
                    fontFamily: `"${settings.fontFamily}", Arial, sans-serif`,
                    textAlign: textAlignStyle,
                    textShadow,
                  }}
                />
              ) : (
                slide.lines.map((line, i) => (
                  <div
                    key={i}
                    style={{
                      color: textColor,
                      fontSize: lyricPx,
                      lineHeight: LINE_HEIGHT,
                      fontWeight: settings.fontWeight === "bold" ? 700 : 400,
                      fontFamily: `"${settings.fontFamily}", Arial, sans-serif`,
                      textAlign: textAlignStyle,
                      whiteSpace: "pre-wrap",
                      maxWidth: "100%",
                      textShadow,
                    }}
                  >
                    {line || "\u00A0"}
                  </div>
                ))
              )
            ) : (
              <div style={{ color: textColor, opacity: 0.5, fontSize: 20 }}>
                No slides
              </div>
            )}
          </div>
          {showDate && slide?.dateLabel ? (
            <div
              className="absolute"
              style={{
                left: pad.x,
                top: H - pad.y - labelPx,
                width: W - pad.x * 2,
                height: labelPx,
                color: labelColor,
                fontSize: labelPx,
                lineHeight: 1,
                fontFamily: `"${settings.fontFamily}", Arial, sans-serif`,
                textAlign: textAlignStyle,
              }}
            >
              {slide.dateLabel}
            </div>
          ) : null}
        </div>
      ) : null}

      {badge ? (
        <div className="absolute left-2 top-2 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
          {badge}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewPane({
  slides,
  index,
  onIndexChange,
  settings,
  presentationMode = false,
  onExitPresentation,
  editable = false,
  onEditSlide,
  onSettingsChange,
}: {
  slides: Slide[];
  index: number;
  onIndexChange: (i: number) => void;
  settings: PresentationSettings;
  presentationMode?: boolean;
  onExitPresentation?: () => void;
  editable?: boolean;
  onEditSlide?: (slide: Slide, text: string) => void;
  onSettingsChange?: (patch: Partial<PresentationSettings>) => void;
}) {
  const total = slides.length;
  const clamped = total ? Math.min(index, total - 1) : 0;
  const current = total ? slides[clamped] : null;
  const previous = clamped > 0 ? slides[clamped - 1] : null;
  const next = clamped < total - 1 ? slides[clamped + 1] : null;
  const lastNav = useRef(0);
  const [selected, setSelected] = useState(false);
  const [fontSizeInput, setFontSizeInput] = useState("");

  useEffect(() => {
    setFontSizeInput(String(current?.fontSize ?? settings.fontSize));
  }, [current?.fontSize, settings.fontSize]);

  // Keyboard navigation while the preview is on screen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        const now = Date.now();
        if (now - lastNav.current < 150) return;
        lastNav.current = now;
        onIndexChange(Math.max(0, clamped - 1));
      } else if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        e.key === " "
      ) {
        const now = Date.now();
        if (now - lastNav.current < 150) return;
        lastNav.current = now;
        onIndexChange(Math.min(total - 1, clamped + 1));
      } else if (e.key === "Escape" && presentationMode) {
        onExitPresentation?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clamped, total, onIndexChange]);

  const content = (
    <div className={presentationMode ? "mx-auto w-full max-w-[1500px]" : ""}>
      {presentationMode ? (
        <div className="mb-4 flex items-center justify-between text-white">
          <span className="text-sm font-medium">
            {current?.songTitle ?? "Worship Set"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={<CloseIcon />}
            className="text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={onExitPresentation}
          >
            Exit Presentation
          </Button>
        </div>
      ) : null}
      {editable && current ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white p-2 text-xs shadow-card">
          <span className="mr-1 font-medium text-zinc-500">Text</span>
          <Select
            value={settings.fontFamily}
            onChange={(event) =>
              onSettingsChange?.({ fontFamily: event.target.value })
            }
            className="h-8 w-32 py-0 text-xs"
            aria-label="Preview font family"
          >
            {[
              "Arial",
              "Calibri",
              "Georgia",
              "Helvetica",
              "Tahoma",
              "Times New Roman",
              "Verdana",
            ].map((font) => (
              <option key={font}>{font}</option>
            ))}
          </Select>
          <input
            type="text"
            inputMode="decimal"
            value={fontSizeInput}
            onChange={(event) => {
              const value = event.target.value;
              setFontSizeInput(value);
              const parsed = Number(value);
              if (Number.isFinite(parsed) && parsed >= 72) {
                setFontSizeInput("72");
                onSettingsChange?.({ fontSize: 72 });
                return;
              }
              if (value.trim() && Number.isFinite(parsed) && parsed >= 14)
                onSettingsChange?.({ fontSize: parsed });
            }}
            onBlur={() => {
              const parsed = Number(fontSizeInput);
              const fontSize = Number.isFinite(parsed)
                ? Math.min(72, Math.max(14, parsed))
                : (current?.fontSize ?? settings.fontSize);
              setFontSizeInput(String(fontSize));
              onSettingsChange?.({ fontSize });
            }}
            className="focus-ring h-8 w-16 rounded-md border border-zinc-300 px-2 text-xs"
            aria-label="Preview font size"
          />
          <span className="text-zinc-400">Maximum font size is 72.</span>
          <Button
            size="sm"
            variant={settings.fontWeight === "bold" ? "primary" : "secondary"}
            onClick={() =>
              onSettingsChange?.({
                fontWeight: settings.fontWeight === "bold" ? "normal" : "bold",
              })
            }
            aria-label="Toggle bold text"
          >
            Bold
          </Button>
          {(["left", "center", "right"] as const).map((align) => (
            <Button
              key={align}
              size="sm"
              variant={settings.textAlign === align ? "primary" : "secondary"}
              onClick={() => onSettingsChange?.({ textAlign: align })}
            >
              {align}
            </Button>
          ))}
          {(["top", "center", "bottom"] as const).map((position) => (
            <Button
              key={position}
              size="sm"
              variant={
                settings.verticalPosition === position ? "primary" : "secondary"
              }
              onClick={() => onSettingsChange?.({ verticalPosition: position })}
            >
              {position}
            </Button>
          ))}
          <span className="text-zinc-400">
            Click text to select, double-click to edit
          </span>
        </div>
      ) : null}
      <SlideSurface
        slide={current}
        settings={settings}
        showDate={clamped === 0}
        editable={editable}
        selected={selected}
        onSelect={() => setSelected(true)}
        onEdit={(text) => current && onEditSlide?.(current, text)}
        onPositionChange={onSettingsChange}
      />

      <div className="mt-3 flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          icon={<ChevronLeftIcon />}
          onClick={() => onIndexChange(Math.max(0, clamped - 1))}
          disabled={clamped <= 0}
          aria-label="Previous slide"
        >
          Prev
        </Button>
        <div className="flex-1 text-center text-xs text-zinc-500">
          Slide {total ? clamped + 1 : 0} of {total}
          {current && current.totalSlidesInSection > 1 ? (
            <span className="text-zinc-400">
              {" "}
              · {current.sectionLabel} {current.slideNumberInSection}/
              {current.totalSlidesInSection}
            </span>
          ) : null}
          {current && current.fontSize < settings.fontSize ? (
            <span className="text-zinc-400">
              {" "}
              · auto-fit {current.fontSize}pt
            </span>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onIndexChange(Math.min(total - 1, clamped + 1))}
          disabled={clamped >= total - 1}
          aria-label="Next slide"
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>

      {!presentationMode ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Previous
            </p>
            <SlideSurface slide={previous} settings={settings} dimmed />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Next
            </p>
            <SlideSurface slide={next} settings={settings} dimmed />
          </div>
        </div>
      ) : null}

      {total > 0 ? (
        <div className="mt-4 flex max-w-full flex-wrap gap-1 overflow-x-auto overflow-y-hidden pb-1">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onIndexChange(i)}
              title={`${s.sectionLabel} — slide ${i + 1}`}
              className={`focus-ring h-5 min-w-5 rounded-sm border px-1 text-[9px] leading-none transition-colors ${
                i === clamped ? "bg-zinc-900" : "bg-zinc-300 hover:bg-zinc-400"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );

  return presentationMode ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950 p-4 sm:p-8">
      {content}
    </div>
  ) : (
    <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
      {content}
    </div>
  );
}
