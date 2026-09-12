"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  getTour,
  getTourForPath,
  TOUR_DEFINITIONS,
  TourDefinition,
  TourPlacement,
} from "./tourDefinitions";

const STORAGE_KEY = "wficm-tour-state";
type TourState = {
  completed: string[];
  skipped: string[];
  welcomeDismissed: boolean;
};
type TourContextValue = {
  startTour: (id: string) => void;
  restartTour: (id: string) => void;
  startCurrentTour: () => void;
  markComplete: (id: string) => void;
  markSkipped: (id: string) => void;
  isComplete: (id: string) => boolean;
};
const TourContext = createContext<TourContextValue | null>(null);

type Rect = { top: number; left: number; width: number; height: number };

function readState(): TourState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw)
      return {
        completed: [],
        skipped: [],
        welcomeDismissed: false,
        ...JSON.parse(raw),
      };
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
  return { completed: [], skipped: [], welcomeDismissed: false };
}

function writeState(state: TourState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Tour state is a convenience and should never block the application.
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<TourState>({
    completed: [],
    skipped: [],
    welcomeDismissed: false,
  });
  const [tour, setTour] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => setState(readState()), []);

  const currentTour = useMemo(() => getTourForPath(pathname), [pathname]);

  useEffect(() => {
    if (
      pathname !== "/dashboard" ||
      tour ||
      state.welcomeDismissed ||
      state.completed.includes("dashboard") ||
      state.skipped.includes("dashboard")
    ) {
      setWelcomeOpen(false);
      return;
    }
    setWelcomeOpen(true);
  }, [pathname, state, tour]);

  useEffect(() => {
    if (tour && !pathnameMatchesTour(tour, pathname)) {
      setTour(null);
      setTargetRect(null);
    }
  }, [pathname, tour]);

  const activeStep = tour?.steps[stepIndex] ?? null;
  const spotlight = targetRect ? getSpotlightBounds(targetRect) : null;
  useEffect(() => {
    if (!tour || !activeStep) return;
    let cancelled = false;
    let frame = 0;
    const target = document.querySelector(
      `[data-tour="${activeStep.target}"]`,
    ) as HTMLElement | null;
    if (!target) {
      advanceToAvailable(
        tour,
        stepIndex,
        setStepIndex,
        setTour,
        setTargetRect,
        pathname,
      );
      return;
    }

    setTargetRect(null);
    scrollTargetIntoView(target);

    const update = () => {
      if (cancelled) return;
      setTargetRect(getVisibleRect(target));
    };
    const settle = async () => {
      await nextAnimationFrame();
      await nextAnimationFrame();
      if (cancelled) return;
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
    };
    void settle();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tour, activeStep, stepIndex, pathname]);

  useEffect(() => {
    if (!tour) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") markSkipped(tour!.id);
      if (event.key === "ArrowRight" || event.key === "Enter") nextStep();
      if (event.key === "ArrowLeft") previousStep();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function persist(next: TourState) {
    setState(next);
    writeState(next);
  }

  function markComplete(id: string) {
    persist({
      ...state,
      completed: [...new Set([...state.completed, id])],
      welcomeDismissed: true,
    });
    setTour(null);
    setTargetRect(null);
  }

  function markSkipped(id: string) {
    persist({
      ...state,
      skipped: [...new Set([...state.skipped, id])],
      welcomeDismissed: true,
    });
    setTour(null);
    setTargetRect(null);
  }

  function startTour(id: string) {
    const nextTour = getTour(id);
    if (!nextTour || !pathnameMatchesTour(nextTour, pathname)) return;
    setWelcomeOpen(false);
    setStepIndex(0);
    setTargetRect(null);
    setTour(nextTour);
  }

  function restartTour(id: string) {
    startTour(id);
  }

  function startCurrentTour() {
    if (currentTour) startTour(currentTour.id);
  }

  function nextStep() {
    if (!tour) return;
    const next = findAvailableStep(tour, stepIndex + 1);
    if (next === -1) markComplete(tour.id);
    else setStepIndex(next);
  }

  function previousStep() {
    if (!tour) return;
    const previous = findAvailableStep(tour, stepIndex - 1, -1);
    if (previous !== -1) setStepIndex(previous);
  }

  const contextValue: TourContextValue = {
    startTour,
    restartTour,
    startCurrentTour,
    markComplete,
    markSkipped,
    isComplete: (id) => state.completed.includes(id),
  };

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {welcomeOpen && !tour ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-900/35 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-welcome-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-overlay">
            <h2
              id="tour-welcome-title"
              className="text-lg font-semibold text-zinc-900"
            >
              Welcome to WFICM
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Let&apos;s take a quick tour so you can get familiar with the
              tools.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="focus-ring rounded-md px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100"
                onClick={() => {
                  setWelcomeOpen(false);
                  persist({ ...state, welcomeDismissed: true });
                }}
              >
                Maybe Later
              </button>
              <button
                type="button"
                className="focus-ring rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                onClick={() => startTour("dashboard")}
              >
                Start Tour
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {tour && activeStep && targetRect ? (
        <div className="pointer-events-none fixed inset-0 z-[999] overflow-hidden">
          {spotlight ? (
            <>
              <div
                className="absolute bg-zinc-900/36"
                style={{ top: 0, left: 0, right: 0, height: spotlight.top }}
              />
              <div
                className="absolute bg-zinc-900/36"
                style={{
                  top: spotlight.top,
                  left: 0,
                  width: spotlight.left,
                  height: spotlight.height,
                }}
              />
              <div
                className="absolute bg-zinc-900/36"
                style={{
                  top: spotlight.top,
                  left: spotlight.rightEdge,
                  right: 0,
                  height: spotlight.height,
                }}
              />
              <div
                className="absolute bg-zinc-900/36"
                style={{
                  top: spotlight.bottom,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              <div
                className="absolute rounded-md ring-1 ring-white/70"
                style={{
                  top: spotlight.top,
                  left: spotlight.left,
                  width: spotlight.width,
                  height: spotlight.height,
                }}
              />
            </>
          ) : null}
          <div
            className="pointer-events-auto absolute max-h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[19rem] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-overlay sm:w-[19rem] sm:p-4"
            style={tooltipStyle(targetRect, activeStep.placement)}
            role="dialog"
            aria-label={`${tour.name}, step ${stepIndex + 1} of ${tour.steps.length}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {tour.name}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-zinc-900">
              {activeStep.title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
              {activeStep.description}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-400">
                Step {stepIndex + 1} of {tour.steps.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  className="focus-ring min-h-9 rounded-md px-2 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100"
                  onClick={() => markSkipped(tour.id)}
                >
                  Skip Tour
                </button>
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    className="focus-ring min-h-9 rounded-md border border-zinc-300 px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
                    onClick={previousStep}
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  className="focus-ring min-h-9 rounded-md border border-zinc-900 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  onClick={nextStep}
                >
                  {stepIndex === tour.steps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TourContext.Provider>
  );
}

function pathnameMatchesTour(tour: TourDefinition, pathname: string) {
  return tour.route.endsWith("/")
    ? pathname.startsWith(tour.route) && pathname !== tour.route.slice(0, -1)
    : pathname === tour.route;
}

function findAvailableStep(tour: TourDefinition, start: number, direction = 1) {
  for (let i = start; i >= 0 && i < tour.steps.length; i += direction) {
    if (document.querySelector(`[data-tour="${tour.steps[i].target}"]`))
      return i;
  }
  return -1;
}

function advanceToAvailable(
  tour: TourDefinition,
  index: number,
  setStepIndex: (index: number) => void,
  setTour: (tour: TourDefinition | null) => void,
  setTargetRect: (rect: Rect | null) => void,
  pathname: string,
) {
  if (!pathnameMatchesTour(tour, pathname)) return;
  const next = findAvailableStep(tour, index + 1);
  if (next === -1) {
    setTour(null);
    setTargetRect(null);
  } else setStepIndex(next);
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function scrollTargetIntoView(target: HTMLElement) {
  const scrollableAncestors = getScrollableAncestors(target);
  if (scrollableAncestors.length === 0) {
    target.scrollIntoView({
      behavior: "auto",
      block: "center",
      inline: "nearest",
    });
    return;
  }

  for (const ancestor of scrollableAncestors) {
    const targetRect = target.getBoundingClientRect();
    const ancestorRect = ancestor.getBoundingClientRect();
    const padding = 20;

    if (targetRect.height > ancestorRect.height - padding * 2) {
      ancestor.scrollTop += targetRect.top - ancestorRect.top - padding;
    } else if (targetRect.top < ancestorRect.top + padding) {
      ancestor.scrollTop += targetRect.top - ancestorRect.top - padding;
    } else if (targetRect.bottom > ancestorRect.bottom - padding) {
      ancestor.scrollTop += targetRect.bottom - ancestorRect.bottom + padding;
    }

    if (targetRect.width > ancestorRect.width - padding * 2) {
      ancestor.scrollLeft += targetRect.left - ancestorRect.left - padding;
    } else if (targetRect.left < ancestorRect.left + padding) {
      ancestor.scrollLeft += targetRect.left - ancestorRect.left - padding;
    } else if (targetRect.right > ancestorRect.right - padding) {
      ancestor.scrollLeft += targetRect.right - ancestorRect.right + padding;
    }
  }
}

function getScrollableAncestors(element: HTMLElement) {
  const ancestors: HTMLElement[] = [];
  let current = element.parentElement;

  while (current) {
    const style = window.getComputedStyle(current);
    const scrollsVertically =
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight;
    const scrollsHorizontally =
      /(auto|scroll|overlay)/.test(style.overflowX) &&
      current.scrollWidth > current.clientWidth;
    if (scrollsVertically || scrollsHorizontally) ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
}

function getVisibleRect(element: HTMLElement): Rect | null {
  const rect = element.getBoundingClientRect();
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(window.innerWidth, rect.right);
  const bottom = Math.min(window.innerHeight, rect.bottom);

  if (right <= left || bottom <= top) return null;
  return { top, left, width: right - left, height: bottom - top };
}

function getSpotlightBounds(rect: Rect) {
  const padding = 5;
  const top = Math.max(0, rect.top - padding);
  const left = Math.max(0, rect.left - padding);
  const rightEdge = Math.min(
    window.innerWidth,
    rect.left + rect.width + padding,
  );
  const bottom = Math.min(window.innerHeight, rect.top + rect.height + padding);

  return {
    top,
    left,
    rightEdge,
    bottom,
    width: Math.max(0, rightEdge - left),
    height: Math.max(0, bottom - top),
  };
}

function tooltipStyle(
  rect: Rect,
  placement: TourPlacement = "bottom",
): React.CSSProperties {
  const gap = 14;
  const isMobile = window.innerWidth < 640;
  const margin = isMobile ? 12 : 16;
  const width = Math.min(isMobile ? 320 : 304, window.innerWidth - margin * 2);
  const height = Math.min(
    isMobile ? 260 : 220,
    window.innerHeight - margin * 2,
  );
  const targetRight = rect.left + rect.width;
  const targetBottom = rect.top + rect.height;
  const availableSpace: Record<TourPlacement, number> = {
    top: rect.top - margin,
    bottom: window.innerHeight - targetBottom - margin,
    left: rect.left - margin,
    right: window.innerWidth - targetRight - margin,
  };
  const candidates = (["top", "bottom", "left", "right"] as TourPlacement[])
    .map((candidate) => ({
      candidate,
      score:
        availableSpace[candidate] +
        (candidate === placement ? 24 : 0) +
        (isMobile && (candidate === "top" || candidate === "bottom") ? 20 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ candidate }) => candidate);

  const getPosition = (candidate: TourPlacement) => {
    if (candidate === "top")
      return {
        left: rect.left + rect.width / 2 - width / 2,
        top: rect.top - height - gap,
      };
    if (candidate === "left")
      return {
        left: rect.left - width - gap,
        top: rect.top + rect.height / 2 - height / 2,
      };
    if (candidate === "right")
      return {
        left: rect.left + rect.width + gap,
        top: rect.top + rect.height / 2 - height / 2,
      };
    return {
      left: rect.left + rect.width / 2 - width / 2,
      top: rect.top + rect.height + gap,
    };
  };

  const position =
    candidates
      .map((candidate) => ({ candidate, ...getPosition(candidate) }))
      .find(
        ({ left, top }) =>
          left >= margin &&
          left + width <= window.innerWidth - margin &&
          top >= margin &&
          top + height <= window.innerHeight - margin,
      ) ?? getPosition(placement);

  return {
    left: Math.max(
      margin,
      Math.min(window.innerWidth - width - margin, position.left),
    ),
    top: Math.max(
      margin,
      Math.min(window.innerHeight - height - margin, position.top),
    ),
  };
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) throw new Error("useTour must be used within TourProvider");
  return context;
}

export { TOUR_DEFINITIONS };
