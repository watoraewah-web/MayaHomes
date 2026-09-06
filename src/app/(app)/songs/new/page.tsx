"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { parseLyrics } from "@/lib/parser";
import { createSong, friendlyError } from "@/lib/supabase/data";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { SparkIcon } from "@/components/icons";

const EXAMPLE_LYRICS = `Verse 1
Amazing grace, how sweet the sound
That saved a wretch like me

Chorus
I once was lost, but now am found
Was blind, but now I see`;

export default function NewSongPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null,
  );

  async function handleAnalyze() {
    setError(null);

    if (!title.trim()) {
      setError("Please enter a song title.");
      return;
    }
    if (!lyrics.trim()) {
      setError("Please paste the complete song lyrics before analyzing.");
      return;
    }

    setCreating(true);
    setProcessingMessage("Creating song and analyzing your lyrics...");
    try {
      const parsed = parseLyrics(lyrics);
      if (parsed.length === 0) {
        setError(
          "The lyrics could not be parsed. Make sure the text is not empty.",
        );
        return;
      }
      setProcessingMessage("Saving song and organized sections...");
      const { song } = await createSong({
        title: title.trim(),
        artist: artist.trim(),
        rawLyrics: lyrics,
        parsed,
      });
      const returnTo = searchParams.get("returnTo");
      router.push(
        returnTo ? `${returnTo}?songId=${song.id}` : `/songs/${song.id}`,
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setCreating(false);
      setProcessingMessage(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Create Song
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Paste the complete lyrics. MAYA will detect the sections
          automatically.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="title">Song Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Amazing Grace"
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="artist">Artist</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="John Newton"
              maxLength={200}
            />
          </div>
        </div>

        <div className="mt-5">
          <Label htmlFor="lyrics">Lyrics</Label>
          <Textarea
            id="lyrics"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Paste your complete song lyrics here..."
            rows={16}
            className="min-h-[320px] font-mono text-[13px]"
            spellCheck={false}
          />
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            Start blocks with labels such as Verse 1, Chorus, Pre-Chorus, or
            Bridge. Blocks without a recognized label are kept as Uncategorized,
            so nothing is lost. Only paste lyrics you are authorized to use.
          </p>
        </div>

        {error ? (
          <div className="mt-4">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        ) : null}
        {processingMessage ? (
          <p
            className="mt-3 flex items-center gap-2 text-sm text-zinc-500"
            role="status"
          >
            <span
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
              aria-hidden="true"
            />
            {processingMessage}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-5">
          <button
            type="button"
            onClick={() => {
              setTitle("Amazing Grace");
              setArtist("John Newton");
              setLyrics(EXAMPLE_LYRICS);
            }}
            className="focus-ring text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
          >
            Fill with example lyrics
          </button>
          <Button
            variant="primary"
            size="lg"
            icon={<SparkIcon />}
            loading={creating}
            onClick={handleAnalyze}
          >
            {creating ? "Analyzing Lyrics..." : "Analyze Lyrics"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
