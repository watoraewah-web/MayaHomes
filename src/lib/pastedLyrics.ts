function normalizeBlock(block: string): string {
  return block
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " ").toLowerCase())
    .join("\n");
}

/** Applies optional duplicate removal to clipboard lyrics without changing the parser. */
export function processPastedLyrics(
  pasted: string,
  removeDuplicates: boolean,
): string {
  if (!removeDuplicates) return pasted;

  const normalized = pasted.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const hasBlankLineSeparator = /\n\s*\n/.test(normalized);
  const lines = normalized.split("\n").filter((line) => line.trim() !== "");
  const blocks = hasBlankLineSeparator
    ? normalized.split(/\n\s*\n+/).filter((block) => block.trim() !== "")
    : Array.from({ length: Math.ceil(lines.length / 4) }, (_, index) =>
        lines.slice(index * 4, index * 4 + 4).join("\n"),
      );
  const seen = new Set<string>();

  return blocks
    .filter((block) => {
      const key = normalizeBlock(block);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n\n");
}
