/** Serves the biography, education, and technical-skills route. */
import type { Metadata } from "next";

import { AboutView } from "@/components/portfolio-views";
import { portfolioConfig } from "@/lib/portfolio-config";

export const metadata: Metadata = {
  title: `About | ${portfolioConfig.site.name}`,
  description: portfolioConfig.about.summary,
};

export default function AboutPage() {
  return <AboutView />;
}
