import { describe, expect, it } from "vitest";
import {
  endingAt,
  estimatesTrail,
  historyTrail,
  opponentsTrail,
  roundTrail,
  roundsTrail,
  tournamentTrail,
  tournamentsTrail,
} from "@/lib/navigation/trail";

const TOURNAMENT = "11111111-1111-1111-1111-111111111111";
const ROUND = "22222222-2222-2222-2222-222222222222";

describe("fils d'Ariane", () => {
  /**
   * Une branche qui ne remonte pas au tableau de bord laisse l'utilisateur dans une
   * impasse : c'est l'invariant que tout le reste suppose.
   */
  it("part toujours du tableau de bord", () => {
    const trails = [
      tournamentsTrail(),
      tournamentTrail(TOURNAMENT, "L3"),
      roundsTrail(TOURNAMENT, "L3"),
      roundTrail(TOURNAMENT, "L3", ROUND, 2),
      historyTrail(TOURNAMENT, "L3"),
      opponentsTrail(TOURNAMENT, "L3"),
      estimatesTrail(TOURNAMENT, "L3"),
    ];

    for (const trail of trails) {
      expect(trail[0]).toEqual({ label: "Tableau de bord", href: "/dashboard" });
    }
  });

  it("emboîte les niveaux dans l'ordre de navigation", () => {
    expect(roundTrail(TOURNAMENT, "L3", ROUND, 2).map((crumb) => crumb.label)).toEqual([
      "Tableau de bord",
      "Tournois",
      "L3",
      "Rondes",
      "Ronde 2",
    ]);
  });

  it("pointe chaque niveau vers sa propre page", () => {
    expect(roundTrail(TOURNAMENT, "L3", ROUND, 2).map((crumb) => crumb.href)).toEqual([
      "/dashboard",
      "/tournaments",
      `/tournaments/${TOURNAMENT}`,
      `/tournaments/${TOURNAMENT}/rounds`,
      `/tournaments/${TOURNAMENT}/rounds/${ROUND}`,
    ]);
  });

  /** Le dernier élément décrit où l'on est : le rendre cliquable inviterait à un clic inutile. */
  it("laisse la page courante sans lien", () => {
    const trail = endingAt(roundTrail(TOURNAMENT, "L3", ROUND, 2), "Pairing");

    expect(trail.at(-1)).toEqual({ label: "Pairing" });
    expect(trail).toHaveLength(6);
  });

  it("ne modifie pas la piste reçue", () => {
    const base = tournamentTrail(TOURNAMENT, "L3");
    endingAt(base, "Historique");

    expect(base).toHaveLength(3);
  });
});
