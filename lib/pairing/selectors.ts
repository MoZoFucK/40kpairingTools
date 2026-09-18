import type { PairingState, Side } from "./types";

/**
 * Lectures de l'état — §58 : ces fonctions décrivent ce qui est possible, jamais ce qui
 * serait souhaitable. Aucune d'elles ne trie, ne note ni ne classe quoi que ce soit.
 */

function playerIdsOf(state: PairingState, side: Side): readonly string[] {
  return side === "US" ? state.ourPlayerIds : state.opponentPlayerIds;
}

/** Joueurs d'un côté qui ne sont pas encore engagés dans un match. */
export function getAvailablePlayers(state: PairingState, side: Side): readonly string[] {
  const matched = new Set(
    state.matches.map((match) =>
      side === "US" ? match.ourPlayerId : match.opponentPlayerId,
    ),
  );
  return playerIdsOf(state, side).filter((playerId) => !matched.has(playerId));
}

export function getAvailableOurPlayers(state: PairingState): readonly string[] {
  return getAvailablePlayers(state, "US");
}

export function getAvailableOpponentPlayers(state: PairingState): readonly string[] {
  return getAvailablePlayers(state, "THEM");
}

/**
 * Joueurs qu'un côté peut encore proposer comme attaquants pour l'étape en cours.
 *
 * Son propre défenseur de l'étape en est exclu : les deux défenseurs sont désignés
 * simultanément, un joueur ne peut donc pas défendre et attaquer dans la même étape.
 */
export function getSelectableAttackers(
  state: PairingState,
  attackingSide: Side,
): readonly string[] {
  const ownDefender = state.step.defenders[attackingSide];
  const alreadyProposed = new Set(
    state.step.attackersAgainst[opposite(attackingSide)] ?? [],
  );

  return getAvailablePlayers(state, attackingSide).filter(
    (playerId) => playerId !== ownDefender && !alreadyProposed.has(playerId),
  );
}

export function opposite(side: Side): Side {
  return side === "US" ? "THEM" : "US";
}

/**
 * Ce que l'interface peut proposer à l'instant T, sans rien ordonner.
 *
 * `null` signifie qu'il n'y a plus rien à décider pour ce côté à cette phase.
 */
export interface PossibleSelections {
  phase: PairingState["phase"];
  defender: Readonly<Partial<Record<Side, readonly string[]>>>;
  attackers: Readonly<Partial<Record<Side, readonly string[]>>>;
  retention: Readonly<Partial<Record<Side, readonly string[]>>>;
}

export function getPossibleSelections(state: PairingState): PossibleSelections {
  const defender: Partial<Record<Side, readonly string[]>> = {};
  const attackers: Partial<Record<Side, readonly string[]>> = {};
  const retention: Partial<Record<Side, readonly string[]>> = {};

  if (state.phase === "DEFENDERS") {
    for (const side of ["US", "THEM"] as const) {
      if (state.step.defenders[side] === undefined) {
        defender[side] = getAvailablePlayers(state, side);
      }
    }
  }

  if (state.phase === "ATTACKERS") {
    for (const defendingSide of ["US", "THEM"] as const) {
      if (state.step.attackersAgainst[defendingSide] === undefined) {
        attackers[defendingSide] = getSelectableAttackers(state, opposite(defendingSide));
      }
    }
  }

  if (state.phase === "RETENTIONS") {
    for (const defendingSide of ["US", "THEM"] as const) {
      if (state.step.retainedAgainst[defendingSide] === undefined) {
        retention[defendingSide] = state.step.attackersAgainst[defendingSide] ?? [];
      }
    }
  }

  return { phase: state.phase, defender, attackers, retention };
}

export function isComplete(state: PairingState): boolean {
  return state.phase === "COMPLETE";
}
