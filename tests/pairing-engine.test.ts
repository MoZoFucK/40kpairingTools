import { describe, expect, it } from "vitest";
import {
  applyAction,
  createInitialState,
  replayActions,
  withoutLastAction,
} from "@/lib/pairing/engine";
import { SIX_VS_SIX, stepCount } from "@/lib/pairing/protocol";
import {
  getAvailableOpponentPlayers,
  getAvailableOurPlayers,
  getPossibleSelections,
  getSelectableAttackers,
  isComplete,
} from "@/lib/pairing/selectors";
import type { PairingAction, PairingState } from "@/lib/pairing/types";

/**
 * Jeu d'essai calqué sur la ronde 1 du classeur de l'équipe, mais réduit à des
 * identifiants d'armées : aucune donnée personnelle ne figure dans les tests (§53).
 */
const OURS = ["dark-angels", "necrons", "thousand-sons", "tyranids", "astra", "tau"];
const THEIRS = [
  "opp-necrons",
  "opp-ultramarines",
  "opp-orks",
  "opp-votann",
  "opp-death-guard",
  "opp-custodes",
];

function initial(): PairingState {
  const result = createInitialState(SIX_VS_SIX, OURS, THEIRS);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.state;
}

/** Applique une suite d'actions et exige qu'elles réussissent toutes. */
function play(state: PairingState, actions: readonly PairingAction[]): PairingState {
  let current = state;
  for (const action of actions) {
    const result = applyAction(current, action);
    if (!result.ok) {
      throw new Error(`${action.type} a échoué : ${result.error.message}`);
    }
    current = result.state;
  }
  return current;
}

/** Ronde 1 du classeur, rejouée action par action. */
const ROUND_ONE: readonly PairingAction[] = [
  { type: "SELECT_DEFENDER", side: "US", playerId: "tau" },
  { type: "SELECT_DEFENDER", side: "THEM", playerId: "opp-custodes" },
  { type: "PROPOSE_ATTACKERS", against: "THEM", playerIds: ["tyranids", "thousand-sons"] },
  { type: "PROPOSE_ATTACKERS", against: "US", playerIds: ["opp-votann", "opp-orks"] },
  { type: "RETAIN_ATTACKER", against: "THEM", playerId: "tyranids" },
  { type: "RETAIN_ATTACKER", against: "US", playerId: "opp-votann" },

  { type: "SELECT_DEFENDER", side: "US", playerId: "astra" },
  { type: "SELECT_DEFENDER", side: "THEM", playerId: "opp-ultramarines" },
  { type: "PROPOSE_ATTACKERS", against: "THEM", playerIds: ["dark-angels", "necrons"] },
  { type: "PROPOSE_ATTACKERS", against: "US", playerIds: ["opp-death-guard", "opp-orks"] },
  { type: "RETAIN_ATTACKER", against: "THEM", playerId: "dark-angels" },
  { type: "RETAIN_ATTACKER", against: "US", playerId: "opp-death-guard" },
];

describe("protocole", () => {
  it("6 joueurs donnent 2 étapes avant la clôture", () => {
    expect(stepCount(SIX_VS_SIX)).toBe(2);
  });

  it("refuse un effectif qui ne correspond pas au protocole", () => {
    const result = createInitialState(SIX_VS_SIX, OURS.slice(0, 5), THEIRS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PROTOCOL");
    }
  });

  it("refuse un joueur en double dans un effectif", () => {
    const result = createInitialState(SIX_VS_SIX, ["a", "a", "b", "c", "d", "e"], THEIRS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SELECTION");
    }
  });
});

