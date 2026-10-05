"use client";

import { useMemo, useState, useTransition } from "react";
import {
  buildMatrix,
  getCell,
  type MatrixPlayer,
  type RawEstimate,
} from "@/lib/estimates/matrix";
import { estimateLevel } from "@/lib/estimates/scale";
import { EstimateComments } from "@/components/estimates/EstimateComments";
import { replayActions } from "@/lib/pairing/engine";
import { missionFor as lookupMission } from "@/lib/lists/missions";
import { describeStoredAction } from "@/lib/pairing/journal";
import { toEngineAction, type StoredPairingAction } from "@/lib/pairing/persistence";
import { getAvailablePlayers } from "@/lib/pairing/selectors";
import type { PairingProtocol, Side } from "@/lib/pairing/types";
import type { EstimateValue } from "@/types/domain";
import {
  proposeAttackers,
  retainAttacker,
  selectDefender,
  undoLastAction,
  type PairingResponse,
} from "@/app/tournaments/[tournamentId]/rounds/[roundId]/pairing/actions";
import { PairingStep } from "./PairingStep";

/**
 * Écran Pairing Live — §22.
 *
 * C'est l'écran prioritaire du produit : tout s'y passe, le coach ne navigue jamais
 * ailleurs pendant un pairing (§34).
 *
 * L'état est recalculé ici par le même moteur que côté serveur, à partir du même journal
 * d'actions. Les deux ne peuvent donc pas diverger — et le serveur reste seul juge, puisque
 * c'est lui qui accepte ou refuse l'écriture.
 */

export interface StoredAction extends StoredPairingAction {
  id: string;
  sequence: number;
  created_at: string;
}

