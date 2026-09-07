"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchProfile, friendlyError, updateProfile } from "@/lib/supabase/data";
import { Profile } from "@/lib/types";
import {
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  PageLoader,
  SuccessMessage,
} from "@/components/ui";
import { UserIcon } from "@/components/icons";

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) {
          setError("Your session has expired. Please sign in again.");
          return;
        }
        setUserId(data.user.id);
        setEmail(data.user.email ?? "");
        return fetchProfile(data.user.id).then((p) => {
          setProfile(p);
          setFullName(p?.full_name ?? "");
        });
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile(userId, fullName.trim());
      setSuccess("Profile updated.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader label="Loading settings" />;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Your MAYA account and profile.</p>
      </div>

      {error ? (
        <div className="mb-4">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
            <UserIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {profile?.full_name?.trim() || "My Account"}
            </p>
            <p className="text-xs text-zinc-500">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 border-t border-zinc-100 pt-5">
          <div>
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="email-readonly">Email</Label>
            <Input id="email-readonly" value={email} disabled readOnly />
          </div>
          {success ? <SuccessMessage>{success}</SuccessMessage> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={saving} disabled={!userId}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-5 text-xs leading-relaxed text-zinc-400 shadow-card">
        MAYA treats all lyrics as user-provided content. Only paste lyrics you are
        authorized to use. Your songs, sections, and presentations are private to
        your account.
      </div>
    </div>
  );
}
