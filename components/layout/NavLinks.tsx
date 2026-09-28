"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
  /** Vrai si l'onglet couvre aussi les pages filles (`/tournaments/…`). */
  matchChildren?: boolean;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchChildren) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

/**
 * Onglets de la barre supérieure.
 *
 * Seul composant client du chrome applicatif : `usePathname` est le seul moyen de
 * savoir où l'on se trouve. La liste elle-même est calculée côté serveur, où le rôle
 * est connu — ce qu'un onglet donne à voir ne se décide pas dans le navigateur (§38).
 */
export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <ul className="navbar-nav flex-row flex-wrap gap-3 mb-0">
      {items.map((item) => {
        const active = isActive(pathname, item);

        return (
          <li key={item.href} className="nav-item">
            <Link
              href={item.href}
              className="app-navlink pb-1"
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
