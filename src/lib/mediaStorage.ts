import { PresentationSettings } from "./types";

const DB_NAME = "wficm-local-media";
const DB_VERSION = 1;
const STORE_NAME = "media";

type MediaKind = "image" | "video";

interface StoredMedia {
  id: string;
  kind: MediaKind;
  blob: Blob;
  createdAt: number;
}

function getDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local media storage."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Local media storage request failed."));
  });
}

function makeMediaId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function saveMedia(file: Blob, kind: MediaKind): Promise<string> {
  const id = makeMediaId();
  const database = await getDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({
      id,
      kind,
      blob: file,
      createdAt: Date.now(),
    } satisfies StoredMedia);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not save local media."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Could not save local media."));
    });
    return id;
  } finally {
    database.close();
  }
}

export async function getMedia(id: string): Promise<StoredMedia | null> {
  if (!id) return null;
  let database: IDBDatabase | null = null;
  try {
    database = await getDatabase();
    const record = await requestResult<StoredMedia | undefined>(
      database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(id),
    );
    if (!record || !(record.blob instanceof Blob)) return null;
    return record;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function deleteMedia(
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  const database = await getDatabase();
  try {
    await requestResult(
      database
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(id),
    );
  } finally {
    database.close();
  }
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export async function resolveMediaUrl(
  id: string | null | undefined,
): Promise<string | null> {
  const media = await getMedia(id ?? "");
  return media ? URL.createObjectURL(media.blob) : null;
}

export async function resolvePresentationMedia(
  settings: PresentationSettings,
): Promise<{ settings: PresentationSettings; revoke: () => void }> {
  const urls: string[] = [];
  const imageUrl = await resolveMediaUrl(settings.backgroundImageId);
  if (imageUrl) urls.push(imageUrl);
  const videoUrl = await resolveMediaUrl(settings.backgroundVideoId);
  if (videoUrl) urls.push(videoUrl);

  return {
    settings: {
      ...settings,
      backgroundImageUrl: imageUrl,
      backgroundVideoUrl: videoUrl,
    },
    revoke: () => urls.forEach((url) => URL.revokeObjectURL(url)),
  };
}

export async function deleteMediaForSettings(
  settings: Partial<PresentationSettings> | null | undefined,
): Promise<void> {
  await Promise.all([
    deleteMedia(settings?.backgroundImageId),
    deleteMedia(settings?.backgroundVideoId),
  ]);
}
