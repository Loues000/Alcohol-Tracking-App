import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { supabase } from "./supabase";
import { Entry, EntryInput } from "./types";

type PendingOp =
  | {
      id: string;
      kind: "insert";
      entryId: string;
      input: EntryInput;
      createdAt: number;
      attempts: number;
      retryAt: number;
      lastError?: string | null;
    }
  | {
      id: string;
      kind: "update";
      entryId: string;
      updates: Partial<EntryInput>;
      createdAt: number;
      attempts: number;
      retryAt: number;
      lastError?: string | null;
    }
  | {
      id: string;
      kind: "delete";
      entryId: string;
      createdAt: number;
      attempts: number;
      retryAt: number;
      lastError?: string | null;
    };

type InsertPendingOp = Extract<PendingOp, { kind: "insert" }>;

type EntriesContextValue = {
  entries: Entry[];
  pendingOps: PendingOp[];
  syncing: boolean;
  syncError: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  syncPending: () => Promise<void>;
  createEntry: (input: EntryInput) => Promise<Entry | null>;
  createEntries: (inputs: EntryInput[]) => Promise<Entry[]>;
  updateEntry: (id: string, updates: Partial<EntryInput>) => Promise<Entry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  restoreEntry: (entry: Entry) => Promise<Entry | null>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);
const PENDING_KEY = "pending_entry_ops_v1";

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const sortEntries = (items: Entry[]) =>
  [...items].sort((a, b) => new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime());

const applyPendingOpsToEntries = (base: Entry[], ops: PendingOp[], userId: string) => {
  let next = [...base];
  for (const op of ops) {
    if (op.kind === "insert") {
      const pendingEntry: Entry = {
        id: op.entryId,
        user_id: userId,
        consumed_at: op.input.consumed_at,
        category: op.input.category,
        size_l: op.input.size_l,
        custom_name: op.input.custom_name ?? null,
        abv_percent: op.input.abv_percent ?? null,
        note: op.input.note ?? null,
        created_at: new Date(op.createdAt).toISOString(),
        updated_at: new Date(op.createdAt).toISOString(),
        pending: true,
        syncError: op.lastError ?? null,
      };
      next = [pendingEntry, ...next.filter((item) => item.id !== op.entryId)];
    } else if (op.kind === "update") {
      next = next.map((item) =>
        item.id === op.entryId
          ? {
              ...item,
              ...op.updates,
              pending: true,
              syncError: op.lastError ?? null,
              updated_at: new Date(op.createdAt).toISOString(),
            }
          : item
      );
    } else if (op.kind === "delete") {
      next = next.filter((item) => item.id !== op.entryId);
    }
  }
  return sortEntries(next);
};

const upsertEntryInState = (list: Entry[], entry: Entry) => {
  const filtered = list.filter((item) => item.id !== entry.id);
  return sortEntries([entry, ...filtered]);
};

