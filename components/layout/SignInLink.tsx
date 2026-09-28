"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Bouton de connexion de la barre supérieure.
 *
 * S'efface sur la page de connexion elle-même : un bouton qui renvoie là où l'on se
 * trouve déjà laisse croire que le clic n'a pas fonctionné.
 */
export function SignInLink() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <Link href="/login" className="btn btn-primary btn-sm">
      Se connecter
    </Link>
  );
}
