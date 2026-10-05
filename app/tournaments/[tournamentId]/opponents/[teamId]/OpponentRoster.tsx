"use client";

import { useState } from "react";
import { ArmyCard } from "@/components/opponents/ArmyCard";
import { deleteOpponentPlayer } from "../actions";
import { OpponentPlayerForm, type EditableOpponent } from "./OpponentPlayerForm";

export function OpponentRoster({
  tournamentId,
  teamId,
  players,
  knownArmies,
  knownDetachments,
  rules,
}: {
  tournamentId: string;
  teamId: string;
  players: readonly EditableOpponent[];
  knownArmies: readonly string[];
  knownDetachments: readonly string[];
  rules: Readonly<Record<string, { armyRule?: string; detachmentRule?: string }>>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (players.length === 0) {
    return (
      <p className="text-body-secondary mb-0">
        Aucun joueur saisi pour cette équipe.
      </p>
    );
  }

  return (
    <div className="row g-3">
      {players.map((player) => (
        <div key={player.id} className="col-12 col-lg-6">
          {editingId === player.id ? (
            <div className="card">
              <div className="card-body">
                <OpponentPlayerForm
                  tournamentId={tournamentId}
                  teamId={teamId}
                  player={player}
                  knownArmies={knownArmies}
                  knownDetachments={knownDetachments}
                  onDone={() => setEditingId(null)}
                />
              </div>
            </div>
          ) : (
            <ArmyCard
              player={{
                name: player.name,
                army: player.army,
                detachment: player.detachment,
                listName: player.listName,
                listContent: player.listContent,
                notes: player.notes,
                disposition: player.disposition,
                armyRule: rules[player.id]?.armyRule ?? null,
                detachmentRule: rules[player.id]?.detachmentRule ?? null,
              }}
              footer={
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setEditingId(player.id)}
                  >
                    Modifier
                  </button>

                  <form action={deleteOpponentPlayer}>
                    <input type="hidden" name="tournamentId" value={tournamentId} />
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="playerId" value={player.id} />
                    <button type="submit" className="btn btn-outline-danger btn-sm">
                      Supprimer
                    </button>
                  </form>
                </div>
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}
