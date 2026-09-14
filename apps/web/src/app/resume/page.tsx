/** Serves the repository-hosted resume viewer. */
import type { Metadata } from "next";

import { ResumeViewer } from "@/components/resume-viewer";
import { portfolioConfig } from "@/lib/portfolio-config";

export const metadata: Metadata = {
  title: `Résumé | ${portfolioConfig.site.name}`,
  description: `${portfolioConfig.site.name}'s résumé`,
};

export default function ResumePage() {
  return (
    <ResumeViewer
      analyticsEnabled={portfolioConfig.analytics.enabled && portfolioConfig.analytics.metrics.resumeViews}
      downloadFileName={portfolioConfig.resume.downloadFileName}
      pdfPath={portfolioConfig.resume.pdfPath}
    />
  );
}
