import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prenatrack — Barangay Maternal Health Tracking",
  description:
    "Register, monitor, and follow up on pregnant mothers across your barangay's puroks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
