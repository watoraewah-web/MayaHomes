import Link from "next/link";
import { MayaMark } from "@/components/icons";

const features = [
  {
    title: "Parse",
    description:
      "Paste raw lyrics. MAYA detects verses, choruses, bridges, and more automatically.",
    path: "M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  },
  {
    title: "Edit",
    description:
      "Refine the detected structure. Rename, reorder, duplicate, or split any section.",
    path: "M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z",
  },
  {
    title: "Generate",
    description:
      "Preview the projection flow, then export a clean .pptx ready for your service.",
    path: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <MayaMark className="text-zinc-900" />
            <span className="text-sm font-semibold tracking-[0.22em] text-zinc-900">MAYA</span>
          </div>
          <Link
            href="/signin"
            className="focus-ring inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="flex flex-col items-center pb-20 pt-24 text-center md:pt-32">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-zinc-400">
            Worship Presentation Tool
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 md:text-6xl">
            MAYA
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-600 md:text-xl">
            Turn worship lyrics into presentation-ready slides.
          </p>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-500">
            Organize your song lyrics, preview your presentation, and generate a
            PowerPoint for your worship service.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-md border border-zinc-900 bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Get Started
            </Link>
            <Link
              href="/signin"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
            >
              Sign In
            </Link>
          </div>
        </section>

        <section className="grid gap-6 border-t border-zinc-200 py-14 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-700">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={f.path} />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{f.description}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 text-xs text-zinc-400">
          <span>MAYA</span>
          <span>Lyrics are treated as user-provided content.</span>
        </div>
      </footer>
    </div>
  );
}
