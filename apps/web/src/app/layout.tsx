/** Defines shared metadata, typography, and document structure for every portfolio route. */
import type { Metadata } from "next";
import { Itim } from "next/font/google";
import "./globals.css";
import { AnalyticsVisitReporter } from "@/components/analytics-visit-reporter";
import { portfolioConfig } from "@/lib/portfolio-config";

const itim = Itim({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-itim",
});

export const metadata: Metadata = {
  title: `Portfolio no Jutsu | ${portfolioConfig.site.name}`,
  description: portfolioConfig.site.tagline,
};

/**
 * Wraps every route in the portfolio's root HTML document.
 *
 * @param props - Root-layout properties supplied by Next.js.
 * @param props.children - Route content to render inside the document body.
 * @returns The shared root HTML and body elements.
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={itim.variable} lang="en">
      <body>
        <AnalyticsVisitReporter enabled={portfolioConfig.analytics.enabled} />
        {children}
      </body>
    </html>
  );
}
