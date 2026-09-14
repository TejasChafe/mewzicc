const STORAGE_KEY = "mewzicc_stream_history";

// Maximum monetized streams allowed per user per track in 24 hours
export const MAX_MONETIZED_STREAMS_PER_24H = 5;
export const QUALIFICATION_SECONDS = 30;

function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to read stream history:", error);
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function removeExpiredEntries(history) {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return history.filter((entry) => now - entry.timestamp < ONE_DAY);
}

/**
 * Checks if a specific wallet can generate revenue for a specific track.
 * This does NOT block playback; it only gates royalty qualification.
 */
export function isStreamMonetizable(walletAddress, trackId) {
  if (!walletAddress || !trackId) {
    return {
      monetizable: false,
      reason: "Wallet not connected or invalid track",
      count: 0,
    };
  }

  let history = getHistory();
  history = removeExpiredEntries(history);
  saveHistory(history);

  // Filter streams specifically for THIS wallet AND THIS track
  const trackStreamsByWallet = history.filter(
    (entry) =>
      entry.wallet.toLowerCase() === walletAddress.toLowerCase() &&
      String(entry.trackId) === String(trackId),
  );

  if (trackStreamsByWallet.length >= MAX_MONETIZED_STREAMS_PER_24H) {
    return {
      monetizable: false,
      reason: "Daily monetized stream limit reached for this track",
      count: trackStreamsByWallet.length,
    };
  }

  return {
    monetizable: true,
    count: trackStreamsByWallet.length,
  };
}

/**
 * Records a valid monetized stream for the user and track.
 */
export function recordQualifiedStream({ walletAddress, trackId, artist }) {
  if (!walletAddress) {
    throw new Error("Wallet address required to record monetized stream");
  }

  let history = getHistory();
  history = removeExpiredEntries(history);

  history.push({
    wallet: walletAddress.toLowerCase(),
    trackId: String(trackId),
    artist,
    timestamp: Date.now(),
  });

  saveHistory(history);
  return history;
}

export function getWalletTrackStreamCount(walletAddress, trackId) {
  if (!walletAddress || !trackId) return 0;
  let history = getHistory();
  history = removeExpiredEntries(history);
  saveHistory(history);

  return history.filter(
    (entry) =>
      entry.wallet.toLowerCase() === walletAddress.toLowerCase() &&
      String(entry.trackId) === String(trackId),
  ).length;
}
