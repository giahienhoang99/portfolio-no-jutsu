/** Loads the owner-editable portfolio JSON and validates its public analytics settings. */
import { analyticsPublicConfigSchema } from "@portfolio-no-jutsu/contracts";
import rawPortfolioConfig from "../../../../portfolio.config.json";

export const portfolioConfig = {
  ...rawPortfolioConfig,
  analytics: analyticsPublicConfigSchema.parse(rawPortfolioConfig.analytics),
};
