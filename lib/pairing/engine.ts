import { protocolError, stepCount } from "./protocol";
import { getAvailablePlayers, getSelectableAttackers, opposite } from "./selectors";
import type {
  PairingAction,
  PairingErrorCode,
  PairingMatch,
  PairingProtocol,
  PairingResult,
  PairingState,
  Side,
  StepProgress,
} from "./types";

/**
 * Moteur de pairing.
 *
 * Il reçoit un état et une action humaine, et retourne un nouvel état accompagné de ses
 * conséquences mécaniques (§6). Il est déterministe : à état et action identiques,
 * résultat identique (§56). Aucune horloge, aucun aléa, aucune identité générée ici.
 *
 * Il ne choisit jamais à la place du coach. Les seules décisions qu'il prend seul sont
 * celles que le protocole rend mécaniques : la formation des deux derniers matchs.
 */

const EMPTY_STEP: StepProgress = {
  defenders: {},
  attackersAgainst: {},
  retainedAgainst: {},
};

function fail(code: PairingErrorCode, message: string): PairingResult {
  return { ok: false, error: { code, message } };
}

export function createInitialState(
  protocol: PairingProtocol,
  ourPlayerIds: readonly string[],
  opponentPlayerIds: readonly string[],
): PairingResult {
  const invalid = protocolError(protocol);
  if (invalid) {
    return fail("INVALID_PROTOCOL", invalid);
  }

  const rosters = [
    ["notre équipe", ourPlayerIds],
    ["l'équipe adverse", opponentPlayerIds],
  ] as const;

  for (const [label, roster] of rosters) {
    if (roster.length !== protocol.teamSize) {
      return fail(
        "INVALID_PROTOCOL",
        `${roster.length} joueurs pour ${label}, alors que le protocole en attend ${protocol.teamSize}.`,
      );
    }
    if (new Set(roster).size !== roster.length) {
      return fail("DUPLICATE_SELECTION", `Un joueur figure deux fois dans ${label}.`);
    }
  }

  return {
    ok: true,
    state: {
      protocol,
      ourPlayerIds,
      opponentPlayerIds,
      matches: [],
      stepIndex: 0,
      phase: "DEFENDERS",
      step: EMPTY_STEP,
    },
  };
}

function rosterOf(state: PairingState, side: Side): readonly string[] {
  return side === "US" ? state.ourPlayerIds : state.opponentPlayerIds;
}

function sideLabel(side: Side): string {
  return side === "US" ? "notre équipe" : "l'équipe adverse";
}

function selectDefender(
  state: PairingState,
  side: Side,
  playerId: string,
): PairingResult {
  if (state.phase !== "DEFENDERS") {
    return fail("UNEXPECTED_ACTION", "Les défenseurs de cette étape sont déjà désignés.");
  }
  if (state.step.defenders[side] !== undefined) {
    return fail("ALREADY_DECIDED", `Le défenseur de ${sideLabel(side)} est déjà désigné.`);
  }
  if (!rosterOf(state, side).includes(playerId)) {
    return fail("UNKNOWN_PLAYER", `Ce joueur n'appartient pas à ${sideLabel(side)}.`);
  }
  if (!getAvailablePlayers(state, side).includes(playerId)) {
    return fail("PLAYER_UNAVAILABLE", "Ce joueur est déjà apparié.");
  }

  const defenders = { ...state.step.defenders, [side]: playerId };
  const bothChosen = defenders.US !== undefined && defenders.THEM !== undefined;

  return {
    ok: true,
    state: {
      ...state,
      phase: bothChosen ? "ATTACKERS" : "DEFENDERS",
      step: { ...state.step, defenders },
    },
  };
}

