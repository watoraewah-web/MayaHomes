function normalizeBlock(block: string): string {
  return block
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " ").toLowerCase())
    .join("\n");
}

function removeRepeatedRuns(lines: string[]): string[] {
  const normalizedLines = lines.map((line) =>
    line.trim().replace(/\s+/g, " ").toLowerCase(),
  );

  while (true) {
    let best: { length: number; duplicateStart: number } | undefined;

    for (let start = 0; start < normalizedLines.length; start += 1) {
      for (
        let duplicateStart = start + 1;
        duplicateStart < normalizedLines.length;
        duplicateStart += 1
      ) {
        const maxLength = Math.min(
          duplicateStart - start,
          normalizedLines.length - duplicateStart,
        );
        let length = 0;
        while (
          length < maxLength &&
          normalizedLines[start + length] ===
            normalizedLines[duplicateStart + length]
        ) {
          length += 1;
        }

        if (
          length >= 4 &&
          (!best ||
            length > best.length ||
            (length === best.length && duplicateStart < best.duplicateStart))
        ) {
          best = { length, duplicateStart };
        }
      }
    }

    if (!best) return lines;
    lines.splice(best.duplicateStart, best.length);
    normalizedLines.splice(best.duplicateStart, best.length);
  }
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
  const deduplicatedLines = hasBlankLineSeparator
    ? lines
    : removeRepeatedRuns(lines);
  const blocks = hasBlankLineSeparator
    ? normalized.split(/\n\s*\n+/).filter((block) => block.trim() !== "")
    : Array.from(
        { length: Math.ceil(deduplicatedLines.length / 4) },
        (_, index) =>
          deduplicatedLines.slice(index * 4, index * 4 + 4).join("\n"),
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
