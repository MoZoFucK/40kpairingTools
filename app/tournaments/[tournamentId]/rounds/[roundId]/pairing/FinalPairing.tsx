import type { MatrixPlayer } from "@/lib/estimates/matrix";
import type { MatchOrigin } from "@/types/domain";
import { assignTable } from "./actions";

export interface FinalMatch {
  id: string;
  our_player_id: string;
  opponent_player_id: string;
  origin: MatchOrigin;
  table_number: number | null;
}

/**
 * Pairing final et affectation des tables — §30, §31.
 *
 * Les contrôles de validation sont affichés tels quels, réussite comme échec : le coach
 * doit pouvoir constater d'un coup d'œil que rien ne manque avant de rendre sa feuille.
 *
 * Aucune règle d'attribution des tables n'est appliquée : le classeur de l'équipe n'en
 * contenait aucune et le §64 interdit d'en inventer une. La saisie est libre.
 */
export function FinalPairing({
  tournamentId,
  roundId,
  matches,
  ourPlayers,
  opponentPlayers,
  teamSize,
  readOnly,
}: {
  tournamentId: string;
  roundId: string;
  matches: readonly FinalMatch[];
  ourPlayers: readonly MatrixPlayer[];
  opponentPlayers: readonly MatrixPlayer[];
  teamSize: number;
  readOnly: boolean;
}) {
  const byId = new Map<string, MatrixPlayer>(
    [...ourPlayers, ...opponentPlayers].map((player) => [player.id, player]),
  );

  const ourUsed = new Set(matches.map((match) => match.our_player_id));
  const opponentUsed = new Set(matches.map((match) => match.opponent_player_id));
  const tables = matches
    .map((match) => match.table_number)
    .filter((table): table is number => table !== null);

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
    {
      label: "Toutes les tables sont renseignées et distinctes",
      passed: tables.length === matches.length && new Set(tables).size === tables.length,
    },
  ];

  const ordered = [...matches].sort((a, b) => {
    if (a.table_number !== null && b.table_number !== null) {
      return a.table_number - b.table_number;
    }
    if (a.table_number !== null) return -1;
    if (b.table_number !== null) return 1;
    return 0;
  });

  return (
    <>
      <h2 className="h6 mb-3">Pairing final</h2>

      <ul className="list-group mb-3">
        {ordered.map((match) => (
          <li
            key={match.id}
            className="list-group-item d-flex justify-content-between align-items-center gap-3 flex-wrap"
          >
            <span>
              <span className="fw-semibold">{byId.get(match.our_player_id)?.name}</span>{" "}
              <span className="text-body-secondary">
                ({byId.get(match.our_player_id)?.army})
              </span>
              {" contre "}
              <span className="fw-semibold">
                {byId.get(match.opponent_player_id)?.name}
              </span>{" "}
              <span className="text-body-secondary">
                ({byId.get(match.opponent_player_id)?.army})
              </span>
            </span>

            <form action={assignTable} className="d-flex align-items-center gap-2">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input type="hidden" name="roundId" value={roundId} />
              <input type="hidden" name="matchId" value={match.id} />

              <label htmlFor={`table-${match.id}`} className="form-label mb-0 small">
                Table
              </label>
              <input
                id={`table-${match.id}`}
                name="tableNumber"
                type="number"
                min={1}
                className="form-control form-control-sm"
                style={{ width: "5rem" }}
                defaultValue={match.table_number ?? ""}
                disabled={readOnly}
              />
              <button
                type="submit"
                className="btn btn-outline-secondary btn-sm"
                disabled={readOnly}
              >
                OK
              </button>
            </form>
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
