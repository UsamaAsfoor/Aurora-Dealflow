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
    <html lang="en" data-theme="studio" data-scheme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var ids=['studio','command','signal','midnight','ember','daybreak','ledger','coast','frost','atlas'];var light={daybreak:1,ledger:1,coast:1,frost:1,atlas:1};var t=localStorage.getItem('aurora_theme');if(ids.indexOf(t)===-1)t='studio';var s=light[t]?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.dataset.scheme=s;document.documentElement.style.colorScheme=s;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="page-bg min-h-screen font-sans antialiased text-[var(--color-foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
