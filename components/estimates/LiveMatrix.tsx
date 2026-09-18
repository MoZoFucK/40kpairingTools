"use client";

import { useMemo } from "react";
import { buildMatrix, type MatrixPlayer, type RawEstimate } from "@/lib/estimates/matrix";
import { useEstimatesChannel } from "@/lib/supabase/useEstimatesChannel";
import { EstimateMatrix } from "./EstimateMatrix";

/**
 * Matrice branchée sur le temps réel — §19.
 *
 * Le rendu initial vient du serveur : la matrice est lisible avant même que la connexion
 * Realtime soit établie. L'abonnement ne fait que la tenir à jour ensuite.
 */
export function LiveMatrix({
  tournamentId,
  ourPlayers,
  opponentPlayers,
  initialEstimates,
}: {
  tournamentId: string;
  ourPlayers: readonly MatrixPlayer[];
  opponentPlayers: readonly MatrixPlayer[];
  initialEstimates: readonly RawEstimate[];
}) {
  const { estimates, status } = useEstimatesChannel(tournamentId, initialEstimates);

  const matrix = useMemo(
    () => buildMatrix(ourPlayers, opponentPlayers, estimates),
    [ourPlayers, opponentPlayers, estimates],
  );

  return (
    <div>
      <p className="small mb-2" role="status">
        {status === "live" ? (
          <span className="text-success">● Mise à jour en direct</span>
        ) : null}
        {status === "connecting" ? (
          <span className="text-body-secondary">○ Connexion…</span>
        ) : null}
        {status === "offline" ? (
          <span className="text-danger">
            ● Hors ligne — la matrice peut ne plus être à jour. Recharge la page.
          </span>
        ) : null}
      </p>

      <EstimateMatrix matrix={matrix} />
    </div>
  );
}
