"use client";

import { getSupabaseBrowserClient } from "./client";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  Presentation,
  PresentationSettings,
  Profile,
  Song,
  SongSection,
  WorshipSet,
  WorshipSetSong,
} from "../types";
import { ParsedSection } from "../parser";
import { deleteMedia, listMedia } from "../mediaStorage";

export function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch")) {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

function mediaIdsFromSettings(
  settings: Partial<PresentationSettings> | null | undefined,
) {
  return [settings?.backgroundImageId, settings?.backgroundVideoId].filter(
    (id): id is string => Boolean(id),
  );
}

export async function collectReferencedMediaIds(): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();
  const [presentations, worshipSets] = await Promise.all([
    supabase.from("presentations").select("settings"),
    supabase.from("worship_sets").select("settings"),
  ]);
  if (presentations.error) throw new Error(friendlyError(presentations.error));
  if (worshipSets.error) throw new Error(friendlyError(worshipSets.error));

  const referencedIds = new Set<string>();
  for (const row of [
    ...(presentations.data ?? []),
    ...(worshipSets.data ?? []),
  ]) {
    for (const id of mediaIdsFromSettings(
      (row as { settings?: Partial<PresentationSettings> }).settings,
    )) {
      referencedIds.add(id);
    }
  }
  return referencedIds;
}

export async function cleanupUnreferencedMedia(
  settings: Partial<PresentationSettings> | null | undefined,
): Promise<void> {
  const mediaIds = mediaIdsFromSettings(settings);
  if (mediaIds.length === 0) return;

  let referencedIds: Set<string>;
  try {
    referencedIds = await collectReferencedMediaIds();
  } catch {
    return;
  }

  await Promise.all(
    mediaIds
      .filter((id) => !referencedIds.has(id))
      .map((id) => deleteMedia(id).catch(() => undefined)),
  );
}

export async function cleanupOrphanedMedia(
  gracePeriodMs = 24 * 60 * 60 * 1000,
): Promise<void> {
  let referencedIds: Set<string>;
  try {
    referencedIds = await collectReferencedMediaIds();
  } catch {
    return;
  }
  const cutoff = Date.now() - gracePeriodMs;
  const records = await listMedia();
  await Promise.all(
    records
      .filter(
        (record) => record.createdAt < cutoff && !referencedIds.has(record.id),
      )
      .map((record) => deleteMedia(record.id).catch(() => undefined)),
  );
}
/* ------------------------------- profile -------------------------------- */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return data ?? null;
}

export async function updateProfile(
  userId: string,
  fullName: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw new Error(friendlyError(error));
}

/* --------------------------------- songs -------------------------------- */

export async function fetchSongs(): Promise<Song[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as Song[];
}

export async function fetchSong(songId: string): Promise<Song | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", songId)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return (data as Song) ?? null;
}

export async function createSong(input: {
  title: string;
  artist?: string;
  rawLyrics: string;
  parsed: ParsedSection[];
}): Promise<{ song: Song; sections: SongSection[] }> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw new Error("Your session has expired. Please sign in again.");

  const { data, error } = await supabase.rpc("create_song_with_sections", {
    p_title: input.title,
    p_artist: input.artist || null,
    p_raw_lyrics: input.rawLyrics,
    p_sections: input.parsed,
  });
  if (error) throw new Error(friendlyError(error));
  const result = data as { song: Song; sections: SongSection[] };
  return { song: result.song, sections: result.sections };
}

export async function updateSong(
  songId: string,
  patch: Partial<Pick<Song, "title" | "artist" | "raw_lyrics">>,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("songs").update(patch).eq("id", songId);
  if (error) throw new Error(friendlyError(error));
}

export async function deleteSong(songId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("delete_song_with_dependencies", {
    p_song_id: songId,
  });
  if (error) throw new Error(friendlyError(error));
  await cleanupUnreferencedMedia(
    (data as { presentation_settings?: Partial<PresentationSettings> })
      ?.presentation_settings,
  );
}

