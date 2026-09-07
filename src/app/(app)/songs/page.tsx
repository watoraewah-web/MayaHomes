"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSong,
  fetchSongs,
  fetchSectionsForSongs,
  fetchPresentationForSong,
  createWorshipSet,
  saveWorshipSetSongs,
  friendlyError,
} from "@/lib/supabase/data";
import {
  Song,
  SongSection,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { useNotifications } from "@/components/Notifications";
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  PageLoader,
} from "@/components/ui";
import {
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  PlusIcon,
  PreviewIcon,
  SearchIcon,
  SongsIcon,
  FileIcon,
} from "@/components/icons";

export default function SongsPage() {
  const router = useRouter();
  const { notify, requestConfirmation } = useNotifications();
  const [songs, setSongs] = useState<Song[]>([]);
  const [sectionsBySong, setSectionsBySong] = useState<
    Record<string, SongSection[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busySongId, setBusySongId] = useState<string | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [creatingSet, setCreatingSet] = useState(false);

  useEffect(() => {
    fetchSongs()
      .then(async (rows) => {
        setSongs(rows);
        setSectionsBySong(
          await fetchSectionsForSongs(rows.map((song) => song.id)),
        );
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? "").toLowerCase().includes(q),
    );
  }, [songs, search]);

  async function handleDelete(song: Song) {
    if (
      !(await requestConfirmation({
        title: "Delete song?",
        message: `Delete "${song.title}" and all of its sections? This cannot be undone.`,
        confirmLabel: "Delete song",
      }))
    )
      return;
    setActionError(null);
    try {
      await deleteSong(song.id);
      setSongs((rows) => rows.filter((s) => s.id !== song.id));
      setSelectedSongIds((ids) => ids.filter((id) => id !== song.id));
      notify("success", `Deleted "${song.title}".`);
    } catch (e) {
      setActionError(friendlyError(e));
      notify("error", friendlyError(e));
    }
  }

  function toggleSongSelection(songId: string) {
    setSelectedSongIds((ids) =>
      ids.includes(songId)
        ? ids.filter((id) => id !== songId)
        : [...ids, songId],
    );
  }

  function toggleAllSongs() {
    setSelectedSongIds((ids) =>
      ids.length === songs.length ? [] : songs.map((song) => song.id),
    );
  }

  async function handleAddSelectedToWorshipSet() {
    if (selectedSongIds.length === 0 || creatingSet) return;
    setCreatingSet(true);
    setActionError(null);
    try {
      const set = await createWorshipSet("Sunday Worship");
      const selectedInSongOrder = songs
        .filter((song) => selectedSongIds.includes(song.id))
        .map((song) => song.id);
      await saveWorshipSetSongs(set.id, selectedInSongOrder);
      setSelectedSongIds([]);
      router.replace(`/worship-sets/${set.id}`);
    } catch (e) {
      setActionError(friendlyError(e));
      setCreatingSet(false);
    }
  }

  async function handleGenerate(song: Song) {
    setBusySongId(song.id);
    setActionError(null);
    try {
      const sections = sectionsBySong[song.id] ?? [];
      const presentation = await fetchPresentationForSong(song.id);
      const settings = presentation
        ? normalizeSettings(presentation.settings)
        : DEFAULT_SETTINGS;
      const { generatePowerPoint } = await import("@/lib/pptx");
      await generatePowerPoint({
        songTitle: song.title,
        artist: song.artist,
        slides: buildSlides(sections, settings),
        settings,
      });
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      setBusySongId(null);
    }
  }

  function formatDate(iso?: string): string {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Songs
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            All songs you have created in Warrior of Faith International
            Christian Ministry.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon />}
          onClick={() => router.push("/songs/new")}
        >
          Create New Song
        </Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs by title or artist"
          className="pl-9"
          aria-label="Search songs"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 shadow-card">
        <label className="flex min-h-9 items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={
              songs.length > 0 && selectedSongIds.length === songs.length
            }
            onChange={toggleAllSongs}
            disabled={songs.length === 0 || creatingSet}
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            aria-label="Select all songs"
          />
          Select All
        </label>
        <span className="text-sm text-zinc-500">
          {selectedSongIds.length} song{selectedSongIds.length === 1 ? "" : "s"}{" "}
          selected
        </span>
        <Button
          size="sm"
          variant="primary"
          loading={creatingSet}
          disabled={selectedSongIds.length === 0 || creatingSet}
          onClick={handleAddSelectedToWorshipSet}
          className="ml-auto"
        >
          {creatingSet ? "Creating Worship Set..." : "Add to Worship Set"}
        </Button>
      </div>

      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      {actionError ? (
        <div className="mb-4">
          <ErrorMessage>{actionError}</ErrorMessage>
        </div>
      ) : null}

      {loading ? (
        <PageLoader label="Loading songs" />
      ) : songs.length === 0 ? (
        <EmptyState
          icon={<SongsIcon width={20} height={20} />}
          title="No songs yet"
          description="Create your first song by pasting its lyrics."
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => router.push("/songs/new")}
            >
              Create New Song
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon width={20} height={20} />}
          title="No matches"
          description={`No songs match "${search}".`}
        />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {filtered.map((song) => {
            const sectionCount = sectionsBySong[song.id]?.length ?? 0;
            return (
              <div
                key={song.id}
                className={`flex min-w-0 flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${selectedSongIds.includes(song.id) ? "bg-zinc-50" : ""}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSongIds.includes(song.id)}
                    onChange={() => toggleSongSelection(song.id)}
                    disabled={creatingSet}
                    className="mt-2 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
                    aria-label={`Select ${song.title}`}
                  />
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400">
                    <FileIcon width={15} height={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {song.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {song.artist?.trim() ? `${song.artist} · ` : ""}
                      {sectionCount} section{sectionCount === 1 ? "" : "s"} ·{" "}
                      {formatDate(song.updated_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<EditIcon />}
                    onClick={() => router.push(`/songs/${song.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<PreviewIcon />}
                    onClick={() => router.push(`/songs/${song.id}?tab=preview`)}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<DownloadIcon />}
                    loading={busySongId === song.id}
                    onClick={() => handleGenerate(song)}
                  >
                    {busySongId === song.id
                      ? "Generating PowerPoint..."
                      : "PowerPoint"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<DeleteIcon />}
                    className="text-zinc-500 hover:text-red-600"
                    onClick={() => handleDelete(song)}
                    aria-label={`Delete ${song.title}`}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push("/worship-sets")}
                  >
                    Add to Worship Set
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
