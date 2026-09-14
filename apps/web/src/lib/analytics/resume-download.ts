/** Builds a same-origin resume download response with deferred analytics reporting. */
import { resumeConfigSchema } from "@portfolio-no-jutsu/contracts";

import type { AnalyticsEventRuntime } from "./event-runtime";

export type ResumeDownloadTask = () => Promise<void>;

export interface ResumeDownloadDependencies {
  getResumeConfig: () => unknown;
  getRuntime: () => AnalyticsEventRuntime;
  resolveVisitorAddress: (request: Request) => string | null;
  schedule: (task: ResumeDownloadTask) => void;
}

function unavailableResponse(): Response {
  return Response.json(
    { error: "resume_unavailable" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Creates a handler that never lets analytics delay or prevent resume access.
 */
export function createResumeDownloadHandler(dependencies: ResumeDownloadDependencies) {
  return function GET(request: Request): Response {
    let unvalidatedConfig: unknown;
    try {
      unvalidatedConfig = dependencies.getResumeConfig();
    } catch {
      return unavailableResponse();
    }

    const parsedConfig = resumeConfigSchema.safeParse(unvalidatedConfig);
    if (!parsedConfig.success) return unavailableResponse();

    let destination: URL;
    try {
      const requestUrl = new URL(request.url);
      destination = new URL(parsedConfig.data.pdfPath, requestUrl);
      if (destination.origin !== requestUrl.origin) return unavailableResponse();
    } catch {
      return unavailableResponse();
    }

    let visitorAddress: string | null = null;
    try {
      visitorAddress = dependencies.resolveVisitorAddress(request);
    } catch {
      // Resolving analytics identity must not affect resume access.
    }
    if (visitorAddress) {
      try {
        dependencies.schedule(async () => {
          try {
            const runtime = dependencies.getRuntime();
            if (!runtime.enabled) return;
            await runtime.service.process({
              event: { name: "resume_download", route: "/resume" },
              visitorAddress,
            });
          } catch {
            // Resume access must succeed even when analytics is unavailable.
          }
        });
      } catch {
        // Scheduling telemetry is also best effort.
      }
    }

    return new Response(null, {
      status: 307,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${parsedConfig.data.downloadFileName}"`,
        Location: destination.toString(),
      },
    });
  };
}
