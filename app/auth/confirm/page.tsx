import { redirect } from "next/navigation";
import { confirmLink } from "./actions";

export const metadata = {
  title: "Accès à ton compte — 40K Team Pairing Assistant",
  // Une page de jeton n'a rien à faire dans un moteur de recherche.
  robots: { index: false, follow: false },
};

/**
 * Atterrissage des liens d'accès (mot de passe oublié, lien envoyé en message privé).
 *
 * La page n'utilise pas le jeton : elle affiche un bouton, et c'est le clic qui le
 * consomme (voir ./actions.ts). Un robot d'aperçu peut ouvrir l'adresse autant qu'il veut,
 * le lien reste valable pour son destinataire.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; code?: string; suite?: string }>;
}) {
  const { token_hash: tokenHash, type, code, suite } = await searchParams;

  if (!(tokenHash && type) && !code) {
    redirect("/login?erreur=lien");
  }

  const isPassword = type === "recovery" || type === "invite" || suite === "/compte/mot-de-passe";

  return (
    <div className="container py-5" style={{ maxWidth: "26rem" }}>
      <h1 className="h4 mb-2">Accès à ton compte</h1>
      <p className="text-body-secondary small mb-4">
        {isPassword
          ? "Clique sur « Continuer » pour ouvrir ton compte et choisir ton mot de passe."
          : "Clique sur « Continuer » pour ouvrir ton compte."}{" "}
        Ce lien ne sert qu&apos;une fois.
      </p>
      <div className="card">
        <div className="card-body">
          <form action={confirmLink}>
            {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : null}
            {type ? <input type="hidden" name="type" value={type} /> : null}
            {code ? <input type="hidden" name="code" value={code} /> : null}
            {suite ? <input type="hidden" name="suite" value={suite} /> : null}
            <button type="submit" className="btn btn-primary w-100">
              Continuer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
