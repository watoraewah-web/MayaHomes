import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAYA — Worship Lyrics to PowerPoint",
  description:
    "Organize your song lyrics, preview your presentation, and generate a PowerPoint for your worship service.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
