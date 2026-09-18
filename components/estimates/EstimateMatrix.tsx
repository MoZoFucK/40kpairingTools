"use client";

import { useState } from "react";
import { ESTIMATE_SCALE, estimateLevel } from "@/lib/estimates/scale";
import {
  completionByPlayer,
  getCell,
  transpose,
  type Matrix,
} from "@/lib/estimates/matrix";

/**
 * Matrice d'estimés — §20.
 *
 * Elle restitue joueur × adversaire × estimé, rien d'autre. Aucun tri, aucune moyenne,
 * aucune mise en avant : ce serait une lecture stratégique déguisée (§57, §58).
 *
 * Le chiffre est toujours écrit ; la couleur ne fait que l'accompagner (§44). Les colonnes
 * d'entête restent figées pour qu'une matrice 6×6 se lise sans perdre le fil.
 */
export function EstimateMatrix({ matrix }: { matrix: Matrix }) {
  const [transposed, setTransposed] = useState(false);

  const shown = transposed ? transpose(matrix) : matrix;
  const progress = completionByPlayer(matrix);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setTransposed(!transposed)}
        >
          {transposed ? "Nos joueurs en lignes" : "Adversaires en lignes"}
        </button>

        <div className="d-flex gap-2 flex-wrap small align-items-center">
          <span className="text-body-secondary">Légende</span>
          {ESTIMATE_SCALE.map((level) => (
            <span key={level.value} className={`badge ${level.className}`}>
              {level.value} · {level.label}
            </span>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle mb-0">
          <caption className="visually-hidden">
            Estimés saisis, par joueur et par adversaire
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ minWidth: "12rem" }}>
                {transposed ? "Adversaires" : "Nos joueurs"}
              </th>
              {shown.opponentPlayers.map((player) => (
                <th key={player.id} scope="col" className="text-center small">
                  <div className="fw-semibold">{player.name}</div>
                  <div className="text-body-secondary fw-normal">{player.army}</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shown.ourPlayers.map((rowPlayer) => {
              const done = transposed ? undefined : progress.get(rowPlayer.id);

              return (
                <tr key={rowPlayer.id}>
                  <th scope="row" className="small">
                    <div className="fw-semibold">{rowPlayer.name}</div>
                    <div className="text-body-secondary fw-normal">
                      {rowPlayer.army}
                      {rowPlayer.detachment ? ` — ${rowPlayer.detachment}` : ""}
                    </div>
                    {done ? (
                      <div
                        className={`fw-normal ${
                          done.filled === done.total
                            ? "text-success"
                            : "text-body-secondary"
                        }`}
                      >
                        {done.filled}/{done.total} saisis
                      </div>
                    ) : null}
                  </th>

                  {shown.opponentPlayers.map((columnPlayer) => {
                    const cell = getCell(shown, rowPlayer.id, columnPlayer.id);
                    const value = cell?.value ?? null;

                    return (
                      <td
                        key={columnPlayer.id}
                        className={`text-center fw-semibold ${
                          value === null ? "" : estimateLevel(value).className
                        }`}
                        title={
                          value === null
                            ? "Pas encore saisi"
                            : estimateLevel(value).label
                        }
                      >
                        {value ?? <span className="text-body-secondary fw-normal">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shown.ourPlayers.length === 0 || shown.opponentPlayers.length === 0 ? (
        <p className="text-body-secondary mt-3 mb-0">
          La matrice se remplira dès que les deux équipes auront des joueurs.
        </p>
      ) : null}
    </div>
  );
}
