import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TestingWatermark } from "@/components/testing-watermark";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Exodis - FDA Nutrition Label Generator",
  description: "Generate FDA-compliant nutrition labels for your food products. Full support for 21 CFR 101.9 requirements.",
  keywords: ["FDA", "nutrition labels", "food compliance", "NFP", "21 CFR 101.9"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <TestingWatermark />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