function proposeAttackers(
  state: PairingState,
  against: Side,
  playerIds: readonly string[],
): PairingResult {
  if (state.phase !== "ATTACKERS") {
    return fail("UNEXPECTED_ACTION", "Ce n'est pas le moment de proposer des attaquants.");
  }
  if (state.step.attackersAgainst[against] !== undefined) {
    return fail(
      "ALREADY_DECIDED",
      `Les attaquants face au défenseur de ${sideLabel(against)} sont déjà proposés.`,
    );
  }

  const expected = state.protocol.attackersPerProposal;
  if (playerIds.length !== expected) {
    return fail(
      "WRONG_ATTACKER_COUNT",
      `Il faut proposer exactement ${expected} attaquants, et non ${playerIds.length}.`,
    );
  }
  if (new Set(playerIds).size !== playerIds.length) {
    return fail(
      "DUPLICATE_SELECTION",
      "Le même joueur ne peut pas être proposé deux fois.",
    );
  }

  const attackingSide = opposite(against);
  const selectable = getSelectableAttackers(state, attackingSide);

  for (const playerId of playerIds) {
    if (!rosterOf(state, attackingSide).includes(playerId)) {
      return fail(
        "UNKNOWN_PLAYER",
        `Ce joueur n'appartient pas à ${sideLabel(attackingSide)}.`,
      );
    }
    if (playerId === state.step.defenders[attackingSide]) {
      return fail(
        "PLAYER_IS_DEFENDER",
        "Ce joueur défend déjà lors de cette étape : il ne peut pas être aussi attaquant.",
      );
    }
    if (!selectable.includes(playerId)) {
      return fail("PLAYER_UNAVAILABLE", "Ce joueur est déjà apparié.");
    }
  }

  const attackersAgainst = { ...state.step.attackersAgainst, [against]: playerIds };
  const bothProposed =
    attackersAgainst.US !== undefined && attackersAgainst.THEM !== undefined;

  return {
    ok: true,
    state: {
      ...state,
      phase: bothProposed ? "RETENTIONS" : "ATTACKERS",
      step: { ...state.step, attackersAgainst },
    },
  };
}

function retainAttacker(
  state: PairingState,
  against: Side,
  playerId: string,
): PairingResult {
  if (state.phase !== "RETENTIONS") {
    return fail("UNEXPECTED_ACTION", "Ce n'est pas le moment de retenir un attaquant.");
  }
  if (state.step.retainedAgainst[against] !== undefined) {
    return fail("ALREADY_DECIDED", "Cet attaquant a déjà été retenu.");
  }

  const proposed = state.step.attackersAgainst[against] ?? [];
  if (!proposed.includes(playerId)) {
    return fail(
      "NOT_PROPOSED",
      "Ce joueur ne fait pas partie des attaquants proposés contre ce défenseur.",
    );
  }

  const retainedAgainst = { ...state.step.retainedAgainst, [against]: playerId };
  if (retainedAgainst.US === undefined || retainedAgainst.THEM === undefined) {
    return {
      ok: true,
      state: { ...state, step: { ...state.step, retainedAgainst } },
    };
  }

  return resolveStep(state, { ...state.step, retainedAgainst });
}

/**
 * Clôt l'étape : forme ses deux matchs, puis enchaîne — étape suivante, ou clôture du
 * pairing si c'était la dernière.
 */
