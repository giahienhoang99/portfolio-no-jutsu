/** Verifies that resume downloads remain available around analytics failures. */
import { describe, expect, it, vi } from "vitest";

import type { AnalyticsEventProcessor } from "./event-service";
import type { AnalyticsEventRuntime } from "./event-runtime";
import {
  createResumeDownloadHandler,
  type ResumeDownloadDependencies,
  type ResumeDownloadTask,
} from "./resume-download";

const resumeConfig = {
  pdfPath: "/resume/hien-hoang-resume.pdf",
  downloadFileName: "Hien-Hoang-Resume.pdf",
};

function runtime(process: AnalyticsEventProcessor["process"]): AnalyticsEventRuntime {
  return { enabled: true, allowedOrigins: [], service: { process } };
}

function setup(overrides: Partial<ResumeDownloadDependencies> = {}) {
  const process = vi.fn<AnalyticsEventProcessor["process"]>(async () => ({
    status: "accepted",
    sessionId: "s".repeat(43),
    sessionMaxAgeSeconds: 1_800,
  }));
  const tasks: ResumeDownloadTask[] = [];
  const dependencies: ResumeDownloadDependencies = {
    getResumeConfig: () => resumeConfig,
    getRuntime: () => runtime(process),
    resolveVisitorAddress: () => "visitor-address",
    schedule: (task) => { tasks.push(task); },
    ...overrides,
  };
  return {
    handler: createResumeDownloadHandler(dependencies),
    process,
    tasks,
  };
}

describe("resume download handler", () => {
  it("redirects immediately and records the explicit download afterward", async () => {
    const { handler, process, tasks } = setup();

    const response = handler(new Request("https://portfolio.example/api/resume/download"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://portfolio.example/resume/hien-hoang-resume.pdf");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="Hien-Hoang-Resume.pdf"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(process).not.toHaveBeenCalled();

    await tasks[0]?.();
    expect(process).toHaveBeenCalledWith({
      event: { name: "resume_download", route: "/resume" },
      visitorAddress: "visitor-address",
    });
  });

  it.each([
    undefined,
    { pdfPath: "https://foreign.example/resume.pdf", downloadFileName: "Resume.pdf" },
    { pdfPath: "/resume/resume.pdf", downloadFileName: "../Resume.pdf" },
  ])("returns a stable unavailable response for missing or invalid configuration", async (configuration) => {
    const { handler, tasks } = setup({ getResumeConfig: () => configuration });

    const response = handler(new Request("https://portfolio.example/api/resume/download"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "resume_unavailable" });
    expect(tasks).toHaveLength(0);
  });

  it("returns the redirect when analytics is disabled or visitor data is unavailable", async () => {
    const disabled = setup({ getRuntime: () => ({ enabled: false }) });
    const anonymous = setup({ resolveVisitorAddress: () => null });
    const resolverFailure = setup({ resolveVisitorAddress: () => { throw new Error("visitor unavailable"); } });

    expect(disabled.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    expect(anonymous.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    expect(resolverFailure.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    await disabled.tasks[0]?.();

    expect(disabled.process).not.toHaveBeenCalled();
    expect(anonymous.tasks).toHaveLength(0);
    expect(resolverFailure.tasks).toHaveLength(0);
  });

  it("returns the redirect when runtime, storage, or scheduling fails", async () => {
    const runtimeFailure = setup({ getRuntime: () => { throw new Error("configuration unavailable"); } });
    const storageFailure = setup({
      getRuntime: () => runtime(async () => { throw new Error("database unavailable"); }),
    });
    const schedulingFailure = setup({ schedule: () => { throw new Error("scheduler unavailable"); } });

    expect(runtimeFailure.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    expect(storageFailure.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    expect(schedulingFailure.handler(new Request("https://portfolio.example/api/resume/download")).status).toBe(307);
    await expect(runtimeFailure.tasks[0]?.()).resolves.toBeUndefined();
    await expect(storageFailure.tasks[0]?.()).resolves.toBeUndefined();
  });

  it("contains configuration loader failures", async () => {
    const { handler } = setup({ getResumeConfig: () => { throw new Error("missing configuration"); } });

    const response = handler(new Request("https://portfolio.example/api/resume/download"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "resume_unavailable" });
  });
});
