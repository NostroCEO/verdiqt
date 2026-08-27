import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { WebMCPProvider } from "@/components/webmcp-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Verdiqt | Put your idea on trial",
  description:
    "An evidence-first judgment cockpit where you and your agent decide what deserves to be built.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen antialiased`}>
        <WebMCPProvider />
        {children}
      </body>
    </html>
  );
}
