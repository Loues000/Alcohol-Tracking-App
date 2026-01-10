import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Profile } from "./types";

type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileUpdate>) => Promise<Profile | null>;
};

type ProfileUpdate = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const getDisplayName = (user: User) => {
  const meta = user.user_metadata ?? {};
  const name = meta.full_name || meta.name;
  if (typeof name === "string" && name.trim().length > 0) {
    return name;
  }
  if (user.email) {
    return user.email.split("@")[0] ?? "User";
  }
  return "User";
};

export function ProfileProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createProfile = useCallback(
    async (displayName: string) => {
      const { data, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: displayName })
        .select("*")
        .single();

      if (insertError) {
        setError(insertError.message);
        return null;
      }

      return data ?? null;
    },
    [user.id]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, created_at, updated_at, display_name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      const created = await createProfile(getDisplayName(user));
      setProfile(created);
      setLoading(false);
      return;
    }

    setProfile(data);
    setError(null);
    setLoading(false);
  }, [user, createProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<ProfileUpdate>) => {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("*")
        .single();

      if (updateError) {
        setError(updateError.message);
        return null;
      }

      setProfile(data ?? null);
      setError(null);
      return data ?? null;
    },
    [user.id]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ profile, loading, error, refresh, updateProfile }),
    [profile, loading, error, refresh, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
