import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MyListForm } from "./MyListForm";

export const metadata = { title: "Ma liste — 40K Team Pairing Assistant" };

/**
 * Saisie par le joueur de sa propre liste.
 *
 * C'est lui qui la connaît : cela évite au coach de retaper six listes, et la disposition
 * n'est de toute façon connue que du joueur qui a construit sa liste.
 */
export default async function MyListPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournament) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ourTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("kind", "OUR_TEAM")
    .maybeSingle();

  const { data: me } = ourTeam
    ? await supabase
        .from("players")
        .select("id, name, army, detachment, list_name, list_content, disposition")
        .eq("team_id", ourTeam.id)
        .eq("user_id", user?.id ?? "")
        .maybeSingle()
    : { data: null };

  return (
    <div className="container py-4" style={{ maxWidth: "44rem" }}>
      <nav aria-label="fil d'Ariane" className="mb-3">
        <Link href="/dashboard" className="small">
          ← Tableau de bord
        </Link>
      </nav>

      <h1 className="h5 mb-1">Ma liste</h1>
      <p className="text-body-secondary small">{tournament.name}</p>

      {me ? (
        <>
          <p className="text-body-secondary">
            Fiche : <span className="fw-semibold">{me.name}</span>
          </p>
          <MyListForm
            tournamentId={tournamentId}
            list={{
              name: me.name,
              army: me.army,
              detachment: me.detachment,
              listName: me.list_name,
              listContent: me.list_content,
              disposition: me.disposition,
            }}
          />
        </>
      ) : (
        <div className="alert alert-info">
          Ton compte n&apos;est rattaché à aucune fiche joueur de cette équipe. Ton coach
          doit faire le rattachement depuis l&apos;écran de son équipe.
        </div>
      )}
    </div>
  );
}
