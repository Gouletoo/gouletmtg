import type { Metadata } from "next";
import { Cormorant_Infant, Khula } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Infant({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const khula = Khula({
  variable: "--font-khula",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "gouletmtg — Deck builder Commander",
  description:
    "Le deck builder Commander qui pense comme un joueur pro. Synergie, analyse, intuition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${khula.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
