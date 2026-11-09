import { requireUser } from "@/lib/auth/session";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Mot de passe — 40K Team Pairing Assistant" };

/**
 * Choix du mot de passe.
 *
 * Les comptes sont créés par l'administrateur avec un mot de passe que personne ne
 * connaît : chacun passe par « Mot de passe oublié », dont le lien aboutit ici.
 */
export default async function PasswordPage() {
  const user = await requireUser();

  return (
    <div className="container py-5" style={{ maxWidth: "26rem" }}>
      <h1 className="h4 mb-2">Mot de passe</h1>
      <p className="text-body-secondary small mb-4">
        Choisis le mot de passe de ton compte{user.email ? ` ${user.email}` : ""}.
      </p>
      <div className="card">
        <div className="card-body">
          <PasswordForm email={user.email} />
        </div>
      </div>
    </div>
  );
}
