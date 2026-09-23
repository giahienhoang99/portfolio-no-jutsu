/** Serves the detailed professional-experience route. */
import type { Metadata } from "next";

import { ExperienceView } from "@/components/portfolio-views";
import { portfolioConfig } from "@/lib/portfolio-config";

export const metadata: Metadata = {
  title: `Experience | ${portfolioConfig.site.name}`,
  description: `${portfolioConfig.site.name}'s professional software engineering experience`,
};

export default function ExperiencePage() {
  return <ExperienceView />;
}
