import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Centro Metabólico Pro",
  description: "Generador de Plan Nutricional · Motor clínico-comercial",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F0F4F8] text-[#1E2D3D]">
        {children}
      </body>
    </html>
  );
}