describe("sélection d'un défenseur", () => {
  it("accepte un joueur disponible", () => {
    const result = applyAction(initial(), {
      type: "SELECT_DEFENDER",
      side: "US",
      playerId: "tau",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.step.defenders.US).toBe("tau");
      expect(result.state.phase).toBe("DEFENDERS");
    }
  });

  it("passe à la phase des attaquants une fois les deux défenseurs désignés", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 2));
    expect(state.phase).toBe("ATTACKERS");
  });

  it("refuse un joueur déjà apparié lors d'une étape précédente", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 6));
    expect(state.stepIndex).toBe(1);

    const result = applyAction(state, {
      type: "SELECT_DEFENDER",
      side: "US",
      playerId: "tau",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PLAYER_UNAVAILABLE");
    }
  });

  it("refuse de désigner deux fois le défenseur du même côté", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 1));
    const result = applyAction(state, {
      type: "SELECT_DEFENDER",
      side: "US",
      playerId: "necrons",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_DECIDED");
    }
  });

  it("refuse un joueur qui n'appartient pas au côté indiqué", () => {
    const result = applyAction(initial(), {
      type: "SELECT_DEFENDER",
      side: "US",
      playerId: "opp-custodes",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNKNOWN_PLAYER");
    }
  });
});

describe("sélection des attaquants", () => {
  it("accepte deux attaquants disponibles", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 3));
    expect(state.step.attackersAgainst.THEM).toEqual(["tyranids", "thousand-sons"]);
  });

  it("exclut notre propre défenseur de nos attaquants de la même étape", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 2));
    expect(getSelectableAttackers(state, "US")).not.toContain("tau");

    const result = applyAction(state, {
      type: "PROPOSE_ATTACKERS",
      against: "THEM",
      playerIds: ["tau", "tyranids"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PLAYER_IS_DEFENDER");
    }
  });

  it("refuse un attaquant déjà apparié", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 8));

    const result = applyAction(state, {
      type: "PROPOSE_ATTACKERS",
      against: "THEM",
      playerIds: ["tyranids", "necrons"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PLAYER_UNAVAILABLE");
    }
  });

  it("refuse deux fois le même joueur", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 2));

    const result = applyAction(state, {
      type: "PROPOSE_ATTACKERS",
      against: "THEM",
      playerIds: ["tyranids", "tyranids"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DUPLICATE_SELECTION");
    }
  });

  it("refuse un nombre d'attaquants incorrect", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 2));

    for (const playerIds of [["tyranids"], ["tyranids", "necrons", "astra"], []]) {
      const result = applyAction(state, {
        type: "PROPOSE_ATTACKERS",
        against: "THEM",
        playerIds,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("WRONG_ATTACKER_COUNT");
      }
    }
  });
});

describe("refus et formation des matchs", () => {
  it("ne retient qu'un attaquant effectivement proposé", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 4));

    const result = applyAction(state, {
      type: "RETAIN_ATTACKER",
      against: "THEM",
      playerId: "astra",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_PROPOSED");
    }
  });

  it("forme deux matchs par étape et remet l'attaquant refusé dans le pool", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 6));

    expect(state.matches).toEqual([
      {
        ourPlayerId: "tau",
        opponentPlayerId: "opp-votann",
        origin: "SELECTED",
        stepIndex: 0,
      },
      {
        ourPlayerId: "tyranids",
        opponentPlayerId: "opp-custodes",
        origin: "SELECTED",
        stepIndex: 0,
      },
    ]);

    // Refusés à l'étape 1, donc de nouveau sélectionnables à l'étape 2.
    expect(getAvailableOurPlayers(state)).toContain("thousand-sons");
    expect(getAvailableOpponentPlayers(state)).toContain("opp-orks");
  });

  it("passe à l'étape suivante une fois les deux refus tranchés", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 6));
    expect(state.stepIndex).toBe(1);
    expect(state.phase).toBe("DEFENDERS");
    expect(state.step.defenders).toEqual({});
  });
});

