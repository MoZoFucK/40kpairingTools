/**
 * Types du moteur de pairing.
 *
 * Ce module est volontairement indépendant de React et de Supabase (§6) : il ne connaît
 * que des identifiants de joueurs, un protocole et une suite d'actions humaines.
 *
 * Il ne produit aucune recommandation (§58). Il répond à « qu'est-ce qui est possible ? »
 * et « que découle-t-il de ce choix ? », jamais à « que devrais-je faire ? ».
 */

/** Notre équipe, ou l'équipe adverse. */
export type Side = "US" | "THEM";

export interface PairingProtocol {
  /** Nombre de joueurs par équipe. */
  teamSize: number;
  /** Nombre d'attaquants proposés face à un défenseur. */
  attackersPerProposal: number;
}

export type PairingPhase =
  /** Chaque équipe désigne son défenseur pour l'étape courante. */
  | "DEFENDERS"
  /** Chaque équipe propose ses attaquants face au défenseur adverse. */
  | "ATTACKERS"
  /** Chaque défenseur retient l'un des attaquants proposés contre lui. */
  | "RETENTIONS"
  /** Tous les matchs sont formés. */
  | "COMPLETE";

/**
 * Origine d'un match.
 *
 * SELECTED       : le défenseur a retenu un attaquant.
 * REJECTED_PAIR  : les deux attaquants refusés de la dernière étape (« Rejetés »).
 * REMAINING_PAIR : les deux derniers joueurs (« Oubliés »).
 */
export type MatchOrigin = "SELECTED" | "REJECTED_PAIR" | "REMAINING_PAIR";

export interface PairingMatch {
  ourPlayerId: string;
  opponentPlayerId: string;
  origin: MatchOrigin;
  /** Étape ayant produit le match, à partir de 0. */
  stepIndex: number;
}

/**
 * Avancement de l'étape en cours.
 *
 * Les clés désignent le côté qui **défend** : `attackersAgainst.US` regroupe les
 * attaquants adverses proposés contre notre défenseur, et c'est donc nous qui en
 * retiendrons un. Cette convention évite l'ambiguïté permanente entre « qui propose »
 * et « qui choisit ».
 */
export interface StepProgress {
  defenders: Readonly<Partial<Record<Side, string>>>;
  attackersAgainst: Readonly<Partial<Record<Side, readonly string[]>>>;
  retainedAgainst: Readonly<Partial<Record<Side, string>>>;
}

export interface PairingState {
  protocol: PairingProtocol;
  ourPlayerIds: readonly string[];
  opponentPlayerIds: readonly string[];
  matches: readonly PairingMatch[];
  /** Étape en cours, à partir de 0. */
  stepIndex: number;
  phase: PairingPhase;
  step: StepProgress;
}

export type PairingAction =
  | { type: "SELECT_DEFENDER"; side: Side; playerId: string }
  | { type: "PROPOSE_ATTACKERS"; against: Side; playerIds: readonly string[] }
  | { type: "RETAIN_ATTACKER"; against: Side; playerId: string };

export type PairingErrorCode =
  | "UNKNOWN_PLAYER"
  | "PLAYER_UNAVAILABLE"
  | "PLAYER_IS_DEFENDER"
  | "DUPLICATE_SELECTION"
  | "WRONG_ATTACKER_COUNT"
  | "NOT_PROPOSED"
  | "UNEXPECTED_ACTION"
  | "ALREADY_DECIDED"
  | "PAIRING_COMPLETE"
  | "INVALID_PROTOCOL";

export interface PairingError {
  code: PairingErrorCode;
  /** Message destiné à l'utilisateur, compréhensible sans connaître le code (§37). */
  message: string;
}

export type PairingResult =
  | { ok: true; state: PairingState }
  | { ok: false; error: PairingError };
