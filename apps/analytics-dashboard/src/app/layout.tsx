/** Defines metadata and the shared document for the protected dashboard. */
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Analytics | Hien Hoang",
  description: "Private portfolio analytics dashboard",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