export function PairingBoard({
  tournamentId,
  roundId,
  protocol,
  ourPlayers,
  opponentPlayers,
  estimates,
  actions,
  readOnly,
}: {
  tournamentId: string;
  roundId: string;
  protocol: PairingProtocol;
  ourPlayers: readonly MatrixPlayer[];
  opponentPlayers: readonly MatrixPlayer[];
  estimates: readonly RawEstimate[];
  actions: readonly StoredAction[];
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const players = useMemo(() => {
    const map = new Map<string, MatrixPlayer>();
    for (const player of [...ourPlayers, ...opponentPlayers]) {
      map.set(player.id, player);
    }
    return map;
  }, [ourPlayers, opponentPlayers]);

  const matrix = useMemo(
    () => buildMatrix(ourPlayers, opponentPlayers, estimates),
    [ourPlayers, opponentPlayers, estimates],
  );

  const replayed = useMemo(
    () =>
      replayActions(
        protocol,
        ourPlayers.map((player) => player.id),
        opponentPlayers.map((player) => player.id),
        actions.map(toEngineAction),
      ),
    [protocol, ourPlayers, opponentPlayers, actions],
  );

  if (!replayed.ok) {
    return (
      <div className="alert alert-danger" role="alert">
        Le pairing enregistré n&apos;est pas cohérent avec les effectifs actuels :{" "}
        {replayed.error.message}
      </div>
    );
  }

  const state = replayed.state;
  const availableOur = new Set(getAvailablePlayers(state, "US"));
  const availableOpponent = new Set(getAvailablePlayers(state, "THEM"));

  /**
   * Estimé du match qu'un attaquant produirait face au défenseur du camp indiqué.
   *
   * La matrice est indexée (notre joueur × adversaire) : selon le camp qui défend, c'est
   * l'attaquant ou le défenseur qui occupe la première position.
   */
  function estimateFor(attackerId: string, defendingSide: Side): EstimateValue | null {
    const defenderId = state.step.defenders[defendingSide];
    if (!defenderId) {
      return null;
    }

    const cell =
      defendingSide === "THEM"
        ? getCell(matrix, attackerId, defenderId)
        : getCell(matrix, defenderId, attackerId);

    return cell?.value ?? null;
  }

  /**
   * Mission primaire de notre joueur pour l'affrontement envisagé.
   *
   * Comme pour l'estimé, c'est le camp qui défend qui détermine lequel des deux joueurs
   * est le nôtre.
   */
  function missionFor(attackerId: string, defendingSide: Side): string | null {
    const defenderId = state.step.defenders[defendingSide];
    if (!defenderId) {
      return null;
    }

    const [ourId, theirId] =
      defendingSide === "THEM" ? [attackerId, defenderId] : [defenderId, attackerId];

    return (
      lookupMission(players.get(ourId)?.disposition, players.get(theirId)?.disposition)
        ?.name ?? null
    );
  }

  function run(operation: () => Promise<PairingResponse>) {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        setError(result.message ?? "L'action a été refusée.");
      }
    });
  }

  const busy = pending || readOnly;

  return (
    <div className="d-flex flex-column gap-4">
      {readOnly ? (
        <div className="alert alert-secondary mb-0" role="status">
          Cette ronde est verrouillée : le pairing est en lecture seule.
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      ) : null}

      <section>
        <h2 className="h6 mb-2">Matrice</h2>
        <div className="table-responsive">
          <table className="table table-bordered table-sm align-middle mb-0">
            <thead>
              <tr>
                <th scope="col" style={{ minWidth: "10rem" }}></th>
                {opponentPlayers.map((opponent) => (
                  <th
                    key={opponent.id}
                    scope="col"
                    className={`text-center small ${
                      availableOpponent.has(opponent.id) ? "" : "is-paired"
                    }`}
                  >
                    <div className="fw-semibold">{opponent.name}</div>
                    <div className="fw-normal text-body-secondary">{opponent.army}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ourPlayers.map((ourPlayer) => {
                const ourAvailable = availableOur.has(ourPlayer.id);

                return (
                  <tr key={ourPlayer.id} className={ourAvailable ? "" : "is-paired"}>
                    <th scope="row" className="small">
                      <div className="fw-semibold">{ourPlayer.name}</div>
                      <div className="fw-normal text-body-secondary">{ourPlayer.army}</div>
                    </th>

                    {opponentPlayers.map((opponent) => {
                      const cell = getCell(matrix, ourPlayer.id, opponent.id);
                      const value = cell?.value ?? null;
                      const stillOpen = ourAvailable && availableOpponent.has(opponent.id);

                      return (
                        <td
                          key={opponent.id}
                          className={`text-center fw-semibold ${
                            value !== null && stillOpen ? estimateLevel(value).className : ""
                          } ${stillOpen ? "" : "is-paired"}`}
                          title={cell?.comment ? `« ${cell.comment} »` : undefined}
                        >
                          {value ?? "—"}
                          {cell?.comment ? (
                            <sup className="ms-1" aria-label="avec commentaire">
                              ✎
                            </sup>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <EstimateComments
          matrix={matrix}
          availableIds={new Set([...availableOur, ...availableOpponent])}
        />
      </section>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h6 mb-0">
            Étape {Math.min(state.stepIndex + 1, Math.max(1, state.stepIndex))} —{" "}
            {state.phase === "DEFENDERS"
              ? "défenseurs"
              : state.phase === "ATTACKERS"
                ? "attaquants"
                : state.phase === "RETENTIONS"
                  ? "refus"
                  : "terminé"}
          </h2>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            disabled={busy || actions.length === 0}
            onClick={() => run(() => undoLastAction(tournamentId, roundId))}
          >
            ← Annuler la dernière action
          </button>
        </div>

        <PairingStep
          state={state}
          players={players}
          busy={busy}
          estimateFor={estimateFor}
          missionFor={missionFor}
          onSelectDefender={(side: Side, playerId: string) =>
            run(() => selectDefender(tournamentId, roundId, side, playerId))
          }
          onProposeAttackers={(against: Side, playerIds: string[]) =>
            run(() => proposeAttackers(tournamentId, roundId, against, playerIds))
          }
          onRetainAttacker={(against: Side, playerId: string) =>
            run(() => retainAttacker(tournamentId, roundId, against, playerId))
          }
        />
      </section>

      <section>
        <h2 className="h6 mb-2">Matchs formés</h2>
        {state.matches.length === 0 ? (
          <p className="text-body-secondary mb-0">Aucun match pour l&apos;instant.</p>
        ) : (
          <ul className="list-group">
            {state.matches.map((match) => {
              const ours = players.get(match.ourPlayerId);
              const theirs = players.get(match.opponentPlayerId);
              const value = getCell(matrix, match.ourPlayerId, match.opponentPlayerId)?.value;

              return (
                <li
                  key={`${match.ourPlayerId}-${match.opponentPlayerId}`}
                  className="list-group-item d-flex justify-content-between align-items-center gap-3"
                >
                  <span>
                    <span className="fw-semibold">{ours?.name}</span>{" "}
                    <span className="text-body-secondary">({ours?.army})</span>
                    {" ↔ "}
                    <span className="fw-semibold">{theirs?.name}</span>{" "}
                    <span className="text-body-secondary">({theirs?.army})</span>
                  </span>

                  <span className="d-flex align-items-center gap-2 flex-wrap">
                    {lookupMission(ours?.disposition, theirs?.disposition) ? (
                      <span className="badge text-bg-info">
                        {lookupMission(ours?.disposition, theirs?.disposition)!.name}
                      </span>
                    ) : null}
                    {match.origin !== "SELECTED" ? (
                      <span className="badge text-bg-light">
                        {match.origin === "REJECTED_PAIR" ? "Rejetés" : "Oubliés"}
                      </span>
                    ) : null}
                    {value !== null && value !== undefined ? (
                      <span className={`badge ${estimateLevel(value).className}`}>
                        {value}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="h6 mb-2">Historique</h2>
        {actions.length === 0 ? (
          <p className="text-body-secondary mb-0">Le pairing n&apos;a pas commencé.</p>
        ) : (
          <ol className="list-group list-group-numbered">
            {actions.map((action) => (
              <li key={action.id} className="list-group-item small">
                <span className="text-body-secondary me-2">
                  {new Date(action.created_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {describeStoredAction(action, players)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

