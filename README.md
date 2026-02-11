# Feeling Moisty?

A Next.js (App Router + TypeScript) app that plays random embedded videos from the **penguinz0** YouTube channel.

## Features

- UI title: **Feeling Moisty?**
- Filter buttons:
  - From the last 5 years (default)
  - From the last 10 years
  - Play all
- Random playback of eligible videos
- Auto-advance to another random video when the current video ends
- **Next random** button
- Current video title + publish date shown under the player
- Recent queue to avoid immediate repeats
- API route at `/api/videos?range=5y|10y|all`
- Server-only YouTube API key via `.env.local`
- 12-hour server cache to reduce quota usage

## Setup

1. Create a `.env.local` file in the project root:

   ```env
   YOUTUBE_API_KEY=your_youtube_data_api_key
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Notes on YouTube quota + caching

- The app uses YouTube Data API v3 to:
  1. fetch the channel uploads playlist,
  2. paginate `playlistItems` until all uploads are collected.
- Results are cached server-side for **12 hours** (`CACHE_TTL_MS`) before refetching.
- During cache lifetime, `/api/videos` serves cached data and avoids extra YouTube API requests.

## API behavior

`GET /api/videos?range=5y|10y|all`

- Returns `200` with `{ videos: [...] }` where each video is:

  ```json
  {
    "videoId": "string",
    "title": "string",
    "publishedAt": "ISO date"
  }
  ```

- Returns friendly errors when:
  - `YOUTUBE_API_KEY` is missing
  - YouTube API requests fail
- Handles empty filter results by returning an empty array, which the UI displays gracefully.