describe("clôture du pairing", () => {
  const final = () => play(initial(), ROUND_ONE);

  it("apparie mécaniquement les deux derniers matchs", () => {
    const state = final();

    expect(state.matches).toContainEqual({
      ourPlayerId: "necrons",
      opponentPlayerId: "opp-orks",
      origin: "REJECTED_PAIR",
      stepIndex: 1,
    });
    expect(state.matches).toContainEqual({
      ourPlayerId: "thousand-sons",
      opponentPlayerId: "opp-necrons",
      origin: "REMAINING_PAIR",
      stepIndex: 1,
    });
  });

  it("reproduit exactement la ronde 1 du classeur", () => {
    const state = final();

    expect(
      state.matches.map((match) => [match.ourPlayerId, match.opponentPlayerId]),
    ).toEqual([
      ["tau", "opp-votann"],
      ["tyranids", "opp-custodes"],
      ["astra", "opp-death-guard"],
      ["dark-angels", "opp-ultramarines"],
      ["necrons", "opp-orks"],
      ["thousand-sons", "opp-necrons"],
    ]);
  });

  it("apparie tous les joueurs, chacun une seule fois", () => {
    const state = final();

    expect(state.matches).toHaveLength(SIX_VS_SIX.teamSize);
    expect(new Set(state.matches.map((m) => m.ourPlayerId)).size).toBe(6);
    expect(new Set(state.matches.map((m) => m.opponentPlayerId)).size).toBe(6);
    expect(getAvailableOurPlayers(state)).toEqual([]);
    expect(getAvailableOpponentPlayers(state)).toEqual([]);
    expect(isComplete(state)).toBe(true);
  });

  it("refuse toute action une fois le pairing terminé", () => {
    const result = applyAction(final(), {
      type: "SELECT_DEFENDER",
      side: "US",
      playerId: "tau",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PAIRING_COMPLETE");
    }
  });
});

describe("undo", () => {
  it("revient à l'état précédent en rejouant l'historique amputé", () => {
    const before = play(initial(), ROUND_ONE.slice(0, 5));

    const undone = replayActions(
      SIX_VS_SIX,
      OURS,
      THEIRS,
      withoutLastAction(ROUND_ONE.slice(0, 6)),
    );

    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state).toEqual(before);
    }
  });

  it("défait la clôture et rend le pairing de nouveau modifiable", () => {
    const undone = replayActions(SIX_VS_SIX, OURS, THEIRS, withoutLastAction(ROUND_ONE));

    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.state.phase).toBe("RETENTIONS");
      expect(undone.state.matches).toHaveLength(2);
      expect(isComplete(undone.state)).toBe(false);
    }
  });

  it("sur un historique vide, ne fait rien", () => {
    expect(withoutLastAction([])).toEqual([]);
  });
});

describe("déterminisme (§56)", () => {
  it("produit un état identique à partir des mêmes actions", () => {
    const first = replayActions(SIX_VS_SIX, OURS, THEIRS, ROUND_ONE);
    const second = replayActions(SIX_VS_SIX, OURS, THEIRS, ROUND_ONE);

    expect(first).toEqual(second);
  });

  it("l'ordre des deux défenseurs d'une étape est sans effet", () => {
    const ours = play(initial(), [
      { type: "SELECT_DEFENDER", side: "US", playerId: "tau" },
      { type: "SELECT_DEFENDER", side: "THEM", playerId: "opp-custodes" },
    ]);
    const theirs = play(initial(), [
      { type: "SELECT_DEFENDER", side: "THEM", playerId: "opp-custodes" },
      { type: "SELECT_DEFENDER", side: "US", playerId: "tau" },
    ]);

    expect(ours.step.defenders).toEqual(theirs.step.defenders);
    expect(ours.phase).toBe(theirs.phase);
  });
});

describe("sélections possibles offertes à l'interface", () => {
  it("ne propose que les joueurs encore disponibles", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 6));
    const possible = getPossibleSelections(state);

    expect(possible.phase).toBe("DEFENDERS");
    expect(possible.defender.US).not.toContain("tau");
    expect(possible.defender.US).not.toContain("tyranids");
    expect(possible.defender.US).toHaveLength(4);
  });

  it("n'offre en refus que les attaquants proposés contre ce défenseur", () => {
    const state = play(initial(), ROUND_ONE.slice(0, 4));
    const possible = getPossibleSelections(state);

    expect(possible.phase).toBe("RETENTIONS");
    expect(possible.retention.THEM).toEqual(["tyranids", "thousand-sons"]);
    expect(possible.retention.US).toEqual(["opp-votann", "opp-orks"]);
  });
});

