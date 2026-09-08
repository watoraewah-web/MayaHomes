"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { getSafeNextPath } from "@/lib/safeRedirect";
import { Button, ErrorMessage, Input, Label } from "@/components/ui";
import { MayaMark } from "@/components/icons";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "Incorrect email or password. Please try again."
            : error.message,
        );
        return;
      }
      router.push(getSafeNextPath(searchParams.get("next")));
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email address"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
      </div>
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={loading}
        className="w-full"
      >
        Sign In
      </Button>
    </form>
  );
}

export default function SignInPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-canvas px-4 py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-3">
          <MayaMark className="h-16 w-16 text-zinc-900" />
          <span className="text-sm font-semibold tracking-[0.28em] text-zinc-900">
            WFICM
          </span>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Welcome back
          </h1>
          <p className="mb-7 mt-2 text-sm leading-relaxed text-zinc-500">
            Access your worship presentations.
          </p>
          {configured ? (
            <Suspense fallback={null}>
              <SignInForm />
            </Suspense>
          ) : (
            <ErrorMessage>
              Supabase is not configured. Add your project credentials to
              .env.local and restart the app.
            </ErrorMessage>
          )}
          <p className="mt-7 border-t border-zinc-100 pt-5 text-center text-sm text-zinc-500">
            No account yet?{" "}
            <Link
              href="/signup"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
