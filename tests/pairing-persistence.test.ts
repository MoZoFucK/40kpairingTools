import { describe, expect, it } from "vitest";
import { toEngineAction, toStoredAction } from "@/lib/pairing/persistence";
import { replayActions } from "@/lib/pairing/engine";
import { SIX_VS_SIX } from "@/lib/pairing/protocol";
import type { PairingAction } from "@/lib/pairing/types";

/**
 * Traduction entre le moteur et la base.
 *
 * C'est la couture la plus risquée du lot 8 : une action mal retraduite produirait un
 * pairing différent à chaque rechargement, sans que rien ne signale l'erreur. Le test qui
 * compte est donc l'aller-retour complet sur une ronde entière.
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

describe("aller-retour moteur ↔ base", () => {
  it("restitue chaque action à l'identique", () => {
    for (const action of ROUND_ONE) {
      expect(toEngineAction(toStoredAction(action))).toEqual(action);
    }
  });

  it("conserve le côté concerné, qui distingue qui décide", () => {
    const stored = toStoredAction({
      type: "RETAIN_ATTACKER",
      against: "THEM",
      playerId: "tyranids",
    });

    expect(stored.side).toBe("THEM");
    expect(toEngineAction(stored)).toEqual({
      type: "RETAIN_ATTACKER",
      against: "THEM",
      playerId: "tyranids",
    });
  });

  it("garde les deux attaquants d'une proposition", () => {
    const stored = toStoredAction({
      type: "PROPOSE_ATTACKERS",
      against: "US",
      playerIds: ["opp-votann", "opp-orks"],
    });

    expect(stored.player_ids).toEqual(["opp-votann", "opp-orks"]);
  });

  it("produit le même pairing après un aller-retour complet", () => {
    const direct = replayActions(SIX_VS_SIX, OURS, THEIRS, ROUND_ONE);
    const roundTripped = replayActions(
      SIX_VS_SIX,
      OURS,
      THEIRS,
      ROUND_ONE.map(toStoredAction).map(toEngineAction),
    );

    expect(roundTripped).toEqual(direct);
    expect(direct.ok && direct.state.phase).toBe("COMPLETE");
  });

  it("refuse une action enregistrée sans joueur", () => {
    expect(() =>
      toEngineAction({ type: "SELECT_DEFENDER", side: "US", player_ids: [] }),
    ).toThrow();
  });
});
