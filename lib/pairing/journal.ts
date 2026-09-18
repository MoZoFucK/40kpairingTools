import type { StoredPairingAction } from "./persistence";

/**
 * Libellés du journal d'actions — §28.
 *
 * Le journal raconte ce qui a été décidé, jamais ce qu'il aurait fallu décider. Les
 * formulations distinguent qui a tranché : quand l'adversaire défend, c'est lui qui retient
 * un attaquant, le coach n'a fait que saisir sa décision.
 */

export interface NamedPlayer {
  name: string;
}

export function describeStoredAction(
  action: StoredPairingAction,
  players: ReadonlyMap<string, NamedPlayer>,
): string {
  const names = action.player_ids
    .map((id) => players.get(id)?.name ?? "?")
    .join(" et ");

  switch (action.type) {
    case "SELECT_DEFENDER":
      return `${action.side === "US" ? "Notre" : "Leur"} défenseur : ${names}`;
    case "PROPOSE_ATTACKERS":
      // `side` désigne le côté qui défend, donc les attaquants viennent de l'autre camp.
      return `${action.side === "THEM" ? "Nos" : "Leurs"} attaquants : ${names}`;
    case "RETAIN_ATTACKER":
      return `${action.side === "THEM" ? "Ils retiennent" : "Nous retenons"} : ${names}`;
  }
}
