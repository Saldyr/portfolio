// Layout racine : polices, métadonnées par défaut du site et fond visuel
// (Backdrop) communs à toutes les pages.
import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Backdrop } from "@/components/backdrop";
import { SITE_AUTHOR, SITE_NAME, SITE_TITLE } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description:
    `Portfolio de ${SITE_AUTHOR}, développeur full-stack junior. Projets, à propos et contact.`,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="relative flex min-h-full flex-1 flex-col">
          <Backdrop />
          {/* Wrapper dédié : un padding sur le div du dessus rognerait Backdrop
              (absolute + overflow:hidden) au lieu de réserver l'espace. */}
          <div className="flex min-h-full flex-1 flex-col ps-(--content-inset)">
            {children}
          </div>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}
