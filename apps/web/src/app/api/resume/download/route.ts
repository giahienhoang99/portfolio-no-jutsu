/** Redirects to the hosted resume while deferring best-effort download analytics. */
import { after } from "next/server";

import { getAnalyticsEventRuntime } from "@/lib/analytics/event-runtime";
import { resolveVercelVisitorAddress } from "@/lib/analytics/event-handler";
import { createResumeDownloadHandler } from "@/lib/analytics/resume-download";
import { portfolioConfig } from "@/lib/portfolio-config";

export const runtime = "nodejs";

export const GET = createResumeDownloadHandler({
  getResumeConfig: () => portfolioConfig.resume,
  getRuntime: getAnalyticsEventRuntime,
  resolveVisitorAddress: resolveVercelVisitorAddress,
  schedule: (task) => after(task),
});
