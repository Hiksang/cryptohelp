import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider, PostHogProvider } from "@/components/providers";
import { FeedbackButton } from "@/components/feedback";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "buidlTown - Web3 Hackathons & Grants",
  description: "Discover and track Web3 hackathons and grants across all major platforms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <PostHogProvider>
            {children}
            <FeedbackButton />
          </PostHogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
