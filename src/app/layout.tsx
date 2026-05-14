import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: "#0C1F2C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "Centro Metabólico Pro",
  description: "Seguimiento nutricional clínico personalizado · Planes nutricionales, adherencia diaria y asistente IA",
  applicationName: "Centro Metabólico Pro",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CMetabólico",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Centro Metabólico Pro",
    description: "Seguimiento nutricional clínico personalizado",
    type: "website",
    locale: "es_CL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {/* Apple-specific PWA meta — not covered by the Metadata API */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CMetabólico" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
