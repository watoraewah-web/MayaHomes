"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { Button, ErrorMessage, Input, Label } from "@/components/ui";
import { MayaMark } from "@/components/icons";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setNotice(
          "Account created. Check your email for a confirmation link before signing in.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

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
            Create your account
          </h1>
          <p className="mb-7 mt-2 text-sm leading-relaxed text-zinc-500">
            Start building worship presentations.
          </p>
          {configured ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" hint="Minimum 6 characters">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a password"
                  required
                />
              </div>
              {error ? <ErrorMessage>{error}</ErrorMessage> : null}
              {notice ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                  {notice}
                </div>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Create Account
              </Button>
            </form>
          ) : (
            <ErrorMessage>
              Supabase is not configured. Add your project credentials to
              .env.local and restart the app.
            </ErrorMessage>
          )}
          <p className="mt-7 border-t border-zinc-100 pt-5 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
