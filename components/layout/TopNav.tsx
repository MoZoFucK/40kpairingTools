import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { signOut } from "@/app/login/actions";
import { stopImpersonation } from "@/app/admin/actions";
import { isSuperAdminEmail, readImpersonator } from "@/lib/auth/superAdmin";
import { NavLinks, type NavItem } from "./NavLinks";
import { SignInLink } from "./SignInLink";

/** Initiales de repli quand aucun nom d'affichage n'est renseigné. */
function initials(label: string): string {
  const parts = label.split(/[\s.@_-]+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * Barre de navigation supérieure, présente sur toutes les pages.
 *
 * Volontairement sans JavaScript Bootstrap : pas de menu déroulant, pas de collapse.
 * Les liens restent visibles et passent à la ligne sur petit écran. Un pairing se joue
 * souvent sur un téléphone posé au bord de la table, parfois sur un réseau de salle
 * capricieux — une barre qui ne dépend d'aucun script ne peut pas rester fermée.
 *
 * Trois onglets suffisent : au-delà, il faut un tournoi pour donner un sens à la
 * destination. C'est le rôle du fil d'Ariane, pas de la barre.
 */
export async function TopNav() {
  const user = await getCurrentUser();
  const impersonating = user ? (await readImpersonator()) !== null : false;

  const items: NavItem[] = [
    ...(user
      ? [
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Tournois", href: "/tournaments", matchChildren: true },
        ]
      : []),
    // Pour tout le monde, connecté ou non : c'est la première chose à lire.
    { label: "Guide", href: "/guide" },
    ...(isSuperAdminEmail(user?.email) ? [{ label: "Admin", href: "/admin" }] : []),
  ];

  const name = user?.displayName ?? user?.email ?? "";

  return (
    <>
      {impersonating ? (
        <div className="alert alert-warning rounded-0 mb-0 py-2 d-flex flex-wrap align-items-center justify-content-center gap-3">
          <span className="small">
            Tu navigues en tant que <strong>{user?.email}</strong>. Tout ce que tu fais est
            enregistré à son nom.
          </span>
          <form action={stopImpersonation}>
            <button type="submit" className="btn btn-warning btn-sm">
              Revenir à mon compte
            </button>
          </form>
        </div>
      ) : null}
      <header className="app-navbar sticky-top">
        <div className="container-fluid d-flex flex-wrap align-items-center gap-3 py-2">
          <Link
            href={user ? "/dashboard" : "/"}
            className="app-brand text-decoration-none d-flex align-items-center gap-2"
          >
            <span className="app-brand-mark" aria-hidden="true">
              ✠
            </span>
            <span>40K Pairing</span>
          </Link>

          {items.length > 0 ? (
            <nav aria-label="navigation principale">
              <NavLinks items={items} />
            </nav>
          ) : null}

          <div className="ms-auto d-flex align-items-center gap-2">
            {user ? (
              <>
                <span className="app-user-chip d-flex align-items-center gap-2 ps-1 pe-3 py-1">
                  <span className="app-avatar" aria-hidden="true">
                    {initials(name)}
                  </span>
                  <span className="d-flex flex-column lh-1">
                    <span className="small fw-semibold text-body-emphasis">{name}</span>
                    <span className="text-body-secondary" style={{ fontSize: "0.7rem" }}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </span>
                </span>

                <Link href="/compte/mot-de-passe" className="btn btn-outline-secondary btn-sm">
                  Mot de passe
                </Link>

                <form action={signOut}>
                  <button type="submit" className="btn btn-outline-secondary btn-sm">
                    Se déconnecter
                  </button>
                </form>
              </>
            ) : (
              <SignInLink />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
