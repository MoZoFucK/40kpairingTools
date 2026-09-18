import type { PairingProtocol } from "./types";

/**
 * Le protocole est une donnée de configuration, pas du code (§7) : passer de 6 à 8 joueurs
 * ne doit rien changer d'autre que ces valeurs.
 *
 * Voir `docs/protocole-pairing.md` pour la reconstitution du protocole et ses limites.
 */

export const SIX_VS_SIX: PairingProtocol = {
  teamSize: 6,
  attackersPerProposal: 2,
};

/**
 * Nombre d'étapes avant la clôture.
 *
 * Chaque étape consomme deux joueurs par équipe (le défenseur et l'attaquant retenu contre
 * lui), et la clôture apparie mécaniquement les deux derniers.
 */
export function stepCount(protocol: PairingProtocol): number {
  return (protocol.teamSize - 2) / 2;
}

/**
 * Vérifie qu'un protocole est exploitable par le moteur.
 *
 * `attackersPerProposal` doit valoir 2 : la règle de clôture repose sur le fait qu'une
 * étape laisse exactement un attaquant refusé de chaque côté. Avec trois attaquants ou
 * plus, l'appariement des joueurs restants ne serait plus déterminé, et le moteur
 * n'inventera pas une règle absente du protocole observé (§64).
 */
export function protocolError(protocol: PairingProtocol): string | null {
  if (!Number.isInteger(protocol.teamSize) || protocol.teamSize < 4) {
    return "La taille d'équipe doit être un entier d'au moins 4.";
  }
  if (protocol.teamSize % 2 !== 0) {
    return "La taille d'équipe doit être paire.";
  }
  if (protocol.attackersPerProposal !== 2) {
    return "Le protocole implémenté suppose exactement 2 attaquants proposés par défenseur.";
  }
  return null;
}
