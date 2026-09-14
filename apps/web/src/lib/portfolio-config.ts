/** Loads owner-editable portfolio JSON and validates its structured settings. */
import { analyticsPublicConfigSchema, resumeConfigSchema } from "@portfolio-no-jutsu/contracts";
import rawPortfolioConfig from "../../../../portfolio.config.json";

export const portfolioConfig = {
  ...rawPortfolioConfig,
  resume: resumeConfigSchema.parse(rawPortfolioConfig.resume),
  analytics: analyticsPublicConfigSchema.parse(rawPortfolioConfig.analytics),
};