/* ------------------------------- sections ------------------------------- */

export async function fetchSections(songId: string): Promise<SongSection[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("song_sections")
    .select("*")
    .eq("song_id", songId)
    .order("section_order", { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as SongSection[];
}

export async function fetchSectionsForSongs(
  songIds: string[],
): Promise<Record<string, SongSection[]>> {
  if (songIds.length === 0) return {};
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("song_sections")
    .select("*")
    .in("song_id", songIds)
    .order("section_order", { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).reduce<Record<string, SongSection[]>>((grouped, row) => {
    const section = row as SongSection;
    (grouped[section.song_id] ??= []).push(section);
    return grouped;
  }, {});
}

/**
 * Replaces the full ordered set of sections for a song. Deleting and
 * re-inserting keeps section_order authoritative and the payload simple.
 */
export async function saveSections(
  songId: string,
  sections: ParsedSection[],
): Promise<SongSection[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("replace_song_sections", {
    p_song_id: songId,
    p_sections: sections,
  });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as SongSection[];
}

/* ----------------------------- presentations ---------------------------- */

export async function fetchPresentationForSong(
  songId: string,
): Promise<Presentation | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .eq("song_id", songId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  if (!data) return null;
  return {
    ...(data as Presentation),
    settings: normalizeSettings(data.settings),
  };
}

export async function fetchPresentations(): Promise<
  (Presentation & { song: Song | null })[]
> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("presentations")
    .select(
      "*, song:songs(id, title, artist, raw_lyrics, user_id, created_at, updated_at)",
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((row) => ({
    ...(row as unknown as Presentation),
    settings: normalizeSettings((row as unknown as Presentation).settings),
    song: (row as unknown as { song: Song | null }).song ?? null,
  }));
}

export async function upsertPresentation(
  songId: string,
  settings: PresentationSettings,
): Promise<Presentation> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");

  const { data: previous, error: previousError } = await supabase
    .from("presentations")
    .select("settings")
    .eq("song_id", songId)
    .maybeSingle();
  if (previousError) throw new Error(friendlyError(previousError));

  const persistentSettings = {
    ...settings,
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
  };
  const { data, error } = await supabase
    .from("presentations")
    .upsert(
      {
        user_id: user.id,
        song_id: songId,
        settings: persistentSettings,
      },
      { onConflict: "song_id" },
    )
    .select()
    .single();
  if (error) {
    await cleanupUnreferencedMedia(persistentSettings);
    throw new Error(friendlyError(error));
  }
  await cleanupUnreferencedMedia(previous?.settings);
  return data as Presentation;
}

export async function deletePresentation(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: presentation, error: fetchError } = await supabase
    .from("presentations")
    .select("settings")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(friendlyError(fetchError));
  const { error } = await supabase.from("presentations").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
  await cleanupUnreferencedMedia(presentation?.settings);
}

/* ---------------------------- worship sets ----------------------------- */

export async function fetchWorshipSets(): Promise<WorshipSet[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("worship_sets")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).map((row) => ({
    ...(row as WorshipSet),
    settings: normalizeSettings((row as WorshipSet).settings),
    add_song_title_slides: (row as WorshipSet).add_song_title_slides ?? true,
  }));
}

export async function fetchWorshipSetSongCounts(): Promise<
  Record<string, number>
> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("worship_set_songs")
    .select("worship_set_id");
  if (error) throw new Error(friendlyError(error));
  return (data ?? []).reduce<Record<string, number>>((counts, row) => {
    const worshipSetId = (row as { worship_set_id: string }).worship_set_id;
    counts[worshipSetId] = (counts[worshipSetId] ?? 0) + 1;
    return counts;
  }, {});
}

export async function fetchWorshipSet(id: string): Promise<WorshipSet | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("worship_sets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  if (!data) return null;
  return {
    ...(data as WorshipSet),
    settings: normalizeSettings((data as WorshipSet).settings),
    add_song_title_slides: (data as WorshipSet).add_song_title_slides ?? true,
  };
}

