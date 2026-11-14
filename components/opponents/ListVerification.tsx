"use client";

import { useState, useTransition } from "react";
import { setOpponentListVerified } from "@/app/tournaments/[tournamentId]/opponents/actions";

export interface ListVerificationData {
  /** Nom de la personne qui a vérifié la liste, tel qu'enregistré à ce moment-là. */
  byName: string;
  /** Date déjà formatée côté serveur, pour éviter un écart de fuseau à l'hydratation. */
  atLabel: string;
}

/**
 * Drapeau « liste vérifiée » d'une fiche adverse.
 *
 * Un joueur de l'équipe ou le coach indique qu'il a relu la liste saisie contre la liste
 * officielle. Le nom reste affiché pour qu'on sache à qui poser la question. Le drapeau se
 * retire de lui-même si la liste est modifiée ensuite (migration 0014).
 */
export function ListVerification({
  tournamentId,
  teamId,
  playerId,
  verification,
  canEdit,
}: {
  tournamentId: string;
  teamId: string;
  playerId: string;
  verification: ListVerificationData | null;
  /** Faux quand le tournoi est clos : le statut reste lisible mais ne bouge plus. */
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(verified: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setOpponentListVerified(tournamentId, teamId, playerId, verified);
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  return (
    <div className="d-flex align-items-center flex-wrap gap-2">
      {verification ? (
        <span className="badge text-bg-success" title={`Vérifiée le ${verification.atLabel}`}>
          ✓ Vérifiée par {verification.byName}
        </span>
      ) : (
        <span className="badge text-bg-secondary">Liste non vérifiée</span>
      )}
      {verification ? (
        <span className="small text-body-secondary">{verification.atLabel}</span>
      ) : null}

      {canEdit ? (
        verification ? (
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            disabled={pending}
            onClick={() => toggle(false)}
          >
            Retirer
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline-success btn-sm"
            disabled={pending}
            onClick={() => toggle(true)}
          >
            {pending ? "Enregistrement…" : "J'ai vérifié cette liste"}
          </button>
        )
      ) : null}

      {error ? (
        <span className="small text-danger w-100" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
