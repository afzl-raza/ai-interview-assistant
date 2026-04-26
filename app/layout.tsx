import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alex Interview Partner",
  description: "Resume-aware AI mock interview assistant with Claude and voice input/output.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
