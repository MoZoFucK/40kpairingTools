"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RawEstimate } from "@/lib/estimates/matrix";
import type { EstimateValue } from "@/types/domain";

/**
 * Abonnement temps réel aux estimés d'un tournoi — §19, §40.
 *
 * L'abonnement est limité au tournoi courant, jamais à la table entière. La RLS s'applique
 * aussi à la diffusion : un utilisateur ne reçoit que ce qu'il pourrait lire.
 *
 * Le coach n'a jamais à rafraîchir (§19), mais l'état de la connexion lui est montré : une
 * matrice figée par une coupure réseau ressemble en tout point à une matrice à jour, et
 * c'est précisément le genre de confusion à éviter pendant un tournoi.
 */

export type ChannelStatus = "connecting" | "live" | "offline";

export interface LiveEstimatesState {
  estimates: readonly RawEstimate[];
  status: ChannelStatus;
}

interface EstimateRecord {
  player_id: string;
  opponent_player_id: string;
  value: EstimateValue;
  comment: string | null;
}

function merge(
  current: readonly RawEstimate[],
  incoming: EstimateRecord,
): readonly RawEstimate[] {
  const next = current.filter(
    (estimate) =>
      !(
        estimate.player_id === incoming.player_id &&
        estimate.opponent_player_id === incoming.opponent_player_id
      ),
  );
  return [...next, incoming];
}

function remove(
  current: readonly RawEstimate[],
  gone: Partial<EstimateRecord>,
): readonly RawEstimate[] {
  return current.filter(
    (estimate) =>
      !(
        estimate.player_id === gone.player_id &&
        estimate.opponent_player_id === gone.opponent_player_id
      ),
  );
}

export function useEstimatesChannel(
  tournamentId: string,
  initial: readonly RawEstimate[],
): LiveEstimatesState {
  const [estimates, setEstimates] = useState<readonly RawEstimate[]>(initial);
  const [status, setStatus] = useState<ChannelStatus>("connecting");

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`estimates:${tournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "estimates",
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setEstimates((current) => remove(current, payload.old as EstimateRecord));
            return;
          }
          setEstimates((current) => merge(current, payload.new as EstimateRecord));
        },
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("offline");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return { estimates, status };
}
