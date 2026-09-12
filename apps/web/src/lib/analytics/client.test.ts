/** Verifies best-effort browser analytics delivery and opt-out behavior. */
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAnalyticsClient, type AnalyticsTransport } from "./client";

function successfulTransport() {
  return vi.fn<AnalyticsTransport>(async () => undefined);
}

describe("analytics client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("performs no request when analytics is disabled", async () => {
    const transport = successfulTransport();
    const client = createAnalyticsClient({ enabled: false, transport });

    await client.report({ name: "visit", route: "/" });

    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    { name: "visit" as const, route: "/" },
    { name: "resume_view" as const, route: "/resume" },
    { name: "resume_download" as const, route: "/resume" },
  ])("sends the allowlisted $name event", async (event) => {
    const transport = successfulTransport();
    const client = createAnalyticsClient({ enabled: true, transport });

    await client.report(event);

    expect(transport).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      credentials: "same-origin",
      keepalive: true,
    });
  });

  it("does not send a payload that fails the runtime contract", async () => {
    const transport = successfulTransport();
    const client = createAnalyticsClient({ enabled: true, transport });

    await client.report({ name: "visit", route: "https://foreign.example" });

    expect(transport).not.toHaveBeenCalled();
  });

  it("uses the browser fetch transport by default", async () => {
    const transport = successfulTransport();
    vi.stubGlobal("fetch", transport);

    await createAnalyticsClient({ enabled: true }).report({ name: "visit", route: "/" });

    expect(transport).toHaveBeenCalledOnce();
  });

  it("contains synchronous and asynchronous transport failures", async () => {
    const synchronousFailure = vi.fn<AnalyticsTransport>(() => {
      throw new Error("network unavailable");
    });
    const asynchronousFailure = vi.fn<AnalyticsTransport>(async () => {
      throw new Error("request rejected");
    });

    await expect(createAnalyticsClient({ enabled: true, transport: synchronousFailure }).report({ name: "visit", route: "/" })).resolves.toBeUndefined();
    await expect(createAnalyticsClient({ enabled: true, transport: asynchronousFailure }).report({ name: "visit", route: "/" })).resolves.toBeUndefined();
  });
});