describe("8 vs 8", () => {
  /**
   * Protocole confirmé par le coach : identique au 6v6, avec une étape supplémentaire —
   * 3 étapes de 2 attaquants, même règle de clôture. Voir docs/protocole-pairing.md.
   */
  const EIGHT = { teamSize: 8, attackersPerProposal: 2 } as const;
  const OURS_8 = [...OURS, "orks", "custodes"];
  const THEIRS_8 = [...THEIRS, "opp-tyranids", "opp-tau"];

  it("dérive 3 étapes pour 8 joueurs", () => {
    expect(stepCount(EIGHT)).toBe(3);
  });

  it("accepte un effectif de 8 et démarre sur la désignation des défenseurs", () => {
    const result = createInitialState(EIGHT, OURS_8, THEIRS_8);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe("DEFENDERS");
      expect(getAvailableOurPlayers(result.state)).toHaveLength(8);
    }
  });

  it("refuse une taille d'équipe impaire", () => {
    const result = createInitialState(
      { teamSize: 7, attackersPerProposal: 2 },
      OURS_8.slice(0, 7),
      THEIRS_8.slice(0, 7),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PROTOCOL");
    }
  });

  it("refuse un protocole à plus de 2 attaquants, dont la clôture n'est pas définie", () => {
    const result = createInitialState(
      { teamSize: 6, attackersPerProposal: 3 },
      OURS,
      THEIRS,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_PROTOCOL");
    }
  });

  /** Une étape complète : deux défenseurs, deux propositions, deux refus. */
  function step(
    ourDefender: string,
    theirDefender: string,
    ourAttackers: readonly [string, string],
    theirAttackers: readonly [string, string],
  ): readonly PairingAction[] {
    return [
      { type: "SELECT_DEFENDER", side: "US", playerId: ourDefender },
      { type: "SELECT_DEFENDER", side: "THEM", playerId: theirDefender },
      { type: "PROPOSE_ATTACKERS", against: "THEM", playerIds: ourAttackers },
      { type: "PROPOSE_ATTACKERS", against: "US", playerIds: theirAttackers },
      { type: "RETAIN_ATTACKER", against: "THEM", playerId: ourAttackers[0] },
      { type: "RETAIN_ATTACKER", against: "US", playerId: theirAttackers[0] },
    ];
  }

  const FULL_EIGHT: readonly PairingAction[] = [
    ...step("tau", "opp-custodes", ["tyranids", "thousand-sons"], ["opp-votann", "opp-orks"]),
    ...step("astra", "opp-ultramarines", ["dark-angels", "necrons"], ["opp-death-guard", "opp-orks"]),
    ...step("orks", "opp-tau", ["custodes", "necrons"], ["opp-tyranids", "opp-orks"]),
  ];

  it("déroule un pairing complet en 3 étapes", () => {
    const result = replayActions(EIGHT, OURS_8, THEIRS_8, FULL_EIGHT);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.state.phase).toBe("COMPLETE");
    expect(result.state.matches).toHaveLength(8);
    expect(new Set(result.state.matches.map((m) => m.ourPlayerId)).size).toBe(8);
    expect(new Set(result.state.matches.map((m) => m.opponentPlayerId)).size).toBe(8);
  });

  it("applique la même règle de clôture qu'en 6v6", () => {
    const result = replayActions(EIGHT, OURS_8, THEIRS_8, FULL_EIGHT);
    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const origins = result.state.matches.map((match) => match.origin);
    expect(origins.filter((origin) => origin === "SELECTED")).toHaveLength(6);
    expect(origins.filter((origin) => origin === "REJECTED_PAIR")).toHaveLength(1);
    expect(origins.filter((origin) => origin === "REMAINING_PAIR")).toHaveLength(1);

    // Les refusés de la dernière étape s'affrontent.
    expect(result.state.matches).toContainEqual({
      ourPlayerId: "necrons",
      opponentPlayerId: "opp-orks",
      origin: "REJECTED_PAIR",
      stepIndex: 2,
    });
  });

  it("ne clôt pas le pairing avant la troisième étape", () => {
    const afterTwo = replayActions(EIGHT, OURS_8, THEIRS_8, FULL_EIGHT.slice(0, 12));

    expect(afterTwo.ok).toBe(true);
    if (afterTwo.ok) {
      expect(afterTwo.state.phase).toBe("DEFENDERS");
      expect(afterTwo.state.stepIndex).toBe(2);
      expect(afterTwo.state.matches).toHaveLength(4);
    }
  });
});

