/**
 * Parses IC rejection errors into user-friendly messages.
 *
 * IC0508 / canister-stopped errors are thrown as plain JS Error objects whose
 * message contains identifiable strings.  We intercept those and return a
 * friendly string so the UI never shows raw rejection text.
 */
export function parseIcError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : JSON.stringify(err);

  // Canister stopped / IC0508
  if (raw.includes("IC0508") || raw.includes("is stopped")) {
    return "The service is temporarily unavailable. Please try again in a moment.";
  }

  // Generic IC rejection (network, replica, etc.)
  if (
    raw.includes("Reject code") ||
    raw.includes("rejection") ||
    raw.includes("replica returned")
  ) {
    return "Unable to reach the service. Please check your connection and try again.";
  }

  // Fall back to original message or generic
  return raw.trim() || "Something went wrong. Please try again.";
}