export function EntriesProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [baseEntries, setBaseEntries] = useState<Entry[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueReady, setQueueReady] = useState(false);

  const updatePendingOps = useCallback((updater: (prev: PendingOp[]) => PendingOp[]) => {
    setPendingOps((prev) => {
      const next = updater(prev);
      SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync(PENDING_KEY)
      .then((raw) => {
        if (raw) {
          setPendingOps(JSON.parse(raw) as PendingOp[]);
        }
      })
      .finally(() => setQueueReady(true));
  }, []);

  useEffect(() => {
    setEntries(applyPendingOpsToEntries(baseEntries, pendingOps, userId));
  }, [baseEntries, pendingOps, userId]);

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

    setBaseEntries(data ?? []);
    setError(null);
    setLoading(false);
  }, [userId]);

  const enqueueInserts = useCallback(
    (inputs: EntryInput[]): InsertPendingOp[] => {
      const now = Date.now();
      const ops: InsertPendingOp[] = inputs.map((input) => ({
        id: makeId(),
        kind: "insert",
        entryId: makeId(),
        input,
        createdAt: now,
        attempts: 0,
        retryAt: now,
        lastError: null,
      }));
      updatePendingOps((prev) => [...prev, ...ops]);
      return ops;
    },
    [updatePendingOps]
  );

  const enqueueUpdate = useCallback(
    (entryId: string, updates: Partial<EntryInput>, lastError?: string | null) => {
      const now = Date.now();
      const op: PendingOp = {
        id: makeId(),
        kind: "update",
        entryId,
        updates,
        createdAt: now,
        attempts: 0,
        retryAt: now,
        lastError: lastError ?? null,
      };
      updatePendingOps((prev) => [...prev, op]);
      return op;
    },
    [updatePendingOps]
  );

  const enqueueDelete = useCallback(
    (entryId: string, lastError?: string | null) => {
      const now = Date.now();
      const op: PendingOp = {
        id: makeId(),
        kind: "delete",
        entryId,
        createdAt: now,
        attempts: 0,
        retryAt: now,
        lastError: lastError ?? null,
      };
      updatePendingOps((prev) => [...prev, op]);
      return op;
    },
    [updatePendingOps]
  );

  const createEntries = useCallback(
    async (inputs: EntryInput[]) => {
      if (inputs.length === 0) return [];
      const rows = inputs.map((input) => ({ ...input, user_id: userId }));
      const { data, error: insertError } = await supabase.from("entries").upsert(rows).select("*");

      if (insertError) {
        const queued = enqueueInserts(inputs);
        const pendingEntries = queued.map((op) => ({
          id: op.entryId,
          user_id: userId,
          consumed_at: op.input.consumed_at,
          category: op.input.category,
          size_l: op.input.size_l,
          custom_name: op.input.custom_name ?? null,
          abv_percent: op.input.abv_percent ?? null,
          note: op.input.note ?? null,
          created_at: new Date(op.createdAt).toISOString(),
          updated_at: new Date(op.createdAt).toISOString(),
          pending: true,
          syncError: insertError.message,
        }));
        setError(insertError.message);
        return pendingEntries;
      }

      if (data && data.length > 0) {
        setBaseEntries((prev) =>
          sortEntries([...data, ...prev.filter((entry) => !data.some((item) => item.id === entry.id))])
        );
      }

      setError(null);
      return data ?? [];
    },
    [enqueueInserts, userId]
  );

  const createEntry = useCallback(
    async (input: EntryInput) => {
      const created = await createEntries([input]);
      return created[0] ?? null;
    },
    [createEntries]
  );

  const updateEntry = useCallback(
    async (id: string, updates: Partial<EntryInput>) => {
      const body = { ...updates, updated_at: new Date().toISOString() };
      const { data, error: updateError } = await supabase
        .from("entries")
        .update(body)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (updateError) {
        enqueueUpdate(id, updates, updateError.message);
        setError(updateError.message);
        return entries.find((entry) => entry.id === id) ?? null;
      }

      if (data) {
        setBaseEntries((prev) => upsertEntryInState(prev, data));
      }

      setError(null);
      return data ?? null;
    },
    [entries, enqueueUpdate, userId]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        enqueueDelete(id, deleteError.message);
        setBaseEntries((prev) => prev.filter((entry) => entry.id !== id));
        setError(deleteError.message);
        return true;
      }

      setBaseEntries((prev) => prev.filter((entry) => entry.id !== id));
      setError(null);
      return true;
    },
    [enqueueDelete, userId]
  );

  const restoreEntry = useCallback(
    async (entry: Entry) => {
      updatePendingOps((prev) => prev.filter((op) => !(op.kind === "delete" && op.entryId === entry.id)));
      const { pending, syncError, ...cleanEntry } = entry;
      const { data, error: upsertError } = await supabase
        .from("entries")
        .upsert({ ...cleanEntry, user_id: userId })
        .select("*")
        .single();

      if (upsertError) {
        setError(upsertError.message);
        return null;
      }

      if (data) {
        setBaseEntries((prev) => upsertEntryInState(prev, data));
      }

      setError(null);
      return data ?? null;
    },
    [updatePendingOps, userId]
  );

  const syncPending = useCallback(async () => {
    if (syncing || pendingOps.length === 0) return;
    setSyncing(true);
    let currentOps = [...pendingOps];
    let lastError: string | null = null;

    for (const op of [...currentOps].sort((a, b) => a.retryAt - b.retryAt)) {
      if (op.retryAt > Date.now()) continue;

      try {
        if (op.kind === "insert") {
          const payload = { ...op.input, user_id: userId, id: op.entryId };
          const { data, error: insertError } = await supabase
            .from("entries")
            .upsert(payload)
            .select("*")
            .single();

          if (insertError) {
            throw insertError;
          }

          if (data) {
            setBaseEntries((prev) => upsertEntryInState(prev, data));
          }

          currentOps = currentOps.filter((item) => item.id !== op.id);
          updatePendingOps(() => currentOps);
        } else if (op.kind === "update") {
          const { data, error: updateError } = await supabase
            .from("entries")
            .update({ ...op.updates, updated_at: new Date().toISOString() })
            .eq("id", op.entryId)
            .eq("user_id", userId)
            .select("*")
            .single();

          if (updateError) throw updateError;
          if (data) setBaseEntries((prev) => upsertEntryInState(prev, data));
          currentOps = currentOps.filter((item) => item.id !== op.id);
          updatePendingOps(() => currentOps);
        } else if (op.kind === "delete") {
          const { error: deleteError } = await supabase
            .from("entries")
            .delete()
            .eq("id", op.entryId)
            .eq("user_id", userId);

          if (deleteError) throw deleteError;
          setBaseEntries((prev) => prev.filter((entry) => entry.id !== op.entryId));
          currentOps = currentOps.filter((item) => item.id !== op.id);
          updatePendingOps(() => currentOps);
        }
      } catch (err) {
        const retryDelay = Math.min(1000 * 2 ** op.attempts, 60_000);
        lastError = (err as Error).message ?? "Sync failed";
        currentOps = currentOps.map((item) =>
          item.id === op.id
            ? {
                ...item,
                attempts: item.attempts + 1,
                retryAt: Date.now() + retryDelay,
                lastError,
              }
            : item
        );
        updatePendingOps(() => currentOps);
      }
    }

    setSyncError(lastError);
    setSyncing(false);
  }, [pendingOps, syncing, updatePendingOps, userId]);

  useEffect(() => {
    if (!queueReady) return;
    refresh();
  }, [queueReady, refresh]);

  useEffect(() => {
    if (!queueReady) return;
    if (pendingOps.length === 0) return;
    syncPending();
  }, [pendingOps, queueReady, syncPending]);

  const value = useMemo(
    () => ({
      entries,
      pendingOps,
      syncing,
      syncError,
      loading,
      error,
      refresh,
      syncPending,
      createEntry,
      createEntries,
      updateEntry,
      deleteEntry,
      restoreEntry,
    }),
    [
      entries,
      pendingOps,
      syncing,
      syncError,
      loading,
      error,
      refresh,
      syncPending,
      createEntry,
      createEntries,
      updateEntry,
      deleteEntry,
      restoreEntry,
    ]
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
