'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Range = '5y' | '10y' | 'all';

type Video = {
  videoId: string;
  title: string;
  publishedAt: string;
};

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const RANGE_LABELS: Record<Range, string> = {
  '5y': 'From the last 5 years',
  '10y': 'From the last 10 years',
  all: 'Play all',
};

const RECENT_QUEUE_SIZE = 10;

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Home() {
  const [range, setRange] = useState<Range>('5y');
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const playerRef = useRef<YT.Player | null>(null);
  const recentQueueRef = useRef<string[]>([]);

  const loadRandomVideo = useCallback(
    (videoList: Video[] = videos) => {
      if (!videoList.length) {
        setCurrentVideo(null);
        return;
      }

      const recent = recentQueueRef.current;
      const queueLimit = Math.min(RECENT_QUEUE_SIZE, Math.max(videoList.length - 1, 1));
      const eligible = videoList.filter((video) => !recent.includes(video.videoId));
      const source = eligible.length > 0 ? eligible : videoList;
      const selected = source[Math.floor(Math.random() * source.length)];

      setCurrentVideo(selected);
      recent.push(selected.videoId);
      if (recent.length > queueLimit) {
        recent.shift();
      }

      if (playerRef.current) {
        playerRef.current.loadVideoById(selected.videoId);
      }
    },
    [videos],
  );

  useEffect(() => {
    let cancelled = false;
    const fetchVideos = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/videos?range=${range}`);
        const payload = (await response.json()) as { videos?: Video[]; error?: string };

        if (!response.ok || !payload.videos) {
          throw new Error(payload.error ?? 'Failed to load videos.');
        }

        if (cancelled) return;

        setVideos(payload.videos);
        recentQueueRef.current = [];

        if (!payload.videos.length) {
          setCurrentVideo(null);
          setError('No videos available for this filter. Try another range.');
        } else {
          loadRandomVideo(payload.videos);
        }
      } catch (fetchError) {
        if (cancelled) return;
        setVideos([]);
        setCurrentVideo(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load videos.');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchVideos();

    return () => {
      cancelled = true;
    };
  }, [range, loadRandomVideo]);

  useEffect(() => {
    const handleReady = () => {
      if (playerRef.current) {
        return;
      }

      playerRef.current = new window.YT!.Player('yt-player', {
        videoId: currentVideo?.videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT!.PlayerState.ENDED) {
              loadRandomVideo();
            }
          },
          onError: () => {
            loadRandomVideo();
          },
        },
      });
    };

    if (window.YT?.Player) {
      handleReady();
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = handleReady;

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, [currentVideo?.videoId, loadRandomVideo]);

  const subtitle = useMemo(() => {
    if (!currentVideo) return null;
    return `${currentVideo.title} — ${formatDate(currentVideo.publishedAt)}`;
  }, [currentVideo]);

  return (
    <main>
      <h1>Feeling Moisty?</h1>

      <div className="controls" role="group" aria-label="Video range">
        {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
          <button
            key={key}
            className={key === range ? 'active' : ''}
            onClick={() => setRange(key)}
            type="button"
          >
            {RANGE_LABELS[key]}
          </button>
        ))}

        <button onClick={() => loadRandomVideo()} type="button" disabled={!videos.length || isLoading}>
          Next random
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="player-shell">
        <div id="yt-player" />
      </div>

      <p className="meta">
        {subtitle ?? (isLoading ? 'Loading videos…' : 'Pick a range to start playback.')}
      </p>
    </main>
  );
}
