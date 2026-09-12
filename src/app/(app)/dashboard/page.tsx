"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSongs,
  friendlyError,
  deleteSong,
  fetchWorshipSets,
} from "@/lib/supabase/data";
import { Song, WorshipSet } from "@/lib/types";
import { buildSlides } from "@/lib/slides";
import { DEFAULT_SETTINGS, normalizeSettings } from "@/lib/types";
import { fetchPresentationForSong } from "@/lib/supabase/data";
import { useNotifications } from "@/components/Notifications";
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageLoader,
} from "@/components/ui";
import {
  DeleteIcon,
  DownloadIcon,
  EditIcon,
  PlusIcon,
  PreviewIcon,
  SongsIcon,
  FileIcon,
} from "@/components/icons";

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DashboardPage() {
  const router = useRouter();
  const { notify, requestConfirmation } = useNotifications();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busySongId, setBusySongId] = useState<string | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
  const [sets, setSets] = useState<WorshipSet[]>([]);

  useEffect(() => {
    Promise.all([fetchSongs(), fetchWorshipSets()])
      .then(([songRows, setRows]) => {
        setSongs(songRows);
        setSets(setRows);
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(song: Song) {
    if (
      !(await requestConfirmation({
        title: "Delete song?",
        message: `Delete "${song.title}" and all of its sections? This cannot be undone.`,
        confirmLabel: "Delete song",
      }))
    ) {
      return;
    }
    setDeletingSongId(song.id);
    setActionError(null);
    try {
      await deleteSong(song.id);
      setSongs((s) => s.filter((x) => x.id !== song.id));
      notify("success", `Deleted "${song.title}".`);
    } catch (e) {
      setActionError(friendlyError(e));
      notify("error", friendlyError(e));
    } finally {
      setDeletingSongId(null);
    }
  }

  async function handleGenerate(song: Song) {
    setBusySongId(song.id);
    setActionError(null);
    try {
      const { fetchSections } = await import("@/lib/supabase/data");
      const [sections, presentation] = await Promise.all([
        fetchSections(song.id),
        fetchPresentationForSong(song.id),
      ]);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Welcome to WFICM
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create worship presentations from your song lyrics.
        </p>
      </div>

      <div className="mb-8">
        <Button
          variant="primary"
          size="md"
          icon={<PlusIcon />}
          onClick={() => router.push("/songs/new")}
        >
          Create New Song
        </Button>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Recent Songs
          </h2>
          {songs.length > 0 ? (
            <Link
              href="/songs"
              className="focus-ring text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              View all
            </Link>
          ) : null}
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
            description="Create your first song by pasting its lyrics. WFICM will detect the sections and build the slides for you."
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
        ) : (
          <Card className="divide-y divide-zinc-100">
            {songs.slice(0, 10).map((song) => (
              <div
                key={song.id}
                className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400">
                    <FileIcon width={15} height={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {song.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {song.artist?.trim() ? `${song.artist} · ` : ""}
                      Updated {timeAgo(song.updated_at)}
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
                    loading={deletingSongId === song.id}
                    onClick={() => handleDelete(song)}
                    aria-label={`Delete ${song.title}`}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Recent Worship Sets
          </h2>
          <Link
            href="/worship-sets"
            className="focus-ring text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            View all
          </Link>
        </div>
        {sets.length === 0 ? (
          <Card className="px-5 py-6 text-sm text-zinc-500">
            No worship sets yet. Build one from your song library.
          </Card>
        ) : (
          <Card className="divide-y divide-zinc-100">
            {sets.slice(0, 5).map((set) => (
              <div
                key={set.id}
                className="flex flex-col gap-2.5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {set.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Updated {timeAgo(set.updated_at)}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/worship-sets/${set.id}`)}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/worship-sets/${set.id}?present=1`)
                    }
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<DownloadIcon />}
                    onClick={() =>
                      router.push(`/worship-sets/${set.id}?download=1`)
                    }
                  >
                    PowerPoint
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
