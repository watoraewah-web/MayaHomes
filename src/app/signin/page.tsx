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
import { AuthLayout } from "@/components/AuthLayout";

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
    <AuthLayout
      title="Welcome back"
      description="Access your worship presentations."
      footer={
        <p className="mt-8 border-t border-zinc-200 pt-5 text-sm text-zinc-500">
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      }
    >
      {configured ? (
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      ) : (
        <ErrorMessage>
          Supabase is not configured. Add your project credentials to .env.local
          and restart the app.
        </ErrorMessage>
      )}
    </AuthLayout>
  );
}
