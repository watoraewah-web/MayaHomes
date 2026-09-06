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

export function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("Failed to fetch")) {
      return "Could not reach the server. Check your internet connection and try again.";
    }
    return err.message;
  }
  return "Something went wrong. Please try again.";
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
  artist: string;
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

  const { data: song, error } = await supabase
    .from("songs")
    .insert({
      user_id: user.id,
      title: input.title,
      artist: input.artist || null,
      raw_lyrics: input.rawLyrics,
    })
    .select()
    .single();
  if (error) throw new Error(friendlyError(error));

  const sections = await saveSections(song.id, input.parsed);
  return { song: song as Song, sections };
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
  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) throw new Error(friendlyError(error));
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
  await supabase.from("song_sections").delete().eq("song_id", songId);
  const rows = sections.map((s, i) => ({
    song_id: songId,
    section_type: s.section_type,
    section_label: s.section_label,
    content: s.content,
    section_order: i,
  }));
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("song_sections")
    .insert(rows)
    .select();
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

  const existing = await fetchPresentationForSong(songId);
  if (existing) {
    const { data, error } = await supabase
      .from("presentations")
      .update({ settings })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(friendlyError(error));
    return data as Presentation;
  }
  const { data, error } = await supabase
    .from("presentations")
    .insert({ user_id: user.id, song_id: songId, settings })
    .select()
    .single();
  if (error) throw new Error(friendlyError(error));
  return data as Presentation;
}

export async function deletePresentation(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("presentations").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
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
  const { error } = await supabase
    .from("worship_sets")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(friendlyError(error));
}

export async function deleteWorshipSet(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("worship_sets").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error));
}

export async function saveWorshipSetSongs(
  id: string,
  songIds: string[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error: deleteError } = await supabase
    .from("worship_set_songs")
    .delete()
    .eq("worship_set_id", id);
  if (deleteError) throw new Error(friendlyError(deleteError));
  if (!songIds.length) return;
  const { error } = await supabase.from("worship_set_songs").insert(
    songIds.map((songId, song_order) => ({
      worship_set_id: id,
      song_id: songId,
      song_order,
    })),
  );
  if (error) throw new Error(friendlyError(error));
}

export async function duplicateWorshipSet(id: string): Promise<WorshipSet> {
  const source = await fetchWorshipSet(id);
  if (!source) throw new Error("Worship set not found.");
  const songs = await fetchWorshipSetSongs(id);
  const copy = await createWorshipSet(`${source.name} — Copy`);
  await updateWorshipSet(copy.id, {
    settings: source.settings,
    add_song_title_slides: source.add_song_title_slides,
  });
  await saveWorshipSetSongs(
    copy.id,
    songs.map((item) => item.song_id),
  );
  return {
    ...copy,
    settings: source.settings,
    add_song_title_slides: source.add_song_title_slides,
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

/* -------------------------------- storage ------------------------------- */

export async function uploadBackgroundAsset(
  userId: string,
  file: File,
  kind: "image" | "video",
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "bin";
  const path = `${userId}/backgrounds/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("maya-assets")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(friendlyError(error));
  const { data } = supabase.storage.from("maya-assets").getPublicUrl(path);
  return data.publicUrl;
}
