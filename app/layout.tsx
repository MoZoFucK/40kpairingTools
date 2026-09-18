import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "40K Team Pairing Assistant",
  description:
    "Assistant de pairing pour tournois Warhammer 40 000 par équipes. Le coach décide, l'outil restitue.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="d-flex flex-column min-vh-100 bg-body-tertiary">
        <main className="flex-grow-1">{children}</main>
      </body>
    </html>
  );
}
