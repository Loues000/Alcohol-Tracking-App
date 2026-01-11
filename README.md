# Alcohol Tracking App

Mobile MVP for tracking drinks, built with Expo and Supabase.

## Features
- Add entries with date/time, drink type, size, count, and note.
- Dashboard heatmap with yearly view and category summary.
- Diagrams with month, weekday, and quarter tables.
- History grouped by day with expandable details.
- Local settings (unit, default drink, default size).

## Tech Stack
- Expo (React Native)
- Supabase (auth + database)

## Getting Started
1. Install dependencies:
   ```
   cd app
   npm install
   ```
2. Create `app/.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Start the app:
   ```
   npm start
   ```

## Database
- Schema lives in `supabase/schema.sql`.
- The app expects the `entries` and `profiles` tables as defined there.

## Project Structure
- `app/` - Expo app source
- `supabase/` - Supabase schema and config

## Notes
- Keep `app/.env` out of version control.
