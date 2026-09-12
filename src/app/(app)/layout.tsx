"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { cleanupOrphanedMedia, fetchProfile } from "@/lib/supabase/data";
import { Profile } from "@/lib/types";
import { PageLoader } from "@/components/ui";
import { TourProvider, useTour } from "@/components/tour/TourProvider";
import {
  DashboardIcon,
  LogoutIcon,
  MayaMark,
  MenuIcon,
  CloseIcon,
  SettingsIcon,
  SongsIcon,
  UserIcon,
  PresentationsIcon as WorshipSetsIcon,
} from "@/components/icons";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    tour: "dashboard-nav",
  },
  { href: "/songs", label: "Songs", icon: SongsIcon, tour: "songs-nav" },
  {
    href: "/worship-sets",
    label: "Worship Sets",
    icon: WorshipSetsIcon,
    tour: "worship-sets-nav",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: SettingsIcon,
    tour: "settings-nav",
  },
];

function SidebarContent({
  profile,
  email,
  onSignOut,
  onNavigate,
}: {
  profile: Profile | null;
  email: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { startCurrentTour } = useTour();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-zinc-200 px-5">
        <MayaMark className="h-8 w-8 text-zinc-900" />
        <span className="text-sm font-semibold tracking-[0.22em] text-zinc-900">
          WFICM
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, tour }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              data-tour={tour}
              onClick={onNavigate}
              className={`focus-ring flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Icon className={active ? "text-zinc-900" : "text-zinc-400"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-200 p-3">
        <button
          type="button"
          onClick={startCurrentTour}
          className="focus-ring mb-1 flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Take a Tour
        </button>
        <Link
          href="/settings"
          onClick={onNavigate}
          className="focus-ring mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
            <UserIcon width={14} height={14} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-zinc-900">
              {profile?.full_name?.trim() || "My Account"}
            </span>
            <span className="block truncate text-xs text-zinc-400">
              {email}
            </span>
          </span>
        </Link>
        <button
          onClick={onSignOut}
          className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <LogoutIcon className="text-zinc-400" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    let active = true;
    let profileUserId: string | null = null;

    async function applyUser(
      authUser: { id: string; email?: string | null } | null,
    ) {
      if (!active) return;
      if (!authUser) {
        profileUserId = null;
        setUser(null);
        setProfile(null);
        setSessionError(true);
        setLoading(false);
        return;
      }

      setSessionError(false);
      setUser({ id: authUser.id, email: authUser.email ?? "" });
      void cleanupOrphanedMedia();
      if (profileUserId === authUser.id) {
        setLoading(false);
        return;
      }

      profileUserId = authUser.id;
      setProfile(null);
      try {
        const nextProfile = await fetchProfile(authUser.id);
        if (active && profileUserId === authUser.id) setProfile(nextProfile);
      } catch {
        if (active && profileUserId === authUser.id) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => applyUser(data.session?.user ?? null))
      .catch(() => {
        if (!active) return;
        setSessionError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const menuButton = mobileMenuButtonRef.current;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      const firstControl = mobileDrawerRef.current?.querySelector<HTMLElement>(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (firstControl ?? mobileDrawerRef.current)?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !mobileDrawerRef.current) return;
      const controls = Array.from(
        mobileDrawerRef.current.querySelectorAll<HTMLElement>(
          'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (controls.length === 0) {
        event.preventDefault();
        mobileDrawerRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-card">
          <h1 className="text-base font-semibold text-zinc-900">
            Supabase is not configured
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Set{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            in your{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">.env.local</code>{" "}
            file, then restart the app. See the README for setup instructions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <PageLoader label="Loading WFICM" />;
  }

  if (sessionError || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-card">
          <h1 className="text-base font-semibold text-zinc-900">
            Session expired
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Please sign in again to continue.
          </p>
          <Link
            href="/signin"
            className="focus-ring mt-4 inline-flex h-9 items-center rounded-md border border-zinc-900 bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TourProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white lg:block">
          <div className="fixed inset-y-0 left-0 w-60">
            <SidebarContent
              profile={profile}
              email={user.email}
              onSignOut={handleSignOut}
            />
          </div>
        </aside>

        {/* Mobile top bar */}
        <div
          className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden"
          aria-hidden={mobileOpen}
        >
          <div className="flex items-center gap-2.5">
            <MayaMark className="h-8 w-8 text-zinc-900" />
            <span className="text-sm font-semibold tracking-[0.22em] text-zinc-900">
              WFICM
            </span>
          </div>
          <button
            ref={mobileMenuButtonRef}
            onClick={() => setMobileOpen(true)}
            className="focus-ring rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
            aria-label="Open menu"
          >
            <MenuIcon width={18} height={18} />
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div
              className="absolute inset-0 bg-zinc-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={mobileDrawerRef}
              tabIndex={-1}
              className="absolute inset-y-0 left-0 w-64 border-r border-zinc-200 bg-white shadow-overlay"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="focus-ring absolute right-2 top-4 rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <CloseIcon width={16} height={16} />
              </button>
              <SidebarContent
                profile={profile}
                email={user.email}
                onSignOut={handleSignOut}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        ) : null}

        <main
          className="w-full min-w-0 flex-1 pb-16 pt-14 lg:pb-0 lg:pt-0"
          aria-hidden={mobileOpen}
        >
          {children}
        </main>
      </div>
    </TourProvider>
  );
}
