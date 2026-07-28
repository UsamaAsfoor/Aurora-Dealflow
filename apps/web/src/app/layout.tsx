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
    <html lang="en" data-theme="studio" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aurora_theme');if(t==='studio'||t==='command'||t==='signal')document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="page-bg min-h-screen font-sans antialiased text-[var(--color-foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