function resolveStep(state: PairingState, step: StepProgress): PairingResult {
  const ourDefender = step.defenders.US;
  const theirDefender = step.defenders.THEM;
  const retainedAgainstUs = step.retainedAgainst.US;
  const retainedAgainstThem = step.retainedAgainst.THEM;
  const attackersAgainstUs = step.attackersAgainst.US;
  const attackersAgainstThem = step.attackersAgainst.THEM;

  if (
    ourDefender === undefined ||
    theirDefender === undefined ||
    retainedAgainstUs === undefined ||
    retainedAgainstThem === undefined ||
    attackersAgainstUs === undefined ||
    attackersAgainstThem === undefined
  ) {
    return fail("UNEXPECTED_ACTION", "L'étape est incomplète.");
  }

  const stepMatches: PairingMatch[] = [
    {
      ourPlayerId: ourDefender,
      opponentPlayerId: retainedAgainstUs,
      origin: "SELECTED",
      stepIndex: state.stepIndex,
    },
    {
      ourPlayerId: retainedAgainstThem,
      opponentPlayerId: theirDefender,
      origin: "SELECTED",
      stepIndex: state.stepIndex,
    },
  ];

  const afterStep: PairingState = {
    ...state,
    matches: [...state.matches, ...stepMatches],
  };

  const isLastStep = state.stepIndex + 1 >= stepCount(state.protocol);
  if (!isLastStep) {
    return {
      ok: true,
      state: {
        ...afterStep,
        stepIndex: state.stepIndex + 1,
        phase: "DEFENDERS",
        step: EMPTY_STEP,
      },
    };
  }

  // Clôture : les deux attaquants refusés de cette dernière étape s'affrontent
  // (« Rejetés »), et les deux joueurs restants s'affrontent (« Oubliés »).
  // Aucun choix humain n'intervient ici : c'est une conséquence du protocole.
  const refusedOur = attackersAgainstThem.find((id) => id !== retainedAgainstThem);
  const refusedOpponent = attackersAgainstUs.find((id) => id !== retainedAgainstUs);

  if (refusedOur === undefined || refusedOpponent === undefined) {
    return fail("UNEXPECTED_ACTION", "Impossible de déterminer les attaquants refusés.");
  }

  const remainingOur = getAvailablePlayers(afterStep, "US").filter(
    (id) => id !== refusedOur,
  );
  const remainingOpponent = getAvailablePlayers(afterStep, "THEM").filter(
    (id) => id !== refusedOpponent,
  );

  const lastOur = remainingOur[0];
  const lastOpponent = remainingOpponent[0];

  if (
    remainingOur.length !== 1 ||
    remainingOpponent.length !== 1 ||
    lastOur === undefined ||
    lastOpponent === undefined
  ) {
    return fail(
      "UNEXPECTED_ACTION",
      "La clôture attend exactement un joueur restant de chaque côté.",
    );
  }

  const closingMatches: PairingMatch[] = [
    {
      ourPlayerId: refusedOur,
      opponentPlayerId: refusedOpponent,
      origin: "REJECTED_PAIR",
      stepIndex: state.stepIndex,
    },
    {
      ourPlayerId: lastOur,
      opponentPlayerId: lastOpponent,
      origin: "REMAINING_PAIR",
      stepIndex: state.stepIndex,
    },
  ];

  return {
    ok: true,
    state: {
      ...afterStep,
      matches: [...afterStep.matches, ...closingMatches],
      stepIndex: state.stepIndex + 1,
      phase: "COMPLETE",
      step: EMPTY_STEP,
    },
  };
}

export function applyAction(state: PairingState, action: PairingAction): PairingResult {
  if (state.phase === "COMPLETE") {
    return fail(
      "PAIRING_COMPLETE",
      "Le pairing est terminé : il n'est plus modifiable. Annuler la dernière action pour le reprendre.",
    );
  }

  switch (action.type) {
    case "SELECT_DEFENDER":
      return selectDefender(state, action.side, action.playerId);
    case "PROPOSE_ATTACKERS":
      return proposeAttackers(state, action.against, action.playerIds);
    case "RETAIN_ATTACKER":
      return retainAttacker(state, action.against, action.playerId);
  }
}

/**
 * Reconstruit l'état depuis la suite des actions (§29, stratégie 1).
 *
 * L'état n'est jamais stocké, seulement dérivé. Un undo se réduit donc à rejouer la liste
 * amputée de sa dernière action.
 */
export function replayActions(
  protocol: PairingProtocol,
  ourPlayerIds: readonly string[],
  opponentPlayerIds: readonly string[],
  actions: readonly PairingAction[],
): PairingResult {
  let result = createInitialState(protocol, ourPlayerIds, opponentPlayerIds);

  for (const action of actions) {
    if (!result.ok) {
      return result;
    }
    result = applyAction(result.state, action);
  }

  return result;
}

/** Suite d'actions amputée de la dernière. Vide, elle reste vide. */
export function withoutLastAction(
  actions: readonly PairingAction[],
): readonly PairingAction[] {
  return actions.slice(0, Math.max(0, actions.length - 1));
}
