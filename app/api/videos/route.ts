import { NextRequest, NextResponse } from 'next/server';

type Range = '5y' | '10y' | 'all';

type Video = {
  videoId: string;
  title: string;
  publishedAt: string;
};

type CacheEntry = {
  data: Video[];
  expiresAt: number;
};

const CHANNEL_ID = 'UCq6VFHwMzcMXbuKyG7SQYIg';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

let cache: CacheEntry | null = null;

function isRange(value: string | null): value is Range {
  return value === '5y' || value === '10y' || value === 'all';
}

function filterByRange(videos: Video[], range: Range): Video[] {
  if (range === 'all') {
    return videos;
  }

  const years = range === '5y' ? 5 : 10;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);

  return videos.filter((video) => new Date(video.publishedAt) >= cutoff);
}

async function fetchUploadsPlaylistId(apiKey: string): Promise<string> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'contentDetails');
  url.searchParams.set('id', CHANNEL_ID);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to fetch channel details.');
  }

  const payload = (await response.json()) as {
    items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
  };

  const playlistId = payload.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) {
    throw new Error('Uploads playlist not found for the channel.');
  }

  return playlistId;
}

async function fetchAllUploads(apiKey: string): Promise<Video[]> {
  const cached = cache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const uploadsPlaylistId = await fetchUploadsPlaylistId(apiKey);
  const videos: Video[] = [];
  let nextPageToken: string | undefined;

  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', uploadsPlaylistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    if (nextPageToken) {
      url.searchParams.set('pageToken', nextPageToken);
    }

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to fetch uploads from YouTube.');
    }

    const payload = (await response.json()) as {
      nextPageToken?: string;
      items?: Array<{
        snippet?: {
          resourceId?: { videoId?: string };
          title?: string;
          publishedAt?: string;
        };
      }>;
    };

    for (const item of payload.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title;
      const publishedAt = item.snippet?.publishedAt;

      if (!videoId || !title || !publishedAt || title === 'Deleted video' || title === 'Private video') {
        continue;
      }

      videos.push({ videoId, title, publishedAt });
    }

    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  cache = {
    data: videos,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return videos;
}

export async function GET(request: NextRequest) {
  const rangeParam = request.nextUrl.searchParams.get('range');
  const range: Range = isRange(rangeParam) ? rangeParam : '5y';

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is missing YOUTUBE_API_KEY. Add it to .env.local and restart dev server.' },
      { status: 500 },
    );
  }

  try {
    const allVideos = await fetchAllUploads(apiKey);
    const filteredVideos = filterByRange(allVideos, range);

    return NextResponse.json({ videos: filteredVideos });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Sorry, videos are unavailable right now. Please try again in a bit.' },
      { status: 502 },
    );
  }
}
