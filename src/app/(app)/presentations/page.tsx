"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deletePresentation,
  fetchPresentations,
  friendlyError,
} from "@/lib/supabase/data";
import { Presentation, Song } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  PageLoader,
} from "@/components/ui";
import {
  DeleteIcon,
  EditIcon,
  FileIcon,
  PresentationsIcon,
} from "@/components/icons";

export default function PresentationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<(Presentation & { song: Song | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPresentations()
      .then(setItems)
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this presentation? The song itself is not affected.")) return;
    setDeletingId(id);
    try {
      await deletePresentation(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setDeletingId(null);
    }
  }

  function describe(p: Presentation & { song: Song | null }): string {
    const s = p.settings;
    const parts = [
      `${s.aspectRatio}`,
      `${s.fontSize}pt ${s.fontFamily}`,
      `${s.textAlign} aligned`,
      s.backgroundType === "solid" ? "solid background" : `${s.backgroundType} background`,
    ];
    return parts.join(" · ");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Presentations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Saved presentation settings. A presentation is created the first time you
          generate a PowerPoint for a song.
        </p>
      </div>

      {error ? <ErrorMessage>{error}</ErrorMessage> : null}

      {loading ? (
        <PageLoader label="Loading presentations" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<PresentationsIcon width={20} height={20} />}
          title="No presentations yet"
          description="Open a song, adjust the preview settings, and generate a PowerPoint to save a presentation here."
          action={
            <Button variant="primary" onClick={() => router.push("/songs")}>
              Go to Songs
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {items.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400">
                  <FileIcon width={15} height={15} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {p.song?.title ?? "Unknown song"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{describe(p)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<EditIcon />}
                  disabled={!p.song}
                  onClick={() => router.push(`/songs/${p.song_id}?tab=preview`)}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<DeleteIcon />}
                  className="text-zinc-500 hover:text-red-600"
                  loading={deletingId === p.id}
                  onClick={() => handleDelete(p.id)}
                  aria-label="Delete presentation"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