export async function fetchWorshipSetSongs(
  id: string,
): Promise<WorshipSetSong[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("worship_set_songs")
    .select(
      "*, song:songs(id, user_id, title, artist, raw_lyrics, created_at, updated_at)",
    )
    .eq("worship_set_id", id)
    .order("song_order", { ascending: true });
  if (error) throw new Error(friendlyError(error));
  return (data ?? []) as WorshipSetSong[];
}

export async function createWorshipSet(name: string): Promise<WorshipSet> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const { data, error } = await supabase
    .from("worship_sets")
    .insert({ user_id: user.id, name: name.trim() || "Untitled Worship Set" })
    .select()
    .single();
  if (error) throw new Error(friendlyError(error));
  return {
    ...(data as WorshipSet),
    settings: normalizeSettings((data as WorshipSet).settings),
    add_song_title_slides: true,
  };
}

export async function updateWorshipSet(
  id: string,
  patch: Partial<
    Pick<WorshipSet, "name" | "settings" | "add_song_title_slides">
  >,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: previous, error: previousError } = patch.settings
    ? await supabase
        .from("worship_sets")
        .select("settings")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (previousError) throw new Error(friendlyError(previousError));

  const persistentPatch = patch.settings
    ? {
        ...patch,
        settings: {
          ...patch.settings,
          backgroundImageUrl: null,
          backgroundVideoUrl: null,
        },
      }
    : patch;
  const { error } = await supabase
    .from("worship_sets")
    .update(persistentPatch)
    .eq("id", id);
  if (error) {
    if (persistentPatch.settings)
      await cleanupUnreferencedMedia(persistentPatch.settings);
    throw new Error(friendlyError(error));
  }
  if (previous?.settings) await cleanupUnreferencedMedia(previous.settings);
}

export async function deleteWorshipSet(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc(
    "delete_worship_set_with_dependencies",
    { p_worship_set_id: id },
  );
  if (error) throw new Error(friendlyError(error));
  await cleanupUnreferencedMedia(
    (data as { worship_set_settings?: Partial<PresentationSettings> })
      ?.worship_set_settings,
  );
}

export async function removeSongFromWorshipSet(
  worshipSetId: string,
  songId: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("worship_set_songs")
    .delete()
    .eq("worship_set_id", worshipSetId)
    .eq("song_id", songId);
  if (error) throw new Error(friendlyError(error));
}

export async function saveWorshipSetSongs(
  id: string,
  songIds: string[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("replace_worship_set_songs", {
    p_worship_set_id: id,
    p_song_ids: songIds,
  });
  if (error) throw new Error(friendlyError(error));
}

/**
 * Internal duplication API. The current UI does not expose duplication, but
 * callers can use this atomic operation without leaving partial sets behind.
 */
export async function duplicateWorshipSet(id: string): Promise<WorshipSet> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("duplicate_worship_set", {
    p_worship_set_id: id,
  });
  if (error) throw new Error(friendlyError(error));
  const copied = (data as { worship_set: WorshipSet }).worship_set;
  return {
    ...copied,
    settings: normalizeSettings(copied.settings),
    add_song_title_slides: copied.add_song_title_slides ?? true,
  };
}

/* ----------------------------- song + settings --------------------------- */

/** Loads a song with its sections and saved presentation settings. */
export async function loadSongWorkspace(songId: string): Promise<{
  song: Song;
  sections: SongSection[];
  settings: PresentationSettings;
} | null> {
  const song = await fetchSong(songId);
  if (!song) return null;
  const [sections, presentation] = await Promise.all([
    fetchSections(songId),
    fetchPresentationForSong(songId),
  ]);
  return {
    song,
    sections,
    settings: presentation?.settings ?? DEFAULT_SETTINGS,
  };
}
