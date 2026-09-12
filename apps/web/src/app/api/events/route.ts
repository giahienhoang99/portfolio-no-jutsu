/** Public, abuse-protected ingestion endpoint for allowlisted analytics events. */
import { createEventsRouteHandlers, resolveVercelVisitorAddress } from "@/lib/analytics/event-handler";
import { getAnalyticsEventRuntime } from "@/lib/analytics/event-runtime";

export const runtime = "nodejs";

const handlers = createEventsRouteHandlers({
  getRuntime: getAnalyticsEventRuntime,
  resolveVisitorAddress: resolveVercelVisitorAddress,
});

export const POST = handlers.POST;
export const OPTIONS = handlers.OPTIONS;
