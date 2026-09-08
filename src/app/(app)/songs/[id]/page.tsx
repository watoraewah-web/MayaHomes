"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadSongWorkspace,
  saveSections,
  updateSong,
  upsertPresentation,
  friendlyError,
} from "@/lib/supabase/data";
import {
  Song,
  SongSection,
  SectionType,
  PresentationSettings,
  DEFAULT_SETTINGS,
} from "@/lib/types";
import { buildSlides, replaceSlideSource, Slide } from "@/lib/slides";
import {
  EditorSection,
  SectionCard,
  makeSectionKey,
} from "@/components/SectionCard";
import { PreviewPane } from "@/components/PreviewPane";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useNotifications } from "@/components/Notifications";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageLoader,
  Spinner,
} from "@/components/ui";
import {
  DownloadIcon,
  EditIcon,
  PlusIcon,
  PreviewIcon,
} from "@/components/icons";

type SaveState = "saved" | "saving" | "unsaved" | "error";

function rowsToEditorSections(rows: SongSection[]): EditorSection[] {
  return rows.map((r) => ({
    key: makeSectionKey(),
    section_type: r.section_type as SectionType,
    section_label: r.section_label,
    content: r.content,
  }));
}

export default function SongEditorPage() {
  const params = useParams<{ id: string }>();
  const songId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify, requestConfirmation } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [song, setSong] = useState<Song | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [settings, setSettings] = useState<PresentationSettings | null>(null);
  const [tab, setTab] = useState<"sections" | "preview">(
    searchParams.get("tab") === "preview" ? "preview" : "sections",
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draggedSectionKey, setDraggedSectionKey] = useState<string | null>(
    null,
  );
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

  const loadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  useEffect(() => {
    let active = true;
    loadSongWorkspace(songId)
      .then((workspace) => {
        if (!active) return;
        if (!workspace) {
          setNotFound(true);
          return;
        }
        setSong(workspace.song);
        setTitle(workspace.song.title);
        setArtist(workspace.song.artist ?? "");
        setSections(rowsToEditorSections(workspace.sections));
        setSettings(workspace.settings);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setLoadError(friendlyError(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [songId]);

  // Mark unsaved on any edit, then debounce a save back to Supabase.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (!song) return;
    const version = saveVersionRef.current + 1;
    saveVersionRef.current = version;
    setSaveState("unsaved");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = sectionsRef.current;
      const save = async () => {
        if (saveVersionRef.current === version) {
          setSaveState("saving");
          setSaveError(null);
        }
        try {
          await updateSong(song.id, {
            title: title.trim() || "Untitled",
            artist,
          });
          await saveSections(
            song.id,
            current.map((s) => ({
              section_type: s.section_type,
              section_label: s.section_label,
              content: s.content,
            })),
          );
          if (saveVersionRef.current === version) setSaveState("saved");
        } catch (e) {
          if (saveVersionRef.current !== version) return;
          setSaveError(friendlyError(e));
          setSaveState("error");
        }
      };
      saveQueueRef.current = saveQueueRef.current.then(save, save);
    }, 900);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, artist, sections]);

  useEffect(() => {
    if (!loading && song) loadedRef.current = true;
  }, [loading, song]);

  const effectiveSettings = settings ?? DEFAULT_SETTINGS;

  const slides = useMemo(
    () => buildSlides(sections, effectiveSettings),
    [sections, effectiveSettings],
  );

  const patchSection = useCallback(
    (key: string, patch: Partial<EditorSection>) => {
      setSections((prev) =>
        prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const deleteSection = useCallback(
    async (key: string) => {
      if (
        !(await requestConfirmation({
          title: "Delete section?",
          message: "This section and its lyrics will be removed from the song.",
          confirmLabel: "Delete section",
        }))
      )
        return;
      const next = sections.filter((section) => section.key !== key);
      setSections(next);
      if (song) {
        try {
          await saveSections(
            song.id,
            next.map(({ section_type, section_label, content }) => ({
              section_type,
              section_label,
              content,
            })),
          );
          notify("success", "Section deleted.");
        } catch (e) {
          const message = friendlyError(e);
          setSaveError(message);
          notify("error", message);
        }
      }
    },
    [notify, requestConfirmation, sections, song],
  );

  const duplicateSection = useCallback((key: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1) return prev;
      const copy = {
        ...prev[idx],
        key: makeSectionKey(),
        section_label: prev[idx].section_label,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const moveSection = useCallback((key: string, direction: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      const target = idx + direction;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const reorderSection = useCallback(
    (targetKey: string, before: boolean) => {
      if (!draggedSectionKey || draggedSectionKey === targetKey) return;
      setSections((prev) => {
        const draggedIndex = prev.findIndex(
          (section) => section.key === draggedSectionKey,
        );
        const targetIndex = prev.findIndex(
          (section) => section.key === targetKey,
        );
        if (draggedIndex === -1 || targetIndex === -1) return prev;

        const next = [...prev];
        const [dragged] = next.splice(draggedIndex, 1);
        const adjustedTargetIndex = next.findIndex(
          (section) => section.key === targetKey,
        );
        next.splice(adjustedTargetIndex + (before ? 0 : 1), 0, dragged);
        return next;
      });
    },
    [draggedSectionKey],
  );

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        key: makeSectionKey(),
        section_type: "verse",
        section_label: "Verse",
        content: "",
      },
    ]);
  }

  function editPreviewSlide(slide: Slide, text: string) {
    if (slide.isSongTitle || slide.sectionIndex < 0) return;
    setSections((prev) =>
      prev.map((section, index) =>
        index === slide.sectionIndex
          ? {
              ...section,
              content: replaceSlideSource(section.content, slide, text),
            }
          : section,
      ),
    );
  }

  async function handleGenerate() {
    setGenError(null);
    if (sections.length === 0) {
      setGenError("Add at least one section before generating the PowerPoint.");
      return;
    }
    setGenerating(true);
    try {
      // Persist the latest state and settings before exporting.
      if (song) {
        await updateSong(song.id, {
          title: title.trim() || "Untitled",
          artist,
        });
        await saveSections(
          song.id,
          sections.map((s) => ({
            section_type: s.section_type,
            section_label: s.section_label,
            content: s.content,
          })),
        );
        await upsertPresentation(song.id, effectiveSettings);
      }
      const { generatePowerPoint } = await import("@/lib/pptx");
      await generatePowerPoint({
        songTitle: title.trim() || "Untitled",
        artist,
        slides,
        settings: effectiveSettings,
      });
    } catch (e) {
      setGenError(friendlyError(e));
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <PageLoader label="Loading song" />;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Song not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This song does not exist or belongs to another account.
        </p>
        <Button
          className="mt-5"
          variant="primary"
          onClick={() => router.push("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ErrorMessage>{loadError}</ErrorMessage>
      </div>
    );
  }

  const saveLabel: Record<SaveState, string> = {
    saved: "All changes saved",
    saving: "Saving…",
    unsaved: "Unsaved changes",
    error: "Save failed",
  };

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      {/* Toolbar */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter song title"
              className="border-transparent bg-transparent !px-0 text-xl font-semibold tracking-tight hover:border-zinc-200 focus:bg-white"
              aria-label="Song title"
              maxLength={200}
            />
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name (optional)"
                className="h-8 w-full border-transparent bg-transparent !px-0 text-sm text-zinc-500 hover:border-zinc-200 focus:bg-white sm:max-w-[220px]"
                aria-label="Artist"
                maxLength={200}
              />
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                {saveState === "saving" ? (
                  <Spinner className="h-3 w-3" />
                ) : saveState === "saved" ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : null}
                {saveLabel[saveState]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon={<PreviewIcon />}
              onClick={() => setTab(tab === "preview" ? "sections" : "preview")}
              className="xl:hidden"
            >
              {tab === "preview" ? "Edit Sections" : "Preview"}
            </Button>
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              loading={generating}
              onClick={handleGenerate}
            >
              {generating ? "Generating PowerPoint..." : "Generate PowerPoint"}
            </Button>
          </div>
        </div>
        {saveError ? (
          <div className="mt-3">
            <ErrorMessage>{saveError}</ErrorMessage>
          </div>
        ) : null}
        {generating ? (
          <p
            className="mt-3 flex items-center gap-2 text-sm text-zinc-500"
            role="status"
          >
            <Spinner className="h-3 w-3" /> Generating your PowerPoint. This may
            take a moment...
          </p>
        ) : null}
        {genError ? (
          <div className="mt-3">
            <ErrorMessage>{genError}</ErrorMessage>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Sections editor */}
        <div className={tab === "preview" ? "hidden xl:block" : "block"}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              <EditIcon width={14} height={14} />
              Sections
              <span className="font-normal normal-case text-zinc-400">
                ({sections.length})
              </span>
            </h2>
            <Link
              href="/songs/new"
              className="focus-ring text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
            >
              Create another song
            </Link>
          </div>

          {sections.length === 0 ? (
            <Card className="px-6 py-10 text-center text-sm text-zinc-500">
              No sections yet. Add one below to start building the presentation.
            </Card>
          ) : (
            <div className="space-y-3">
              {sections.map((section, i) => (
                <SectionCard
                  key={section.key}
                  index={i}
                  total={sections.length}
                  section={section}
                  onChange={(patch) => patchSection(section.key, patch)}
                  onDelete={() => deleteSection(section.key)}
                  onDuplicate={() => duplicateSection(section.key)}
                  onMove={(dir) => moveSection(section.key, dir)}
                  onDragStart={() => setDraggedSectionKey(section.key)}
                  onDragOver={(before) => setDropTargetKey(section.key)}
                  onDrop={(before) => {
                    reorderSection(section.key, before);
                    setDraggedSectionKey(null);
                    setDropTargetKey(null);
                  }}
                  onDragEnd={() => {
                    setDraggedSectionKey(null);
                    setDropTargetKey(null);
                  }}
                  isDropTarget={
                    dropTargetKey === section.key &&
                    draggedSectionKey !== section.key
                  }
                />
              ))}
            </div>
          )}

          <Button
            className="mt-4 w-full"
            variant="secondary"
            icon={<PlusIcon />}
            onClick={addSection}
          >
            Add Section
          </Button>
        </div>

        {/* Preview + settings */}
        <div
          className={`${tab === "sections" ? "hidden xl:block" : "block"} min-h-0 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-1`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Preview
            </h2>
            <span className="text-xs text-zinc-400">
              {slides.length} slide{slides.length === 1 ? "" : "s"} ·{" "}
              {effectiveSettings.aspectRatio}
            </span>
          </div>
          <PreviewPane
            slides={slides}
            index={slideIndex}
            onIndexChange={setSlideIndex}
            settings={effectiveSettings}
            editable
            onEditSlide={editPreviewSlide}
            onSettingsChange={(patch) =>
              setSettings((prev) => ({
                ...(prev ?? effectiveSettings),
                ...patch,
              }))
            }
          />
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Presentation Settings
            </h2>
            <SettingsPanel
              settings={effectiveSettings}
              onChange={(patch) =>
                setSettings((prev) => ({
                  ...(prev ?? effectiveSettings),
                  ...patch,
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
