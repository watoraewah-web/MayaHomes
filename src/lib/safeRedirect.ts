const RELATIVE_URL_BASE = "https://maya.invalid";

export function getSafeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) {
    return fallback;
  }

  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\")) return fallback;
    const url = new URL(value, RELATIVE_URL_BASE);
    return url.origin === RELATIVE_URL_BASE ? value : fallback;
  } catch {
    return fallback;
  }
}
