import type { Metadata } from "next";
import { DM_Mono, Geist } from "next/font/google";

import { WebMCPProvider } from "@/components/webmcp-provider";

import "./globals.css";

// Founder decision 2026-08-27 (settles the uitools.md Gate 4 typography
// question): reference-site metrics with legally clean faces. Geist (OFL)
// carries display and body; DM Mono (OFL) carries protocol labels and
// controls. The reference's proprietary display font is not copied.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "Verdiqt | Put your SaaS idea on trial",
  description:
    "An evidence-first judgment cockpit where you and your agent decide what deserves to be built.",
  openGraph: {
    title: "Verdiqt",
    description:
      "Put your SaaS idea on trial before you build it. Cited evidence, six weighted dimensions, one verdict, one next step.",
    type: "website",
    siteName: "Verdiqt",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verdiqt",
    description: "Put your SaaS idea on trial before you build it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${dmMono.variable} min-h-screen antialiased`}>
        <WebMCPProvider />
        {children}
      </body>
    </html>
  );
}
