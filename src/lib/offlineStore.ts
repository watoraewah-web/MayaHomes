const DATABASE_NAME = "wficm-offline";
const STORE_NAME = "responses";
const DATABASE_VERSION = 1;

async function scopedKey(key: string): Promise<string> {
  try {
    const { getSupabaseBrowserClient } = await import("./supabase/client");
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    return `${data.session?.user.id ?? "anonymous"}:${key}`;
  } catch {
    return `anonymous:${key}`;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readOffline<T>(key: string): Promise<T | undefined> {
  if (typeof window === "undefined" || !("indexedDB" in window))
    return undefined;
  try {
    const database = await openDatabase();
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return undefined;
  }
}

export async function writeOffline<T>(key: string, value: T): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Offline caching is an enhancement and must never block the app.
  }
}

export async function withOfflineCache<T>(
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const cacheKey = await scopedKey(key);
  try {
    const value = await request();
    await writeOffline(cacheKey, value);
    return value;
  } catch (error) {
    const cached = await readOffline<T>(cacheKey);
    if (cached !== undefined) return cached;
    throw error;
  }
}
