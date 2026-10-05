import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Ancienne adresse de la saisie, rangée par ronde.
 *
 * La saisie se fait désormais par équipe adverse : le joueur estime avant le tirage des
 * rondes. Les liens déjà partagés ou mis en favori mènent à la bonne équipe.
 */
export default async function LegacyRoundEstimatesPage({
  params,
}: {
  params: Promise<{ tournamentId: string; roundId: string }>;
}) {
  const { tournamentId, roundId } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: round } = await supabase
    .from("rounds")
    .select("opponent_team_id, tournament_id")
    .eq("id", roundId)
    .maybeSingle();

  if (!round || round.tournament_id !== tournamentId) {
    notFound();
  }

  redirect(`/tournaments/${tournamentId}/estimates/${round.opponent_team_id}`);
}
