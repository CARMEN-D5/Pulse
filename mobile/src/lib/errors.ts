const OFFLINE_PATTERNS = [
  "failed to fetch",
  "network request failed",
  "networkerror",
  "load failed",
  "network request",
  "offline"
];

export function withOfflineHint(message: string) {
  const normalized = message.toLowerCase();
  const isLikelyOffline = OFFLINE_PATTERNS.some((pattern) => normalized.includes(pattern));

  if (!isLikelyOffline) {
    return message;
  }

  return `${message} Check your connection and try again.`;
}

export function toHelpfulErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return withOfflineHint(error.message);
  }

  return fallback;
}
