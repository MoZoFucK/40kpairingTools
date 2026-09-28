import type { Metadata } from "next";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "40K Team Pairing Assistant",
  description:
    "Assistant de pairing pour tournois Warhammer 40 000 par équipes. Le coach décide, l'outil restitue.",
};

/**
 * `data-bs-theme="dark"` est posé en dur : le thème sombre n'est pas une préférence
 * d'affichage, c'est l'identité de l'outil. Aucune bascule à gérer, aucun scintillement
 * clair avant l'hydratation.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-bs-theme="dark">
      <body className="d-flex flex-column min-vh-100">
        <TopNav />
        <main className="flex-grow-1">{children}</main>
      </body>
    </html>
  );
}
