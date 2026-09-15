/** Provides constant-time authentication for private analytics endpoints. */
import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Checks a strict Bearer authorization header without length-based token comparison. */
export function hasValidBearerToken(request: Request, expectedToken: string): boolean {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) return false;

  return timingSafeEqual(digest(match[1]), digest(expectedToken));
}
