/** Verifies the public analytics HTTP boundary and its safe response contract. */
import { afterEach, describe, expect, it, vi } from "vitest";

import { createEventsRouteHandlers, resolveVercelVisitorAddress } from "./event-handler";
import type { AnalyticsEventProcessor } from "./event-service";
import type { AnalyticsEventRuntime } from "./event-runtime";

const acceptedResult = { status: "accepted" as const, sessionId: "s".repeat(43), sessionMaxAgeSeconds: 1_800 };

function enabledRuntime(process: AnalyticsEventProcessor["process"]): AnalyticsEventRuntime {
  return {
    enabled: true,
    allowedOrigins: ["https://allowed.example"],
    service: { process },
  };
}

function request(body: BodyInit | null = JSON.stringify({ name: "visit", route: "/" }), headers: HeadersInit = {}): Request {
  return new Request("https://portfolio.example/api/events", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      origin: "https://portfolio.example",
      "x-vercel-forwarded-for": "test-address",
      ...headers,
    },
    body,
  });
}

describe("analytics event handler", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a valid event and returns a secure session cookie", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({
      getRuntime: () => enabledRuntime(process),
      resolveVisitorAddress: () => "test-address",
    });

    const response = await handlers.POST(request());

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBe(
      `pnj_analytics_session=${acceptedResult.sessionId}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax`,
    );
    expect(process).toHaveBeenCalledWith({
      event: { name: "visit", route: "/" },
      visitorAddress: "test-address",
      sessionId: undefined,
    });
  });

  it("reads an existing analytics session cookie", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({
      getRuntime: () => enabledRuntime(process),
      resolveVisitorAddress: () => "test-address",
    });

    await handlers.POST(request(undefined, { cookie: `theme=dark; pnj_analytics_session=${acceptedResult.sessionId}` }));

    expect(process).toHaveBeenCalledWith(expect.objectContaining({ sessionId: acceptedResult.sessionId }));
  });

  it("returns without resolving request data when analytics is disabled", async () => {
    const resolveVisitorAddress = vi.fn(() => "test-address");
    const handlers = createEventsRouteHandlers({ getRuntime: () => ({ enabled: false }), resolveVisitorAddress });

    const response = await handlers.POST(request("not-json", { origin: "https://foreign.example" }));

    expect(response.status).toBe(204);
    expect(resolveVisitorAddress).not.toHaveBeenCalled();
  });

  it.each([
    ["missing content type", request(undefined, { "content-type": "" })],
    ["invalid JSON", request("{" )],
    ["unknown event", request(JSON.stringify({ name: "scroll", route: "/" }))],
    ["extra fields", request(JSON.stringify({ name: "visit", route: "/", metadata: "nope" }))],
    ["external route", request(JSON.stringify({ name: "visit", route: "https://foreign.example" }))],
  ])("rejects %s", async (_caseName, invalidRequest) => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });

    const response = await handlers.POST(invalidRequest);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(process).not.toHaveBeenCalled();
  });

  it("rejects declared and streamed bodies over one kilobyte", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });
    const largeBody = JSON.stringify({ name: "visit", route: `/${"a".repeat(1_100)}` });

    const declaredResponse = await handlers.POST(request("{}", { "content-length": "2048" }));
    const streamedResponse = await handlers.POST(request(largeBody));

    expect(declaredResponse.status).toBe(413);
    expect(streamedResponse.status).toBe(413);
    expect(process).not.toHaveBeenCalled();
  });

  it.each([
    ["missing origin", { origin: "" }],
    ["foreign origin", { origin: "https://foreign.example" }],
  ])("rejects a %s", async (_caseName, headers) => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });

    const response = await handlers.POST(request(undefined, headers));

    expect(response.status).toBe(403);
    expect(process).not.toHaveBeenCalled();
  });

  it("accepts an explicitly configured origin and emits matching CORS headers", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });

    const response = await handlers.POST(request(undefined, { origin: "https://allowed.example" }));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://allowed.example");
    expect(response.headers.get("vary")).toBe("Origin");
  });

  it("rejects requests without trusted Vercel client data", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => null });

    const response = await handlers.POST(request());

    expect(response.status).toBe(403);
    expect(process).not.toHaveBeenCalled();
  });

  it("returns rate-limit and retry information without exposing internals", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => ({ status: "rate_limited", retryAfterSeconds: 17 }));
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });

    const response = await handlers.POST(request());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("17");
    await expect(response.json()).resolves.toEqual({ error: "rate_limited" });
  });

  it("contains runtime and storage failures behind a stable unavailable response", async () => {
    const unavailable = new Error("private database detail");
    const runtimeHandlers = createEventsRouteHandlers({ getRuntime: () => { throw unavailable; }, resolveVisitorAddress: () => "test-address" });
    const storageHandlers = createEventsRouteHandlers({
      getRuntime: () => enabledRuntime(async () => { throw unavailable; }),
      resolveVisitorAddress: () => "test-address",
    });

    const runtimeResponse = await runtimeHandlers.POST(request());
    const storageResponse = await storageHandlers.POST(request());
    const storageBody = await storageResponse.text();

    expect(runtimeResponse.status).toBe(503);
    expect(storageResponse.status).toBe(503);
    expect(JSON.parse(storageBody)).toEqual({ error: "analytics_unavailable" });
    expect(storageBody).not.toContain(unavailable.message);
  });

  it("answers allowed preflights and rejects foreign ones", async () => {
    const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => acceptedResult);
    const handlers = createEventsRouteHandlers({ getRuntime: () => enabledRuntime(process), resolveVisitorAddress: () => "test-address" });

    const allowed = await handlers.OPTIONS(new Request("https://portfolio.example/api/events", { headers: { origin: "https://allowed.example" } }));
    const rejected = await handlers.OPTIONS(new Request("https://portfolio.example/api/events", { headers: { origin: "https://foreign.example" } }));

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(rejected.status).toBe(403);
  });
});

describe("resolveVercelVisitorAddress", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses only Vercel's proxy-safe forwarded address header", () => {
    vi.stubEnv("VERCEL", "1");
    expect(resolveVercelVisitorAddress(new Request("https://portfolio.example", {
      headers: { "x-vercel-forwarded-for": " test-address ", "x-forwarded-for": "untrusted-address" },
    }))).toBe("test-address");
    expect(resolveVercelVisitorAddress(new Request("https://portfolio.example", {
      headers: { "x-forwarded-for": "untrusted-address" },
    }))).toBeNull();
  });

  it("rejects client-controlled forwarding headers outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(resolveVercelVisitorAddress(new Request("https://portfolio.example", {
      headers: { "x-vercel-forwarded-for": "untrusted-address" },
    }))).toBeNull();
  });
});
