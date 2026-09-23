/** Serves the selected software-projects route. */
import type { Metadata } from "next";

import { ProjectsView } from "@/components/portfolio-views";
import { portfolioConfig } from "@/lib/portfolio-config";

export const metadata: Metadata = {
  title: `Projects | ${portfolioConfig.site.name}`,
  description: `Selected software projects by ${portfolioConfig.site.name}`,
};

export default function ProjectsPage() {
  return <ProjectsView />;
}
