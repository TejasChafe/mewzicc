import { useCallback, useRef, useState } from "react";
import {
  QUALIFICATION_SECONDS,
  MAX_MONETIZED_STREAMS_PER_24H,
  isStreamMonetizable,
  recordQualifiedStream,
} from "../utils/antiSpoofing";

export function useAntiSpoofing({ walletAddress, track, onQualifiedPlay }) {
  const [listenSeconds, setListenSeconds] = useState(0);
  const [qualified, setQualified] = useState(false);
  const [monetizationExhausted, setMonetizationExhausted] = useState(false);

  const lastTimeRef = useRef(null);
  const qualifiedRef = useRef(false);

  const reset = useCallback(() => {
    setListenSeconds(0);
    setQualified(false);
    qualifiedRef.current = false;
    lastTimeRef.current = null;

    // Check if this wallet has already exhausted rewards for this song
    if (walletAddress && track?.id) {
      const status = isStreamMonetizable(walletAddress, track.id);
      setMonetizationExhausted(!status.monetizable);
    } else {
      setMonetizationExhausted(false);
    }
  }, [walletAddress, track]);

  const qualify = useCallback(() => {
    if (qualifiedRef.current) return;

    // If no wallet connected, let them listen, but don't monetize
    if (!walletAddress) {
      console.log("Free playback: Wallet not connected, no royalty generated.");
      return;
    }

    const check = isStreamMonetizable(walletAddress, track.id);

    if (!check.monetizable) {
      setMonetizationExhausted(true);
      console.log("Free playback: 24h monetized limit reached for this track.");
      return;
    }

    // Record the monetized play in local history
    recordQualifiedStream({
      walletAddress,
      trackId: track.id,
      artist: track.artist,
    });

    qualifiedRef.current = true;
    setQualified(true);

    if (onQualifiedPlay) {
      onQualifiedPlay({
        walletAddress,
        track,
      });
    }

    // Check if that was their last monetized play
    if (check.count + 1 >= MAX_MONETIZED_STREAMS_PER_24H) {
      setMonetizationExhausted(true);
    }
  }, [walletAddress, track, onQualifiedPlay]);

  const handleTimeUpdate = useCallback(
    (currentTime) => {
      // If already qualified for this playback cycle, just advance playback
      if (qualifiedRef.current) {
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
        return;
      }

      const delta = currentTime - lastTimeRef.current;

      // Normal playback increments without skipping
      if (delta > 0 && delta <= 1.5) {
        setListenSeconds((prev) => {
          const next = prev + delta;
          if (next >= QUALIFICATION_SECONDS && !qualifiedRef.current) {
            qualify();
          }
          return next;
        });
      }

      lastTimeRef.current = currentTime;
    },
    [qualify],
  );

  return {
    listenSeconds,
    qualified,
    monetizationExhausted,
    reset,
    handleTimeUpdate,
  };
}
