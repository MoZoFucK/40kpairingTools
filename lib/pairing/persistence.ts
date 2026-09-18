import type { PairingAction, Side } from "./types";

/**
 * Traduction entre les actions du moteur et leur forme persistée.
 *
 * Le moteur ignore tout de la base ; la base ignore tout du moteur. Ce module est le seul
 * endroit qui connaisse les deux formes, pour que la correspondance soit vérifiable d'un
 * coup d'œil plutôt qu'éparpillée.
 */

export interface StoredPairingAction {
  type: "SELECT_DEFENDER" | "PROPOSE_ATTACKERS" | "RETAIN_ATTACKER";
  side: Side;
  player_ids: string[];
}

export function toEngineAction(row: StoredPairingAction): PairingAction {
  const first = row.player_ids[0];
  if (first === undefined) {
    throw new Error("Action de pairing enregistrée sans joueur.");
  }

  switch (row.type) {
    case "SELECT_DEFENDER":
      return { type: "SELECT_DEFENDER", side: row.side, playerId: first };
    case "PROPOSE_ATTACKERS":
      return { type: "PROPOSE_ATTACKERS", against: row.side, playerIds: row.player_ids };
    case "RETAIN_ATTACKER":
      return { type: "RETAIN_ATTACKER", against: row.side, playerId: first };
  }
}

export function toStoredAction(action: PairingAction): StoredPairingAction {
  switch (action.type) {
    case "SELECT_DEFENDER":
      return { type: action.type, side: action.side, player_ids: [action.playerId] };
    case "PROPOSE_ATTACKERS":
      return {
        type: action.type,
        side: action.against,
        player_ids: [...action.playerIds],
      };
    case "RETAIN_ATTACKER":
      return { type: action.type, side: action.against, player_ids: [action.playerId] };
  }
}
