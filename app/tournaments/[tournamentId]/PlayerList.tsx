"use client";

import { useState } from "react";
import { deletePlayer } from "../actions";
import { AccountLink, type AccountOption } from "./AccountLink";
import { PlayerForm, type EditablePlayer } from "./PlayerForm";

export function PlayerList({
  tournamentId,
  teamId,
  players,
  accounts,
}: {
  tournamentId: string;
  teamId: string;
  players: readonly (EditablePlayer & {
    userId: string | null;
    disposition: string | null;
    /** Champs de liste manquants, en toutes lettres ; `null` si la liste est saisie. */
    missingLabel: string | null;
  })[];
  accounts: readonly AccountOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (players.length === 0) {
    return (
      <p className="text-body-secondary mb-0">
        Aucun joueur pour l&apos;instant. Ajoute-les ci-dessous.
      </p>
    );
  }

  return (
    <ul className="list-group list-group-flush">
      {players.map((player) => (
        <li key={player.id} className="list-group-item px-0">
          {editingId === player.id ? (
            <>
              <PlayerForm
                tournamentId={tournamentId}
                teamId={teamId}
                player={player}
                onDone={() => setEditingId(null)}
              />
              <button
                type="button"
                className="btn btn-link btn-sm px-0 mt-2"
                onClick={() => setEditingId(null)}
              >
                Annuler
              </button>
            </>
          ) : (
            <div className="d-flex justify-content-between align-items-center gap-3">
              <div className="min-w-0">
                <div className="fw-semibold">{player.name}</div>
                <div className="text-body-secondary small">
                  {player.army}
                  {player.detachment ? ` — ${player.detachment}` : ""}
                  {player.listName ? ` — ${player.listName}` : ""}
                  {player.disposition ? ` — ${player.disposition}` : ""}
                </div>
                {player.missingLabel ? (
                  <span
                    className="badge text-bg-warning"
                    title={`Manque : ${player.missingLabel}`}
                  >
                    Liste à compléter : {player.missingLabel}
                  </span>
                ) : null}
              </div>

              <div className="d-flex gap-2 flex-shrink-0 align-items-start">
                <div style={{ minWidth: "12rem" }}>
                  <AccountLink
                    tournamentId={tournamentId}
                    playerId={player.id}
                    currentUserId={player.userId}
                    accounts={accounts}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setEditingId(player.id)}
                >
                  Modifier
                </button>

                <form action={deletePlayer}>
                  <input type="hidden" name="tournamentId" value={tournamentId} />
                  <input type="hidden" name="playerId" value={player.id} />
                  <button type="submit" className="btn btn-outline-danger btn-sm">
                    Supprimer
                  </button>
                </form>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
