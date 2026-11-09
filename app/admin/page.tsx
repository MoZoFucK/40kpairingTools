import { isSuperAdminConfigured, requireSuperAdmin } from "@/lib/auth/superAdmin";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { impersonate } from "./actions";

export const metadata = { title: "Admin — 40K Team Pairing Assistant" };

const ERRORS: Record<string, string> = {
  compte: "Ce compte est introuvable.",
  connexion: "La connexion sous ce compte a échoué.",
};

/**
 * Vue super admin : tous les comptes, leurs fiches, et la connexion sous un autre compte.
 *
 * La clé secrète est employée ici en connaissance de cause : la page n'est servie qu'au
 * super admin (garde en tête), et elle doit voir ce que la RLS cache à tout le monde.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const me = await requireSuperAdmin();
  const { erreur } = await searchParams;

  if (!isSuperAdminConfigured()) {
    return (
      <div className="container py-4">
        <h1 className="h4 mb-3">Admin</h1>
        <div className="alert alert-warning" role="alert">
          La variable d&apos;environnement <code>SUPABASE_SECRET_KEY</code> n&apos;est pas définie
          sur ce déploiement. Ajoute-la dans Vercel (Settings &gt; Environment Variables), puis
          redéploie.
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  const [usersResult, profilesResult, playersResult, teamsResult, tournamentsResult] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("profiles").select("user_id, role, display_name, email"),
      admin.from("players").select("user_id, name, team_id").not("user_id", "is", null),
      admin.from("teams").select("id, name, tournament_id"),
      admin.from("tournaments").select("id, name"),
    ]);

  const tournamentName = new Map((tournamentsResult.data ?? []).map((t) => [t.id, t.name]));
  const teamLabel = new Map(
    (teamsResult.data ?? []).map((t) => [
      t.id,
      `${t.name} · ${tournamentName.get(t.tournament_id) ?? "?"}`,
    ]),
  );
  const profileById = new Map((profilesResult.data ?? []).map((p) => [p.user_id, p]));
  const players = playersResult.data ?? [];

  const accounts = (usersResult.data?.users ?? [])
    .map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? "—",
        name: profile?.display_name ?? null,
        role: profile?.role ?? null,
        lastSignIn: user.last_sign_in_at ?? null,
        sheets: players
          .filter((player) => player.user_id === user.id)
          .map((player) => `${player.name} (${teamLabel.get(player.team_id) ?? "?"})`),
      };
    })
    .sort((a, b) => (a.role ?? "").localeCompare(b.role ?? "") || a.email.localeCompare(b.email));

  return (
    <div className="container py-4">
      <h1 className="h4 mb-1">Admin</h1>
      <p className="text-body-secondary small mb-4">
        Réservé à {me.email}. « Se connecter en tant que » ouvre une session au nom du compte dans
        ce navigateur, sans e-mail ni mot de passe. Un bandeau permet ensuite de revenir à ton
        compte.
      </p>

      {erreur && ERRORS[erreur] ? (
        <div className="alert alert-danger py-2" role="alert">
          {ERRORS[erreur]}
        </div>
      ) : null}

      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Compte</th>
              <th>Rôle</th>
              <th>Fiches rattachées</th>
              <th>Dernière connexion</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>
                  <div>{account.email}</div>
                  {account.name ? (
                    <div className="small text-body-secondary">{account.name}</div>
                  ) : null}
                </td>
                <td>{account.role ? ROLE_LABEL[account.role] : "Sans profil"}</td>
                <td className="small">
                  {account.sheets.length > 0 ? (
                    account.sheets.map((sheet) => <div key={sheet}>{sheet}</div>)
                  ) : (
                    <span className="text-body-secondary">Aucune</span>
                  )}
                </td>
                <td className="small text-body-secondary">
                  {account.lastSignIn
                    ? new Date(account.lastSignIn).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Paris",
                      })
                    : "Jamais"}
                </td>
                <td className="text-end">
                  {account.id === me.id ? (
                    <span className="small text-body-secondary">C&apos;est toi</span>
                  ) : (
                    <form action={impersonate}>
                      <input type="hidden" name="userId" value={account.id} />
                      <button type="submit" className="btn btn-outline-warning btn-sm">
                        Se connecter en tant que
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
