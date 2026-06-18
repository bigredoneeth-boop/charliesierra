/**
 * Extract a human-readable error string from a backend result object.
 *
 * The Candid bindgen sometimes deserializes Motoko `#error : Text` variants
 * into different shapes depending on the exact type definition:
 *   - Old buggy shape: { __kind__: 'err', err: undefined }
 *   - New shape:       { __kind__: 'err', err: 'some error text' }
 *
 * This helper normalises both shapes and always returns a string.
 */
export function extractErrText(result: unknown): string {
  if (result === null || result === undefined) {
    return "unknown backend error";
  }

  const r = result as Record<string, unknown>;

  // If result has a top-level "error" string field, use it directly.
  if (typeof r.error === "string" && r.error.length > 0) {
    return r.error;
  }

  // Only attempt extraction when the result is an error variant.
  if (r.__kind__ !== "err") {
    return "unknown backend error";
  }

  // New Candid-generated shape: result.err is an object with __kind__ === "error" and error: string.
  if (
    typeof r.err === "object" &&
    r.err !== null &&
    (r.err as Record<string, unknown>).__kind__ === "error" &&
    typeof (r.err as Record<string, unknown>).error === "string"
  ) {
    return (r.err as Record<string, unknown>).error as string;
  }

  // New shape: result.err is a plain string.
  if (typeof r.err === "string" && r.err.length > 0) {
    return r.err;
  }

  // Old buggy shape: result.err is undefined. Try common fallback keys.
  for (const key of ["error", "message", "text", "detail"]) {
    const val = r[key];
    if (typeof val === "string" && val.length > 0) {
      return val;
    }
  }

  // Last resort: stringify the whole object (clamped) so we never lose info.
  try {
    const json = JSON.stringify(r);
    if (json && json !== "{}" && json !== "{}") {
      return json.length > 200 ? `${json.slice(0, 200)}…` : json;
    }
  } catch {
    // ignore stringify failures
  }

  return "unknown backend error";
}
