const STORAGE_KEY = "mewzicc_stream_history";

const MAX_STREAMS_PER_24H = 5;

export const QUALIFICATION_SECONDS = 30;

function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
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

export function canWalletStream(walletAddress) {
  if (!walletAddress) {
    return {
      allowed: false,
      reason: "Wallet not connected",
    };
  }

  let history = getHistory();

  history = removeExpiredEntries(history);

  saveHistory(history);

  const walletStreams = history.filter(
    (entry) => entry.wallet.toLowerCase() === walletAddress.toLowerCase(),
  );

  if (walletStreams.length >= MAX_STREAMS_PER_24H) {
    return {
      allowed: false,
      reason: "24-hour wallet stream limit reached",
      count: walletStreams.length,
    };
  }

  return {
    allowed: true,
    count: walletStreams.length,
  };
}

export function recordQualifiedStream({ walletAddress, trackId, artist }) {
  if (!walletAddress) {
    throw new Error("Wallet address required");
  }

  let history = getHistory();

  history = removeExpiredEntries(history);

  history.push({
    wallet: walletAddress,
    trackId,
    artist,
    timestamp: Date.now(),
  });

  saveHistory(history);

  return history;
}

export function getWalletStreamCount(walletAddress) {
  if (!walletAddress) {
    return 0;
  }

  let history = getHistory();

  history = removeExpiredEntries(history);

  saveHistory(history);

  return history.filter(
    (entry) => entry.wallet.toLowerCase() === walletAddress.toLowerCase(),
  ).length;
}
