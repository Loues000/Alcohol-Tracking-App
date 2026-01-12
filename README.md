# Alcohol Tracker

Simple MVP for tracking drinks. Built with Expo and Supabase.

## Setup

1. **Install deps**
   ```bash
   cd app
   npm install
   ```

2. **Environment**
   Create `app/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Run**
   ```bash
   npm start
   ```

## Supabase

Run `supabase/schema.sql` in the Supabase SQL Editor. This creates:
- `profiles`: User info synced from Auth.
- `entries`: Individual drink logs with category, size, ABV, and notes.
- RLS policies to keep data private to the owner.
- `updated_at` triggers for sync support.

## Sync & Offline

- **Local Queue**: Failed writes are queued and retried with backoff.
- **Indicators**: The history view shows "Pending" or "Failed" badges for unsynced rows.
- **Manual Sync**: Pull-to-refresh on the Data screen triggers a sync attempt.

## Future / Out of Scope

Planned features for post-v1:
- Notifications & reminders
- Goals, limits, and achievements
- iOS/Android widgets
- CSV export/import
- Leaderboards & social features
- Barcode scanning for drinks

## Troubleshooting

- **Empty data**: Ensure RLS is enabled and policies from `schema.sql` are active.
- **Redirect issues**: Verify your app's deep link scheme matches the Supabase Auth configuration.
