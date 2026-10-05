import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { helpFor, type HelpPage } from "@/lib/help/pages";

/**
 * Aide contextuelle d'une page : à quoi elle sert, ce qu'on attend de toi, la suite.
 *
 * Repliée par défaut — elle ne doit pas encombrer celui qui connaît déjà l'écran. Un
 * `<details>` natif plutôt qu'un composant Bootstrap : aucun script, elle s'ouvre même
 * si le JavaScript n'a pas fini de charger, comme la barre de navigation.
 *
 * Le contenu dépend du rôle, lu côté serveur : le coach et le joueur ne font pas la même
 * chose sur la page d'une ronde.
 */
export async function PageHelp({ page }: { page: HelpPage }) {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const help = helpFor(page, user.role);

  return (
    <details className="page-help mb-3">
      <summary className="page-help-toggle">
        <span aria-hidden="true">?</span> Aide
      </summary>

      <div className="page-help-body">
        <p className="mb-2">{help.purpose}</p>

        {help.expected.length > 0 ? (
          <>
            <p className="page-help-label mb-1">
              Côté {ROLE_LABEL[user.role === "ADMIN" ? "COACH" : user.role].toLowerCase()}
            </p>
            <ul className="mb-2 ps-3">
              {help.expected.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}

        {help.next ? (
          <p className="mb-2">
            <span className="fw-semibold">Ensuite :</span> {help.next}
          </p>
        ) : null}

        <Link href="/guide" className="small">
          Le déroulé complet d&apos;un tournoi →
        </Link>
      </div>
    </details>
  );
}
