import type { Metadata } from "next";
import { Providers } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora DealFlow",
  description: "Property data, AI deal scoring, and CRM for real estate investors",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="page-bg min-h-screen font-sans antialiased text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
