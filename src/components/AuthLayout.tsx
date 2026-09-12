import { ReactNode } from "react";
import { MayaMark } from "@/components/icons";

function HalftoneArtwork() {
  return (
    <div className="auth-artwork" aria-hidden="true">
      {/* The supplied artwork is kept in public so it can be cropped responsively. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth-artwork.png"
        alt=""
        className="h-full w-full object-contain object-center"
      />
    </div>
  );
}

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="auth-page min-h-screen bg-white text-zinc-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="order-1 flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-[25rem]">
            <div className="mb-10 flex items-center gap-3">
              <MayaMark className="h-9 w-9 text-zinc-900" />
              <span className="text-sm font-semibold tracking-[0.28em] text-zinc-900">
                WFICM
              </span>
            </div>
            <div>
              <p className="mb-3 text-[0.68rem] font-medium uppercase tracking-[0.28em] text-zinc-400">
                Worship presentation tool
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 sm:text-[2.15rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                {description}
              </p>
            </div>
            <div className="mt-8">{children}</div>
            {footer}
          </div>
        </section>
        <aside className="auth-art-panel order-2 relative min-h-[11rem] overflow-hidden bg-white lg:min-h-screen">
          <HalftoneArtwork />
          <p className="absolute bottom-8 left-8 text-[0.62rem] font-medium uppercase tracking-[0.3em] text-zinc-400 lg:left-10">
            WFICM
          </p>
        </aside>
      </div>
    </main>
  );
}
