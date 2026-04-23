import axios from 'axios';

/**
 * Map an error thrown by axios (or anything else) to a user-facing message.
 * Distinguishes "you're offline", "server error", "not found", etc. so the
 * UI can show something useful instead of a generic "couldn't load".
 */
export function describeFetchError(err: unknown, fallback = "Couldn't load."): string {
  if (axios.isAxiosError(err)) {
    // Network unreachable: axios sets err.message = 'Network Error' and no response.
    // Also covers airplane mode, DNS failures, captive portals.
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response) {
      return 'No internet connection. Check your network and try again.';
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'Request timed out. Please try again.';
    }
    const status = err.response.status;
    if (status >= 500) return 'The server is having trouble. Please try again soon.';
    if (status === 404) return "We couldn't find what you were looking for.";
    if (status === 401 || status === 403) return 'You need to sign in again to see this.';
    if (status >= 400) return `Couldn't load (error ${status}).`;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
