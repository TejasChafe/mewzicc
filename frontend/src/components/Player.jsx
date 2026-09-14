import React, { useEffect, useRef, useState } from "react";

import { useAntiSpoofing } from "../hooks/useAntiSpoofing";

export default function Player({
  track,
  walletAddress,
  payoutThreshold = 10,
  onTriggerPayout,
}) {
  const audioRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualifiedPlays, setQualifiedPlays] = useState(0);

  const { listenSeconds, qualified, blocked, reset, handleTimeUpdate } =
    useAntiSpoofing({
      walletAddress,
      track,
      onQualifiedPlay: handleQualifiedPlay,
    });

  useEffect(() => {
    reset();

    setCurrentTime(0);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [track.id, reset]);

  function handleQualifiedPlay({ walletAddress, track }) {
    console.log("QUALIFIED PLAY", {
      walletAddress,
      trackId: track.id,
      artist: track.artist,
    });

    setQualifiedPlays((previous) => {
      const next = previous + 1;

      if (next >= payoutThreshold && onTriggerPayout) {
        onTriggerPayout({
          walletAddress,
          track,
          qualifiedPlays: next,
        });
      }

      return next;
    });
  }

  async function togglePlay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (blocked) {
      alert("This wallet has reached its 24-hour stream limit.");
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
    }
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setDuration(audio.duration);
  }

  function handleTimeUpdateEvent() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setCurrentTime(audio.currentTime);
    handleTimeUpdate(audio.currentTime);
  }

  function handleSeek(event) {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = Number(event.target.value);
  }

  function handleEnded() {
    setIsPlaying(false);
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  const qualificationProgress = Math.min((listenSeconds / 30) * 100, 100);

  return (
    <div className="player">
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdateEvent}
        onEnded={handleEnded}
      />

      <div className="player-info">
        {track.coverUrl && (
          <img
            src={track.coverUrl}
            alt={track.title}
            className="player-cover"
          />
        )}

        <div>
          <h3>{track.title}</h3>
          <p>{track.artist}</p>
        </div>
      </div>

      <div className="player-controls">
        <button onClick={togglePlay} disabled={blocked}>
          {isPlaying ? "Pause" : "Play"}
        </button>

        <span>{formatTime(currentTime)}</span>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
        />

        <span>{formatTime(duration)}</span>
      </div>

      <div className="qualification">
        <div>
          Continuous listen: {Math.floor(listenSeconds)}
          /30 seconds
        </div>

        <progress value={qualificationProgress} max="100" />

        {qualified && <div>✓ Qualified play</div>}

        {blocked && <div>✕ Wallet stream limit reached</div>}

        <div>Qualified plays: {qualifiedPlays}</div>
      </div>
    </div>
  );
}
