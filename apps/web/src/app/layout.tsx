import type { Metadata } from "next";
import { Itim } from "next/font/google";
import "./globals.css";
import portfolioConfig from "../../../../portfolio.config.json";

const itim = Itim({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-itim",
});

export const metadata: Metadata = {
  title: `Portfolio no Jutsu | ${portfolioConfig.site.name}`,
  description: portfolioConfig.site.tagline,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={itim.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
