export type DrinkCategory = "beer" | "wine" | "longdrink" | "shot";

export type VolumeUnit = "l" | "ml";

export type Entry = {
  id: string;
  user_id: string;
  consumed_at: string;
  category: DrinkCategory;
  size_l: number;
  note: string | null;
  created_at: string;
};

export type EntryInput = {
  consumed_at: string;
  category: DrinkCategory;
  size_l: number;
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
