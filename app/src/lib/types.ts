export type DrinkCategory = "beer" | "wine" | "sekt" | "longdrink" | "shot" | "other";

export type VolumeUnit = "l" | "ml" | "cl" | "oz";

export type Entry = {
  id: string;
  user_id: string;
  consumed_at: string;
  category: DrinkCategory;
  size_l: number;
  custom_name: string | null;
  abv_percent: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  pending?: boolean;
  syncError?: string | null;
};

export type EntryInput = {
  consumed_at: string;
  category: DrinkCategory;
  size_l: number;
  custom_name?: string | null;
  abv_percent?: number | null;
  note?: string | null;
};

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
};
