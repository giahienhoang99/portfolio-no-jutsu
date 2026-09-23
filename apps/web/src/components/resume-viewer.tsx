/** Renders the hosted resume and reports its first visible appearance. */
"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";

import { createAnalyticsClient } from "@/lib/analytics/client";
import { startResumeViewTracking } from "@/lib/analytics/resume-view-tracking";

export interface ResumeViewerProps {
  analyticsEnabled: boolean;
  downloadFileName: string;
  pdfPath: string;
}

/** Displays a same-origin PDF with tracked, best-effort view and download actions. */
export function ResumeViewer({ analyticsEnabled, downloadFileName, pdfPath }: ResumeViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const reportedViewRef = useRef(false);
  const analytics = useMemo(() => createAnalyticsClient({ enabled: analyticsEnabled }), [analyticsEnabled]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    return startResumeViewTracking({
      enabled: analyticsEnabled,
      target: viewer,
      onVisible: () => {
        if (reportedViewRef.current) return;
        reportedViewRef.current = true;
        void analytics.report({ name: "resume_view", route: "/resume" });
      },
    });
  }, [analytics, analyticsEnabled]);

  return (
    <section className="resume-page" aria-labelledby="resume-heading">
      <header className="resume-toolbar">
        <div>
          <Link className="resume-back" href="/">← Portfolio</Link>
          <h1 id="resume-heading">Résumé</h1>
        </div>
        <a className="button button-primary" download={downloadFileName} href="/api/resume/download">
          Download PDF <span aria-hidden="true">↓</span>
        </a>
      </header>
      <div className="resume-frame" ref={viewerRef}>
        <iframe src={`${pdfPath}#view=FitH`} title="Hien Hoang résumé" />
      </div>
      <p className="resume-fallback">
        If the embedded résumé does not load, <a href={pdfPath}>open the PDF directly</a>.
      </p>
    </section>
  );
}
