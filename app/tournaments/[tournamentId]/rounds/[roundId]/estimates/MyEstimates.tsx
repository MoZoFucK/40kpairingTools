"use client";

import { useState } from "react";
import Link from "next/link";
import { ArmyCard, CoachNote, type ArmyCardData } from "@/components/opponents/ArmyCard";
import { MissionBadge } from "@/components/lists/MissionBadge";
import { EstimatePicker } from "@/components/estimates/EstimatePicker";
import { saveEstimate } from "../../actions";
import type { EstimateValue } from "@/types/domain";

export interface EstimateTarget {
  opponent: ArmyCardData & { id: string };
  value: EstimateValue | null;
}

/**
 * Écran de saisie du joueur — §18, mobile d'abord.
 *
 * Un adversaire par bloc, la fiche de liste dépliable sur place (§16) : le joueur n'a
 * jamais à quitter l'écran pour comprendre ce qu'il affronte avant de poser sa note.
 */
export function MyEstimates({
  playerId,
  tournamentId,
  myDisposition,
  targets,
  disabled,
  closedReason,
}: {
  playerId: string;
  tournamentId: string;
  /** Sans elle, aucune mission ne peut être déduite. */
  myDisposition: string | null;
  targets: readonly EstimateTarget[];
  disabled: boolean;
  closedReason: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      {closedReason ? (
        <div className="alert alert-warning" role="status">
          {closedReason}
        </div>
      ) : null}

      {!myDisposition ? (
        <div className="alert alert-info" role="status">
          Renseigne la disposition de ta liste pour voir la mission primaire de chaque
          affrontement.{" "}
          <Link href={`/tournaments/${tournamentId}/my-list`}>Ma liste</Link>
        </div>
      ) : null}

      <ul className="list-unstyled">
        {targets.map(({ opponent, value }) => (
          <li key={opponent.id} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div className="min-w-0">
                  <div className="fw-semibold">{opponent.name}</div>
                  <div className="text-body-secondary small">
                    {opponent.army}
                    {opponent.detachment ? ` — ${opponent.detachment}` : ""}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-link btn-sm text-nowrap p-0"
                  aria-expanded={openId === opponent.id}
                  onClick={() =>
                    setOpenId(openId === opponent.id ? null : opponent.id)
                  }
                >
                  {openId === opponent.id ? "Masquer la liste" : "Voir la liste complète"}
                </button>
              </div>

              <div className="mb-3">
                <MissionBadge
                  ourDisposition={myDisposition}
                  opponentDisposition={opponent.disposition}
                  detailed
                />
              </div>

              {/*
                * La note du coach reste visible fiche repliée : elle signale ce que la
                * liste seule ne montre pas, et une note qu'il faut déplier pour voir ne
                * remplit pas son office.
                */}
              {opponent.notes && openId !== opponent.id ? (
                <div className="mb-3">
                  <CoachNote notes={opponent.notes} />
                </div>
              ) : null}

              {openId === opponent.id ? (
                <div className="mb-3">
                  <ArmyCard player={opponent} />
                </div>
              ) : null}

              <EstimatePicker
                value={value}
                disabled={disabled}
                onSave={(next) => saveEstimate(playerId, opponent.id, next)}
              />
            </div>
          </li>
        ))}
      </ul>

      {targets.length === 0 ? (
        <p className="text-body-secondary">
          Les listes adverses de cette ronde n&apos;ont pas encore été saisies.
        </p>
      ) : null}
    </>
  );
}
