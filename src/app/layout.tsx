import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import NavigationHub from "@/components/NavigationHub";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "JaénTap | Carta Digital & Gestión Gastronómica",
  description: "Carta digital autogestionada y comandas en tiempo real de JaénTap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className={`${inter.className} antialiased`}>
        {children}
        <Suspense fallback={null}>
          <NavigationHub />
        </Suspense>
      </body>
    </html>
  );
}
