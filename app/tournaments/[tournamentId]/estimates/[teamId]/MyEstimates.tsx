"use client";

import { useState } from "react";
import Link from "next/link";
import { ArmyCard, CoachNote, type ArmyCardData } from "@/components/opponents/ArmyCard";
import { MissionBadge } from "@/components/lists/MissionBadge";
import { EstimatePicker } from "@/components/estimates/EstimatePicker";
import { EstimateCommentField } from "@/components/estimates/EstimateCommentField";
import { saveEstimate, saveEstimateComment } from "../actions";
import type { EstimateValue } from "@/types/domain";

export interface EstimateTarget {
  opponent: ArmyCardData & { id: string };
  value: EstimateValue | null;
  comment: string | null;
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
        {targets.map((target) => (
          <EstimateCard
            key={target.opponent.id}
            playerId={playerId}
            myDisposition={myDisposition}
            target={target}
            disabled={disabled}
          />
        ))}
      </ul>

      {targets.length === 0 ? (
        <p className="text-body-secondary">
          Les listes de cette équipe adverse n&apos;ont pas encore été saisies.
        </p>
      ) : null}
    </>
  );
}

function EstimateCard({
  playerId,
  myDisposition,
  target: { opponent, value, comment },
  disabled,
}: {
  playerId: string;
  myDisposition: string | null;
  target: EstimateTarget;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Le commentaire n'existe qu'accompagné d'une note : il se déverrouille avec elle.
  const [hasValue, setHasValue] = useState(value !== null);

  return (
    <li className="card mb-3">
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
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "Masquer la liste" : "Voir la liste complète"}
          </button>
        </div>

        <div className="mb-3">
          {myDisposition && !opponent.disposition ? (
            <p className="small text-body-secondary mb-0">
              Disposition adverse non renseignée : mission primaire inconnue.
            </p>
          ) : (
            <MissionBadge
              ourDisposition={myDisposition}
              opponentDisposition={opponent.disposition}
              detailed
            />
          )}
        </div>

        {/*
          * La note du coach reste visible fiche repliée : elle signale ce que la liste
          * seule ne montre pas, et une note qu'il faut déplier pour voir ne remplit pas
          * son office.
          */}
        {opponent.notes && !open ? (
          <div className="mb-3">
            <CoachNote notes={opponent.notes} />
          </div>
        ) : null}

        {open ? (
          <div className="mb-3">
            <ArmyCard player={opponent} listInitiallyOpen />
          </div>
        ) : null}

        <EstimatePicker
          value={value}
          disabled={disabled}
          onSave={async (next) => {
            const result = await saveEstimate(playerId, opponent.id, next);
            if (result.ok) {
              setHasValue(true);
            }
            return result;
          }}
        />

        <EstimateCommentField
          initial={comment}
          hasValue={hasValue}
          disabled={disabled}
          onSave={(text) => saveEstimateComment(playerId, opponent.id, text)}
        />
      </div>
    </li>
  );
}
