"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteWorshipSet,
  fetchWorshipSetSongs,
  fetchWorshipSets,
  friendlyError,
} from "@/lib/supabase/data";
import { WorshipSet } from "@/lib/types";
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
  PlusIcon,
  PresentationsIcon,
  PreviewIcon,
} from "@/components/icons";

function formatDate(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";
}

export default function WorshipSetsPage() {
  const router = useRouter();
  const { notify, requestConfirmation } = useNotifications();
  const [sets, setSets] = useState<WorshipSet[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorshipSets()
      .then(async (rows) => {
        setSets(rows);
        const entries = await Promise.all(
          rows.map(
            async (row) =>
              [row.id, (await fetchWorshipSetSongs(row.id)).length] as const,
          ),
        );
        setCounts(Object.fromEntries(entries));
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(set: WorshipSet) {
    if (
      !(await requestConfirmation({
        title: "Delete worship set?",
        message: `Delete "${set.name}"? The songs in it will remain in Songs.`,
        confirmLabel: "Delete worship set",
      }))
    )
      return;
    setDeletingId(set.id);
    try {
      await deleteWorshipSet(set.id);
      setSets((prev) => prev.filter((item) => item.id !== set.id));
      notify("success", `Deleted "${set.name}".`);
    } catch (e) {
      setError(friendlyError(e));
      notify("error", friendlyError(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Worship Sets
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Arrange multiple songs into one presentation.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon />}
          onClick={() => router.push("/worship-sets/new")}
          data-tour="worship-sets-create"
        >
          Create New Worship Set
        </Button>
      </div>
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      {loading ? (
        <PageLoader label="Loading worship sets" />
      ) : sets.length === 0 ? (
        <EmptyState
          icon={<PresentationsIcon width={20} height={20} />}
          title="No worship sets yet"
          description="Build a complete service presentation from your song library."
          action={
            <Button
              variant="primary"
              icon={<PlusIcon />}
              onClick={() => router.push("/worship-sets/new")}
            >
              Create New Worship Set
            </Button>
          }
        />
      ) : (
        <Card
          className="divide-y divide-zinc-100"
          data-tour="worship-sets-list"
        >
          {sets.map((set) => (
            <div
              key={set.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {set.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {counts[set.id] ?? 0} song{counts[set.id] === 1 ? "" : "s"} ·
                  Updated {formatDate(set.updated_at)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<PreviewIcon />}
                  onClick={() => router.push(`/worship-sets/${set.id}`)}
                >
                  Open
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<PresentationsIcon />}
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
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<DeleteIcon />}
                  className="text-zinc-500 hover:text-red-600"
                  loading={deletingId === set.id}
                  onClick={() => handleDelete(set)}
                  aria-label={`Delete ${set.name}`}
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
