import { describe, expect, it } from "vitest";
import { DISPOSITIONS } from "@/lib/lists/dispositions";
import {
  EXPECTED_MISSION_COUNT,
  missionFor,
  missionsOfMatch,
} from "@/lib/lists/missions";

describe("table des missions primaires", () => {
  it("couvre les 25 croisements", () => {
    for (const own of DISPOSITIONS) {
      for (const opponent of DISPOSITIONS) {
        expect(missionFor(own.value, opponent.value)?.name).toBeTruthy();
      }
    }
  });

  it("donne autant de missions distinctes que de croisements", () => {
    const names = DISPOSITIONS.flatMap((own) =>
      DISPOSITIONS.map((opponent) => missionFor(own.value, opponent.value)!.name),
    );

    expect(new Set(names).size).toBe(EXPECTED_MISSION_COUNT);
  });

  /**
   * Un résumé manquant s'afficherait comme un vide, sans erreur : c'est exactement le genre
   * de trou qu'on ne repère qu'au tournoi.
   */
  it("fournit un résumé pour chaque croisement", () => {
    for (const own of DISPOSITIONS) {
      for (const opponent of DISPOSITIONS) {
        const mission = missionFor(own.value, opponent.value);
        expect(mission?.summary, `${own.value} contre ${opponent.value}`).toBeTruthy();
      }
    }
  });

  it("n'emploie que les marqueurs d'emphase supportés, et les ferme", () => {
    for (const own of DISPOSITIONS) {
      for (const opponent of DISPOSITIONS) {
        const summary = missionFor(own.value, opponent.value)!.summary;
        expect((summary.match(/\*\*/g) ?? []).length % 2, summary).toBe(0);
        expect((summary.match(/`/g) ?? []).length % 2, summary).toBe(0);
      }
    }
  });

  it("restitue la diagonale", () => {
    expect(missionFor("TAKE_AND_HOLD", "TAKE_AND_HOLD")?.name).toBe("Battlefield Dominance");
    expect(missionFor("DISRUPTION", "DISRUPTION")?.name).toBe("Outmanoeuvre");
    expect(missionFor("PURGE_THE_FOE", "PURGE_THE_FOE")?.name).toBe("Meatgrinder");
    expect(missionFor("PRIORITY_ASSETS", "PRIORITY_ASSETS")?.name).toBe("Sabotage");
    expect(missionFor("RECONNAISSANCE", "RECONNAISSANCE")?.name).toBe("Gather Intel");
  });

  /**
   * L'asymétrie est la propriété la plus facile à casser par une transposition accidentelle
   * du tableau, et la plus difficile à repérer à l'œil. Elle est donc testée explicitement.
   */
  it("n'est pas symétrique : chaque camp a sa propre mission", () => {
    expect(missionFor("TAKE_AND_HOLD", "PURGE_THE_FOE")?.name).toBe("Immovable Object");
    expect(missionFor("PURGE_THE_FOE", "TAKE_AND_HOLD")?.name).toBe("Unstoppable Force");

    expect(missionFor("TAKE_AND_HOLD", "DISRUPTION")?.name).toBe("Determined Acquisition");
    expect(missionFor("DISRUPTION", "TAKE_AND_HOLD")?.name).toBe("Death Trap");
  });

  it("donne les deux missions d'un match", () => {
    const { ours, theirs } = missionsOfMatch("RECONNAISSANCE", "PRIORITY_ASSETS");

    expect(ours?.name).toBe("Search and Scour");
    expect(theirs?.name).toBe("Vanguard Operation");
  });

  /**
   * Le premier tableau fourni écrivait « Search & Scour », le second « Search and Scour ».
   * La forme longue du tableau détaillé a été retenue, uniformément.
   */
  it("emploie « and » et non « & » dans les noms composés", () => {
    for (const own of DISPOSITIONS) {
      for (const opponent of DISPOSITIONS) {
        expect(missionFor(own.value, opponent.value)!.name).not.toContain("&");
      }
    }
  });

  it("ne renvoie rien tant qu'une disposition manque", () => {
    expect(missionFor(null, "DISRUPTION")).toBeNull();
    expect(missionFor("DISRUPTION", null)).toBeNull();
    expect(missionFor(undefined, undefined)).toBeNull();
  });

  it("ne renvoie rien pour une disposition inconnue", () => {
    expect(missionFor("INCONNUE", "DISRUPTION")).toBeNull();
  });
});
