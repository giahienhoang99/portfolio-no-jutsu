/** Implements the HTTP boundary for public analytics event ingestion. */
import { analyticsEventRequestSchema } from "@portfolio-no-jutsu/contracts";

import type { AnalyticsEventRuntime } from "./event-runtime";

const BODY_LIMIT_BYTES = 1_024;
const SESSION_COOKIE_NAME = "pnj_analytics_session";

export interface EventsRouteDependencies {
  getRuntime: () => AnalyticsEventRuntime;
  resolveVisitorAddress: (request: Request) => string | null;
}

class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super(status === 413 ? "Request body is too large" : "Request body is invalid");
  }
}

function noContent(headers?: HeadersInit): Response {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", ...headers } });
}

function errorResponse(status: 400 | 403 | 413 | 429 | 503, code: string, headers?: HeadersInit): Response {
  return Response.json(
    { error: code },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

function requestOriginIsAllowed(request: Request, allowedOrigins: string[]): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  try {
    const normalizedOrigin = new URL(origin).origin;
    const requestOrigin = new URL(request.url).origin;
    return normalizedOrigin === requestOrigin || allowedOrigins.includes(normalizedOrigin) ? normalizedOrigin : null;
  } catch {
    return null;
  }
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function sessionIdFromCookies(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator === -1) continue;
    if (cookie.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function sessionCookie(value: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new RequestBodyError(400);

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) throw new RequestBodyError(400);
    if (declaredLength > BODY_LIMIT_BYTES) throw new RequestBodyError(413);
  }

  if (!request.body) throw new RequestBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > BODY_LIMIT_BYTES) {
      await reader.cancel();
      throw new RequestBodyError(413);
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch {
    throw new RequestBodyError(400);
  }
}

export function resolveVercelVisitorAddress(request: Request): string | null {
  if (process.env.VERCEL === "1") {
    const forwardedAddress = request.headers.get("x-vercel-forwarded-for")?.trim();
    return forwardedAddress || null;
  }
  if (process.env.NODE_ENV === "development" && process.env.VERCEL !== "1") return "127.0.0.1";
  return null;
}

export function createEventsRouteHandlers(dependencies: EventsRouteDependencies) {
  return {
    async POST(request: Request): Promise<Response> {
      let analyticsRuntime: AnalyticsEventRuntime;
      try {
        analyticsRuntime = dependencies.getRuntime();
      } catch {
        return errorResponse(503, "analytics_unavailable");
      }

      if (!analyticsRuntime.enabled) return noContent();

      const allowedOrigin = requestOriginIsAllowed(request, analyticsRuntime.allowedOrigins);
      if (!allowedOrigin) return errorResponse(403, "forbidden");
      const responseCorsHeaders = corsHeaders(allowedOrigin);

      let unvalidatedBody: unknown;
      try {
        unvalidatedBody = await readJsonBody(request);
      } catch (error) {
        if (error instanceof RequestBodyError) {
          return errorResponse(error.status, error.status === 413 ? "payload_too_large" : "invalid_request", responseCorsHeaders);
        }
        return errorResponse(400, "invalid_request", responseCorsHeaders);
      }

      const parsedEvent = analyticsEventRequestSchema.safeParse(unvalidatedBody);
      if (!parsedEvent.success) return errorResponse(400, "invalid_request", responseCorsHeaders);

      const visitorAddress = dependencies.resolveVisitorAddress(request);
      if (!visitorAddress) return errorResponse(403, "forbidden", responseCorsHeaders);

      try {
        const result = await analyticsRuntime.service.process({
          event: parsedEvent.data,
          visitorAddress,
          sessionId: sessionIdFromCookies(request),
        });

        if (result.status === "rate_limited") {
          return errorResponse(429, "rate_limited", {
            ...responseCorsHeaders,
            "Retry-After": String(result.retryAfterSeconds),
          });
        }
        if (result.status === "ignored") return noContent(responseCorsHeaders);

        return noContent({
          ...responseCorsHeaders,
          "Set-Cookie": sessionCookie(result.sessionId, result.sessionMaxAgeSeconds),
        });
      } catch {
        return errorResponse(503, "analytics_unavailable", responseCorsHeaders);
      }
    },

    async OPTIONS(request: Request): Promise<Response> {
      let analyticsRuntime: AnalyticsEventRuntime;
      try {
        analyticsRuntime = dependencies.getRuntime();
      } catch {
        return errorResponse(503, "analytics_unavailable");
      }
      if (!analyticsRuntime.enabled) return noContent();

      const allowedOrigin = requestOriginIsAllowed(request, analyticsRuntime.allowedOrigins);
      if (!allowedOrigin) return errorResponse(403, "forbidden");
      return noContent({
        ...corsHeaders(allowedOrigin),
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
      });
    },
  };
}
