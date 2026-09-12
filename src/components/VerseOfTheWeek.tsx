import { getVerseOfTheWeek } from "@/lib/verseOfTheWeek";

export function VerseOfTheWeek({ className = "" }: { className?: string }) {
  const verse = getVerseOfTheWeek();

  return (
    <section
      className={`border-y border-zinc-200 py-5 ${className}`}
      aria-label="Verse of the Week"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500"
          aria-hidden="true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v18M5 8h14M7 5h10" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Verse of the Week
          </p>
          <blockquote className="mt-2 max-w-3xl text-base leading-7 text-zinc-800 sm:text-lg sm:leading-8">
            “{verse.text}”
          </blockquote>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <cite className="font-medium not-italic text-zinc-700">
              {verse.reference}
            </cite>
            <span aria-hidden="true">·</span>
            <span>{verse.theme}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
