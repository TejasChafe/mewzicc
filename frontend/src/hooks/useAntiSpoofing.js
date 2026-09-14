import { useCallback, useRef, useState } from "react";

import {
  QUALIFICATION_SECONDS,
  canWalletStream,
  recordQualifiedStream,
} from "../utils/antiSpoofing";

export function useAntiSpoofing({ walletAddress, track, onQualifiedPlay }) {
  const [listenSeconds, setListenSeconds] = useState(0);

  const [qualified, setQualified] = useState(false);

  const [blocked, setBlocked] = useState(false);

  const lastTimeRef = useRef(null);

  const qualifiedRef = useRef(false);

  const reset = useCallback(() => {
    setListenSeconds(0);
    setQualified(false);
    setBlocked(false);

    qualifiedRef.current = false;

    lastTimeRef.current = null;
  }, []);

  const qualify = useCallback(() => {
    if (qualifiedRef.current || blocked) {
      return;
    }

    if (!walletAddress) {
      setBlocked(true);
      return;
    }

    const result = canWalletStream(walletAddress);

    if (!result.allowed) {
      setBlocked(true);

      console.warn("Stream blocked:", result.reason);

      return;
    }

    recordQualifiedStream({
      walletAddress,
      trackId: track.id,
      artist: track.artist,
    });

    qualifiedRef.current = true;

    setQualified(true);

    console.log("Qualified play:", track.title);

    if (onQualifiedPlay) {
      onQualifiedPlay({
        walletAddress,
        track,
      });
    }
  }, [walletAddress, track, blocked, onQualifiedPlay]);

  const handleTimeUpdate = useCallback(
    (currentTime) => {
      if (qualifiedRef.current || blocked) {
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
        return;
      }

      const delta = currentTime - lastTimeRef.current;

      /*
       * Normal playback produces
       * small time increments.
       *
       * A large jump usually means
       * the user seeked.
       */
      if (delta > 0 && delta <= 1.5) {
        setListenSeconds((previous) => {
          const next = previous + delta;

          if (next >= QUALIFICATION_SECONDS && !qualifiedRef.current) {
            qualify();
          }

          return next;
        });
      }

      lastTimeRef.current = currentTime;
    },
    [blocked, qualify],
  );

  return {
    listenSeconds,
    qualified,
    blocked,
    reset,
    handleTimeUpdate,
  };
}