/**
 * Non-régression sur le protocole lui-même.
 *
 * Les trois rondes complètes du classeur sont rejouées et comparées à leurs matchs réels.
 * Si l'une d'elles cesse de correspondre, c'est que le moteur a dévié du protocole décrit
 * dans docs/protocole-pairing.md — pas qu'un test est à rafraîchir.
 */
describe("rejeu des rondes réelles du classeur", () => {
  function step(
    ourDefender: string,
    theirDefender: string,
    ourAttackers: readonly [string, string],
    theirAttackers: readonly [string, string],
    ourRetained: string,
    theirRetained: string,
  ): readonly PairingAction[] {
    return [
      { type: "SELECT_DEFENDER", side: "US", playerId: ourDefender },
      { type: "SELECT_DEFENDER", side: "THEM", playerId: theirDefender },
      { type: "PROPOSE_ATTACKERS", against: "THEM", playerIds: ourAttackers },
      { type: "PROPOSE_ATTACKERS", against: "US", playerIds: theirAttackers },
      { type: "RETAIN_ATTACKER", against: "THEM", playerId: ourRetained },
      { type: "RETAIN_ATTACKER", against: "US", playerId: theirRetained },
    ];
  }

  function pairingOf(
    opponents: readonly string[],
    actions: readonly PairingAction[],
  ): readonly (readonly [string, string])[] {
    const result = replayActions(SIX_VS_SIX, OURS, opponents, actions);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    expect(result.state.phase).toBe("COMPLETE");
    return result.state.matches.map(
      (match) => [match.ourPlayerId, match.opponentPlayerId] as const,
    );
  }

  it("ronde 2 — contre MTB", () => {
    const opponents = [
      "opp-admech",
      "opp-custodes",
      "opp-csm",
      "opp-necrons",
      "opp-tau",
      "opp-knights",
    ];

    const actions = [
      ...step(
        "tau",
        "opp-tau",
        ["thousand-sons", "tyranids"],
        ["opp-necrons", "opp-knights"],
        "thousand-sons",
        "opp-necrons",
      ),
      ...step(
        "astra",
        "opp-custodes",
        ["tyranids", "necrons"],
        ["opp-admech", "opp-csm"],
        "tyranids",
        "opp-csm",
      ),
    ];

    expect(pairingOf(opponents, actions)).toEqual([
      ["tau", "opp-necrons"],
      ["thousand-sons", "opp-tau"],
      ["astra", "opp-csm"],
      ["tyranids", "opp-custodes"],
      ["necrons", "opp-admech"],
      ["dark-angels", "opp-knights"],
    ]);
  });

  it("ronde 5 — contre LTA", () => {
    const opponents = [
      "opp-custodes",
      "opp-admech",
      "opp-chaos-knights",
      "opp-votann",
      "opp-deathwatch",
      "opp-knights",
    ];

    const actions = [
      ...step(
        "tyranids",
        "opp-admech",
        ["tau", "thousand-sons"],
        ["opp-chaos-knights", "opp-knights"],
        "tau",
        "opp-chaos-knights",
      ),
      ...step(
        "astra",
        "opp-custodes",
        ["necrons", "thousand-sons"],
        ["opp-votann", "opp-deathwatch"],
        "necrons",
        "opp-votann",
      ),
    ];

    expect(pairingOf(opponents, actions)).toEqual([
      ["tyranids", "opp-chaos-knights"],
      ["tau", "opp-admech"],
      ["astra", "opp-votann"],
      ["necrons", "opp-custodes"],
      ["thousand-sons", "opp-deathwatch"],
      ["dark-angels", "opp-knights"],
    ]);
  });
});
