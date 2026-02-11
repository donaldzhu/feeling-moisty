declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    loadVideoById(videoId: string): void;
  }

  interface PlayerOptions {
    videoId?: string;
    playerVars?: {
      autoplay?: number;
      rel?: number;
    };
    events?: {
      onStateChange?: (event: OnStateChangeEvent) => void;
      onError?: (event: OnErrorEvent) => void;
    };
  }

  interface OnStateChangeEvent {
    data: number;
  }

  interface OnErrorEvent {
    data: number;
  }

  const PlayerState: {
    ENDED: number;
  };
}
