import type { MatrixPlayer } from "@/lib/estimates/matrix";
import type { MatchOrigin } from "@/types/domain";

export interface FinalMatch {
  id: string;
  our_player_id: string;
  opponent_player_id: string;
  origin: MatchOrigin;
}

/**
 * Pairing final — §30, §31.
 *
 * Les contrôles de validation sont affichés tels quels, réussite comme échec : le coach
 * doit pouvoir constater d'un coup d'œil que rien ne manque avant de rendre sa feuille.
 *
 * Pas d'affectation des tables : en V11, table et déploiement ne se choisissent plus à
 * l'issue du pairing (voir docs/protocole-pairing.md).
 */
export function FinalPairing({
  matches,
  ourPlayers,
  opponentPlayers,
  teamSize,
}: {
  matches: readonly FinalMatch[];
  ourPlayers: readonly MatrixPlayer[];
  opponentPlayers: readonly MatrixPlayer[];
  teamSize: number;
}) {
  const byId = new Map<string, MatrixPlayer>(
    [...ourPlayers, ...opponentPlayers].map((player) => [player.id, player]),
  );

  const ourUsed = new Set(matches.map((match) => match.our_player_id));
  const opponentUsed = new Set(matches.map((match) => match.opponent_player_id));

  const checks: readonly { label: string; passed: boolean }[] = [
    {
      label: `Tous les joueurs sont appariés (${matches.length}/${teamSize})`,
      passed: matches.length === teamSize,
    },
    {
      label: "Aucun joueur n'est utilisé deux fois",
      passed: ourUsed.size === matches.length && opponentUsed.size === matches.length,
    },
    {
      label: "Toutes les listes adverses sont appariées",
      passed: opponentUsed.size === opponentPlayers.length,
    },
  ];

  return (
    <>
      <h2 className="h6 mb-3">Pairing final</h2>

      <ul className="list-group mb-3">
        {matches.map((match) => (
          <li key={match.id} className="list-group-item">
            <span className="fw-semibold">{byId.get(match.our_player_id)?.name}</span>{" "}
            <span className="text-body-secondary">
              ({byId.get(match.our_player_id)?.army})
            </span>
            {" contre "}
            <span className="fw-semibold">{byId.get(match.opponent_player_id)?.name}</span>{" "}
            <span className="text-body-secondary">
              ({byId.get(match.opponent_player_id)?.army})
            </span>
          </li>
        ))}
      </ul>

      <ul className="list-unstyled mb-0 small">
        {checks.map((check) => (
          <li key={check.label} className={check.passed ? "text-success" : "text-warning-emphasis"}>
            {check.passed ? "✓" : "○"} {check.label}
          </li>
        ))}
      </ul>
    </>
  );
}
