"use client";

import { useState } from "react";
import type { MatrixPlayer } from "@/lib/estimates/matrix";
import { estimateLevel } from "@/lib/estimates/scale";
import { listSummary } from "@/lib/lists/summary";
import type { PairingState, Side } from "@/lib/pairing/types";
import { getPossibleSelections } from "@/lib/pairing/selectors";
import type { EstimateValue } from "@/types/domain";

/**
 * Étape de pairing en cours — §22, §24, §25, §26.
 *
 * L'interface n'offre que ce que le protocole rend possible, sans jamais ordonner ni mettre
 * en avant un choix (§58). Les joueurs sont présentés dans l'ordre du roster, le même d'un
 * bout à l'autre du pairing.
 */

/**
 * Un joueur sélectionnable, avec l'estimé du match qu'il produirait.
 *
 * L'estimé est une donnée saisie par un joueur, pas une recommandation (§27) : il est
 * restitué tel quel, sans commentaire. Le chiffre est toujours écrit, la couleur ne fait
 * que l'accompagner (§44).
 */
function PlayerButton({
  player,
  estimate,
  mission,
  selected,
  disabled,
  onClick,
}: {
  player: MatrixPlayer;
  /**
   * `null` : le joueur n'a rien saisi. `undefined` : l'estimé n'a pas d'objet ici —
   * au choix du défenseur, aucun adversaire n'est encore désigné, donc aucun match
   * n'existe dont on pourrait lire l'estimé. Afficher « — » y ferait croire à une
   * saisie manquante.
   */
  estimate?: EstimateValue | null;
  /** Nom seul : pendant le pairing l'écran est dense, le détail n'a pas sa place. */
  mission?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-sm text-start d-flex justify-content-between align-items-center gap-2 ${
        selected ? "btn-primary" : "btn-outline-secondary"
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="fw-semibold d-block">{player.name}</span>
        <span className="small d-block">{listSummary(player)}</span>
        {mission ? (
          <span className="badge text-bg-info mt-1">{mission}</span>
        ) : null}
      </span>

      {estimate === undefined ? null : estimate === null ? (
        <span className="badge text-bg-secondary flex-shrink-0" title="Aucun estimé saisi">
          —
        </span>
      ) : (
        <span
          className={`badge flex-shrink-0 ${estimateLevel(estimate).className}`}
          title={`Estimé : ${estimate} — ${estimateLevel(estimate).label}`}
        >
          {estimate}
        </span>
      )}
    </button>
  );
}

/**
 * Liste du défenseur, à droite de son nom dans l'en-tête : le coach choisit ses
 * attaquants en ayant sous les yeux ce qu'ils affronteront.
 */
function DefenderList({ player }: { player: MatrixPlayer | undefined }) {
  const summary = player ? listSummary(player) : "";
  return summary ? (
    <span className="fw-normal text-body-secondary small"> — {summary}</span>
  ) : null;
}

export function PairingStep({
  state,
  players,
  busy,
  estimateFor,
  missionFor,
  onSelectDefender,
  onProposeAttackers,
  onRetainAttacker,
}: {
  state: PairingState;
  players: ReadonlyMap<string, MatrixPlayer>;
  busy: boolean;
  /** Estimé du match qu'un attaquant produirait face au défenseur du camp indiqué. */
  estimateFor: (attackerId: string, defendingSide: Side) => EstimateValue | null;
  /** Mission primaire de notre joueur pour ce même affrontement. */
  missionFor: (attackerId: string, defendingSide: Side) => string | null;
  onSelectDefender: (side: Side, playerId: string) => void;
  onProposeAttackers: (against: Side, playerIds: string[]) => void;
  onRetainAttacker: (against: Side, playerId: string) => void;
}) {
  const [draft, setDraft] = useState<Readonly<Record<string, string[]>>>({});
  const possible = getPossibleSelections(state);

  function resolve(ids: readonly string[]): MatrixPlayer[] {
    return ids
      .map((id) => players.get(id))
      .filter((player): player is MatrixPlayer => player !== undefined);
  }

  function toggleDraft(against: Side, playerId: string, max: number) {
    setDraft((current) => {
      const selection = current[against] ?? [];
      if (selection.includes(playerId)) {
        return { ...current, [against]: selection.filter((id) => id !== playerId) };
      }
      if (selection.length >= max) {
        return current;
      }
      return { ...current, [against]: [...selection, playerId] };
    });
  }

  if (state.phase === "COMPLETE") {
    return (
      <div className="alert alert-success mb-0" role="status">
        Tous les joueurs sont appariés.
      </div>
    );
  }

  const sides: readonly { side: Side; title: string }[] = [
    { side: "US", title: "Notre défenseur" },
    { side: "THEM", title: "Leur défenseur" },
  ];

  return (
    <div className="row g-3">
      {state.phase === "DEFENDERS"
        ? sides.map(({ side, title }) => {
            const chosen = state.step.defenders[side];
            const options = possible.defender[side] ?? [];

            return (
              <div key={side} className="col-12 col-lg-6">
                <h3 className="h6">{title}</h3>
                {chosen ? (
                  <p className="mb-0">
                    ✓ {players.get(chosen)?.name} —{" "}
                    <span className="text-body-secondary">
                      {listSummary(players.get(chosen)!)}
                    </span>
                  </p>
                ) : (
                  <div className="d-grid gap-2">
                    {resolve(options).map((player) => (
                      <PlayerButton
                        key={player.id}
                        player={player}
                        disabled={busy}
                        onClick={() => onSelectDefender(side, player.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        : null}

      {state.phase === "ATTACKERS"
        ? (["THEM", "US"] as const).map((against) => {
            const defender = state.step.defenders[against];
            const already = state.step.attackersAgainst[against];
            const options = possible.attackers[against] ?? [];
            const selection = draft[against] ?? [];
            const needed = state.protocol.attackersPerProposal;

            return (
              <div key={against} className="col-12 col-lg-6">
                <h3 className="h6">
                  {against === "THEM" ? "Nos attaquants" : "Leurs attaquants"} face à{" "}
                  {defender ? players.get(defender)?.name : "?"}
                  <DefenderList player={defender ? players.get(defender) : undefined} />
                </h3>

                {already ? (
                  <p className="mb-0">
                    ✓ {resolve(already).map((player) => player.name).join(" et ")}
                  </p>
                ) : (
                  <>
                    <div className="d-grid gap-2 mb-2">
                      {resolve(options).map((player) => (
                        <PlayerButton
                          key={player.id}
                          player={player}
                          estimate={estimateFor(player.id, against)}
                          mission={missionFor(player.id, against)}
                          selected={selection.includes(player.id)}
                          disabled={busy}
                          onClick={() => toggleDraft(against, player.id, needed)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy || selection.length !== needed}
                      onClick={() => {
                        onProposeAttackers(against, selection);
                        setDraft((current) => ({ ...current, [against]: [] }));
                      }}
                    >
                      Proposer ({selection.length}/{needed})
                    </button>
                  </>
                )}
              </div>
            );
          })
        : null}

      {state.phase === "RETENTIONS"
        ? (["THEM", "US"] as const).map((against) => {
            const defender = state.step.defenders[against];
            const retained = state.step.retainedAgainst[against];
            const options = possible.retention[against] ?? [];

            return (
              <div key={against} className="col-12 col-lg-6">
                <h3 className="h6">
                  {/*
                   * Quand l'adversaire défend, la décision lui appartient : le coach la
                   * saisit, il ne la prend pas. Le libellé doit le refléter.
                   */}
                  {against === "THEM"
                    ? `Lequel ${players.get(defender ?? "")?.name ?? "l'adversaire"} retient-il ?`
                    : `Qui affronte ${players.get(defender ?? "")?.name ?? "notre défenseur"} ?`}
                  <DefenderList player={defender ? players.get(defender) : undefined} />
                </h3>

                {retained ? (
                  <p className="mb-0">✓ {players.get(retained)?.name}</p>
                ) : (
                  <div className="d-grid gap-2">
                    {resolve(options).map((player) => (
                      <PlayerButton
                        key={player.id}
                        player={player}
                        estimate={estimateFor(player.id, against)}
                        mission={missionFor(player.id, against)}
                        disabled={busy}
                        onClick={() => onRetainAttacker(against, player.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        : null}
    </div>
  );
}
