import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncNest · 일정 공유 플랫폼",
  description:
    "팀, 알바, 개인 일정을 한 화면에서 통합 관리하면서 캘린더별 권한으로 안전하게 공유하는 일정 서비스입니다. Google Calendar 연동 지원.",
  openGraph: {
    title: "SyncNest · 일정 공유 플랫폼",
    description: "팀, 알바, 개인 일정을 한 화면에서 · 권한 분리 공유 · Google Calendar 연동",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
