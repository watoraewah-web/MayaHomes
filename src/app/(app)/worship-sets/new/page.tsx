"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorshipSet, friendlyError } from "@/lib/supabase/data";
import { Button, Card, ErrorMessage, Input, Label } from "@/components/ui";
import { PlusIcon } from "@/components/icons";

export default function NewWorshipSetPage() {
  const router = useRouter();
  const [name, setName] = useState("Sunday Worship");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Please enter a worship set name.");
      return;
    }
    setCreating(true);
    try {
      const set = await createWorshipSet(name);
      router.replace(`/worship-sets/${set.id}`);
    } catch (e) {
      setError(friendlyError(e));
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Create Worship Set
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Name the set, then add songs from your library.
        </p>
      </div>
      <Card className="p-6">
        <Label htmlFor="name">Set Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          autoFocus
        />
        {error ? (
          <div className="mt-4">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            icon={<PlusIcon />}
            loading={creating}
            onClick={handleCreate}
          >
            Create Set
          </Button>
        </div>
      </Card>
    </div>
  );
}
