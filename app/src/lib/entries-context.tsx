import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { Entry, EntryInput } from "./types";

type EntriesContextValue = {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createEntry: (input: EntryInput) => Promise<Entry | null>;
  createEntries: (inputs: EntryInput[]) => Promise<Entry[]>;
  updateEntry: (id: string, updates: Partial<EntryInput>) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", userId)
      .order("consumed_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setEntries(data ?? []);
    setError(null);
    setLoading(false);
  }, [userId]);

  const createEntry = useCallback(
    async (input: EntryInput) => {
      const { data, error: insertError } = await supabase
        .from("entries")
        .insert({ ...input, user_id: userId })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      if (data) {
        setEntries((prev) => [data, ...prev]);
      }

      setError(null);
      return data ?? null;
    },
    [userId]
  );

  const createEntries = useCallback(
    async (inputs: EntryInput[]) => {
      if (inputs.length === 0) return [];
      const rows = inputs.map((input) => ({ ...input, user_id: userId }));
      const { data, error: insertError } = await supabase.from("entries").insert(rows).select("*");

      if (insertError) {
        setError(insertError.message);
        return [];
      }

      if (data && data.length > 0) {
        setEntries((prev) =>
          [...data, ...prev].sort(
            (a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
          )
        );
      }

      setError(null);
      return data ?? [];
    },
    [userId]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<EntryInput>) => {
      const { data, error: updateError } = await supabase
        .from("entries")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      if (data) {
        setEntries((prev) => prev.map((entry) => (entry.id === id ? data : entry)));
      }

      setError(null);
      return data ?? null;
    },
    [userId]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setError(null);
      return true;
    },
    [userId]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      entries,
      loading,
      error,
      refresh,
      createEntry,
      createEntries,
      updateEntry,
      deleteEntry,
    }),
    [entries, loading, error, refresh, createEntry, createEntries, updateEntry, deleteEntry]
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries() {
  const ctx = useContext(EntriesContext);
  if (!ctx) {
    throw new Error("useEntries must be used within EntriesProvider");
  }
  return ctx;
}
