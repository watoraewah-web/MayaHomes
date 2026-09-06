"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSectionsForSongs,
  saveSections,
  fetchSongs,
  fetchWorshipSet,
  fetchWorshipSetSongs,
  friendlyError,
  saveWorshipSetSongs,
  updateWorshipSet,
} from "@/lib/supabase/data";
import { buildWorshipSetSlides, replaceSlideSource, Slide } from "@/lib/slides";
import {
  DEFAULT_SETTINGS,
  PresentationSettings,
  Song,
  SongSection,
  WorshipSet,
  WorshipSetSong,
} from "@/lib/types";
import { PreviewPane } from "@/components/PreviewPane";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  PageLoader,
  Spinner,
} from "@/components/ui";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
  DownloadIcon,
  PlusIcon,
  PresentationsIcon,
  SearchIcon,
} from "@/components/icons";

type SaveState = "saved" | "saving" | "error";

export default function WorshipSetEditorPage() {
  const params = useParams<{ id: string }>();
  const setId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [set, setSet] = useState<WorshipSet | null>(null);
  const [items, setItems] = useState<WorshipSetSong[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [sections, setSections] = useState<Record<string, SongSection[]>>({});
  const [settings, setSettings] =
    useState<PresentationSettings>(DEFAULT_SETTINGS);
  const [name, setName] = useState("");
  const [titleSlides, setTitleSlides] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [generating, setGenerating] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [addingSongId, setAddingSongId] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);
  const addedReturnSong = useRef(false);
  const operationStatusRef = useRef<string | null>(null);
  const songSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  function updateOperationStatus(message: string | null) {
    operationStatusRef.current = message;
    setOperationStatus(message);
  }

  useEffect(() => {
    Promise.all([
      fetchWorshipSet(setId),
      fetchWorshipSetSongs(setId),
      fetchSongs(),
    ])
      .then(async ([loadedSet, loadedItems, library]) => {
        if (!loadedSet) throw new Error("Worship set not found.");
        const uniqueSongs = loadedItems
          .map((item) => item.song)
          .filter((song): song is Song => Boolean(song));
        const sectionsBySong = await fetchSectionsForSongs(
          uniqueSongs.map((song) => song.id),
        );
        setSet(loadedSet);
        setName(loadedSet.name);
        setSettings(loadedSet.settings);
        setTitleSlides(loadedSet.add_song_title_slides);
        setItems(loadedItems);
        setSongs(library);
        setSections(sectionsBySong);
        loaded.current = true;
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, [setId]);

  useEffect(() => {
    if (loading) return;
    const frame = requestAnimationFrame(() => setPreparing(false));
    return () => cancelAnimationFrame(frame);
  }, [loading]);

  useEffect(() => {
    const songId = searchParams.get("songId");
    if (
      !songId ||
      !loaded.current ||
      addedReturnSong.current ||
      items.some((item) => item.song_id === songId)
    )
      return;
    const song = songs.find((item) => item.id === songId);
    if (!song) return;
    addedReturnSong.current = true;
    void addSong(song);
    router.replace(`/worship-sets/${setId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs, items, searchParams, setId]);

  const slides = useMemo(
    () =>
      buildWorshipSetSlides(
        items.flatMap((item) =>
          item.song
            ? [
                {
                  title: item.song.title,
                  artist: item.song.artist,
                  sections: sections[item.song.id] ?? [],
                },
              ]
            : [],
        ),
        settings,
        titleSlides,
      ),
    [items, sections, settings, titleSlides],
  );

  useEffect(() => {
    if (!loaded.current || !set) return;
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const adding = operationStatusRef.current === "Adding song...";
      if (adding) updateOperationStatus("Saving song to worship set...");
      try {
        await updateWorshipSet(set.id, {
          name: name.trim() || "Untitled Worship Set",
          settings,
          add_song_title_slides: titleSlides,
        });
        await saveWorshipSetSongs(
          set.id,
          items.map((item) => item.song_id),
        );
        setSaveState("saved");
        if (adding) updateOperationStatus(null);
      } catch (e) {
        setError(friendlyError(e));
        setSaveState("error");
        if (adding) updateOperationStatus(null);
      }
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [name, settings, titleSlides, items, set]);

  useEffect(() => {
    if (searchParams.get("download") !== "1" || loading || !set) return;
    const timer = setTimeout(() => void handleGenerate(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, set]);

  async function addSong(song: Song) {
    if (items.some((item) => item.song_id === song.id) || addingSongId) return;
    setAddingSongId(song.id);
    updateOperationStatus("Adding song...");
    try {
      setItems((prev) => [
        ...prev,
        {
          id: `local-${song.id}`,
          worship_set_id: setId,
          song_id: song.id,
          song_order: prev.length,
          song,
        },
      ]);
      setSections((prev) => ({ ...prev, [song.id]: prev[song.id] ?? [] }));
      setShowAdd(false);
    } finally {
      setAddingSongId(null);
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, song_order) => ({ ...item, song_order }));
    });
  }

  function dropItem(targetIndex: number) {
    if (dragIndex == null || dragIndex === targetIndex) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((item, song_order) => ({ ...item, song_order }));
    });
    setDragIndex(null);
  }

  function removeSong(songId: string) {
    setItems((prev) =>
      prev
        .filter((item) => item.song_id !== songId)
        .map((item, song_order) => ({ ...item, song_order })),
    );
  }

  function editPreviewSlide(slide: Slide, text: string) {
    if (slide.isSongTitle || slide.songIndex == null || slide.sectionIndex < 0)
      return;
    const item = items[slide.songIndex];
    if (!item?.song) return;
    const songId = item.song.id;
    updateOperationStatus("Saving song...");
    setSections((prev) => ({
      ...prev,
      [songId]: (prev[songId] ?? []).map((section, index) =>
        index === slide.sectionIndex
          ? {
              ...section,
              content: replaceSlideSource(section.content, slide, text),
            }
          : section,
      ),
    }));
    if (songSaveTimers.current[songId])
      clearTimeout(songSaveTimers.current[songId]);
    songSaveTimers.current[songId] = setTimeout(async () => {
      const nextSections = sectionsRef.current[songId] ?? [];
      try {
        await saveSections(
          songId,
          nextSections.map((section) => ({
            section_type: section.section_type,
            section_label: section.section_label,
            content: section.content,
          })),
        );
        updateOperationStatus(null);
      } catch (e) {
        setError(friendlyError(e));
        updateOperationStatus(null);
      }
    }, 700);
  }

  async function handleGenerate() {
    if (generating) return;
    if (!slides.length) {
      setError("Add at least one song with lyrics before generating.");
      return;
    }
    setGenerating(true);
    updateOperationStatus(
      "Generating your PowerPoint. This may take a moment...",
    );
    try {
      await updateWorshipSet(setId, {
        name: name.trim() || "Untitled Worship Set",
        settings,
        add_song_title_slides: titleSlides,
      });
      await saveWorshipSetSongs(
        setId,
        items.map((item) => item.song_id),
      );
      const { generateWorshipSetPowerPoint } = await import("@/lib/pptx");
      await generateWorshipSetPowerPoint({ setTitle: name, slides, settings });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setGenerating(false);
      updateOperationStatus(null);
    }
  }

  if (loading)
    return (
      <PageLoader label="Loading worship set... Loading songs and presentation data" />
    );
  if (error && !set)
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    );
  if (!set) return null;

  const filteredSongs = songs.filter(
    (song) =>
      !items.some((item) => item.song_id === song.id) &&
      (song.title.toLowerCase().includes(search.toLowerCase()) ||
        (song.artist ?? "").toLowerCase().includes(search.toLowerCase())),
  );
  const current = slides[slideIndex];
  const currentSong =
    current?.songIndex == null ? null : items[current.songIndex]?.song;
  const presentationMode = searchParams.get("present") === "1";
  const saveLabel =
    saveState === "saving"
      ? "Saving..."
      : saveState === "error"
        ? "Save failed"
        : "All changes saved";

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-transparent bg-transparent !px-0 text-xl font-semibold tracking-tight hover:border-zinc-200 focus:bg-white"
            aria-label="Worship set name"
          />
          <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
            {saveState === "saving" ? <Spinner className="h-3 w-3" /> : null}
            {saveLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<PresentationsIcon />}
            onClick={() => router.push(`/worship-sets/${setId}?present=1`)}
          >
            Present
          </Button>
          <Button
            variant="primary"
            icon={<DownloadIcon />}
            loading={generating}
            onClick={handleGenerate}
          >
            {generating
              ? "Generating PowerPoint..."
              : "Generate Full PowerPoint"}
          </Button>
        </div>
      </div>
      {operationStatus ? (
        <p
          className="mb-4 flex items-center gap-2 text-sm text-zinc-500"
          role="status"
        >
          <Spinner className="h-3 w-3" /> {operationStatus}
        </p>
      ) : null}
      {error ? (
        <div className="mb-4">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Songs{" "}
              <span className="font-normal normal-case text-zinc-400">
                ({items.length})
              </span>
            </h2>
            <Button
              size="sm"
              variant="secondary"
              icon={<PlusIcon />}
              onClick={() => setShowAdd(true)}
            >
              Add Song
            </Button>
          </div>
          {items.length === 0 ? (
            <Card className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-900">
                No songs added yet.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Add songs from your library or create a new song.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="secondary" onClick={() => setShowAdd(true)}>
                  Add Song
                </Button>
                <Link
                  href={`/songs/new?returnTo=/worship-sets/${setId}`}
                  className="focus-ring inline-flex h-9 items-center rounded-md border border-zinc-900 bg-zinc-900 px-3.5 text-sm font-medium text-white"
                >
                  Add New Song
                </Link>
              </div>
            </Card>
          ) : (
            <Card className="divide-y divide-zinc-100">
              {items.map((item, index) => (
                <div
                  key={item.song_id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropItem(index)}
                  className="flex cursor-grab items-center gap-3 px-4 py-3 active:cursor-grabbing"
                >
                  <span className="w-7 text-xs font-semibold text-zinc-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {item.song?.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {item.song?.artist || "No artist"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<ChevronUpIcon />}
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                      aria-label={`Move ${item.song?.title} up`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<ChevronDownIcon />}
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                      aria-label={`Move ${item.song?.title} down`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<DeleteIcon />}
                      className="text-zinc-500 hover:text-red-600"
                      onClick={() => removeSong(item.song_id)}
                      aria-label={`Remove ${item.song?.title}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
          {items.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={<PlusIcon />}
                onClick={() => setShowAdd(true)}
              >
                Add Song
              </Button>
              <Link
                href={`/songs/new?returnTo=/worship-sets/${setId}`}
                className="focus-ring inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
              >
                Add New Song
              </Link>
            </div>
          ) : null}
          <Card className="mt-6 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Presentation Settings
            </h2>
            <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={titleSlides}
                onChange={(e) => setTitleSlides(e.target.checked)}
              />{" "}
              Add song title slide
            </label>
            <div className="mt-4">
              <SettingsPanel
                settings={settings}
                onChange={(patch) =>
                  setSettings((prev) => ({ ...prev, ...patch }))
                }
              />
            </div>
          </Card>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Set Preview
            </h2>
            <span className="text-xs text-zinc-400">
              {slides.length} slide{slides.length === 1 ? "" : "s"} ·{" "}
              {settings.aspectRatio}
            </span>
          </div>
          {preparing ? (
            <Card className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">
              <span className="flex items-center gap-2" role="status">
                <Spinner className="h-4 w-4" /> Preparing presentation...
              </span>
            </Card>
          ) : slides.length === 0 ? (
            <Card className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">
              No slides available.
            </Card>
          ) : null}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {items.map((item, songIndex) => {
              const firstSlide = slides.findIndex(
                (slide) => slide.songIndex === songIndex,
              );
              return (
                <button
                  key={item.song_id}
                  type="button"
                  className={`focus-ring rounded-md border px-2 py-1 text-xs ${current?.songIndex === songIndex ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"}`}
                  onClick={() => setSlideIndex(Math.max(0, firstSlide))}
                >
                  {String(songIndex + 1).padStart(2, "0")} {item.song?.title}
                </button>
              );
            })}
          </div>
          {currentSong ? (
            <div className="mb-2 text-xs text-zinc-500">
              Song {(current?.songIndex ?? 0) + 1} of {items.length} ·{" "}
              {currentSong.title}
            </div>
          ) : null}
          {!preparing && slides.length > 0 ? (
            <PreviewPane
              slides={slides}
              index={slideIndex}
              onIndexChange={setSlideIndex}
              settings={settings}
              editable
              onEditSlide={editPreviewSlide}
              onSettingsChange={(patch) =>
                setSettings((prev) => ({ ...prev, ...patch }))
              }
              presentationMode={presentationMode}
              onExitPresentation={() =>
                router.replace(`/worship-sets/${setId}`)
              }
            />
          ) : null}
        </div>
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <Card className="max-h-[80vh] w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">
                Add Song
              </h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdd(false)}
              >
                Close
              </Button>
            </div>
            <div className="p-5">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search songs"
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="mt-4 max-h-80 divide-y divide-zinc-100 overflow-y-auto">
                {filteredSongs.length ? (
                  filteredSongs.map((song) => (
                    <div key={song.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {song.title}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {song.artist || "No artist"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={addingSongId === song.id}
                        disabled={Boolean(addingSongId)}
                        onClick={() => void addSong(song)}
                      >
                        {addingSongId === song.id ? "Adding song..." : "Add"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No matching songs.
                  </p>
                )}
              </div>
              <Link
                href={`/songs/new?returnTo=/worship-sets/${setId}`}
                className="mt-4 inline-flex text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
              >
                Create a new song
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
