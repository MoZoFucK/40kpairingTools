import { describe, expect, it } from "vitest";
import {
  describeMissing,
  isListComplete,
  missingListFields,
} from "@/lib/lists/completeness";
import { opponentTeamsProgress, playerTodos } from "@/lib/players/progress";
import { areTeamEstimatesEditable, teamEstimatesClosedReason } from "@/lib/rounds/status";
import { DISPOSITION_VALUES, drawTeamDispositions } from "../scripts/lib/dispositions.mjs";
import { DISPOSITIONS } from "@/lib/lists/dispositions";

const FULL_LIST = { army: "Aeldari", detachment: "Warhost", disposition: "TAKE_AND_HOLD" };

describe("complétude d'une liste", () => {
  it("considère saisie une liste avec armée, détachement et disposition", () => {
    expect(isListComplete(FULL_LIST)).toBe(true);
  });

  it("nomme les champs manquants, dans l'ordre du formulaire", () => {
    expect(missingListFields({ army: "Orks", detachment: " ", disposition: null })).toEqual([
      "detachment",
      "disposition",
    ]);
  });

  it("les énumère en français lisible", () => {
    expect(describeMissing(["disposition"])).toBe("disposition");
    expect(describeMissing(["army", "detachment", "disposition"])).toBe(
      "armée, détachement et disposition",
    );
  });
});

describe("saisie des estimés par équipe adverse", () => {
  it("est libre tant qu'aucune ronde n'oppose cette équipe", () => {
    expect(areTeamEstimatesEditable([])).toBe(true);
    expect(teamEstimatesClosedReason([])).toBeNull();
  });

  it("se ferme dès qu'une ronde contre l'équipe a dépassé l'estimation", () => {
    expect(areTeamEstimatesEditable(["ESTIMATES_OPEN", "PAIRING"])).toBe(false);
    expect(teamEstimatesClosedReason(["ESTIMATES_OPEN", "PAIRING"])).toMatch(/pairing/);
  });
});

describe("avancement du joueur", () => {
  const teams = [
    { id: "t1", name: "GSH" },
    { id: "t2", name: "MTB" },
    { id: "t3", name: "LTA" },
  ];
  const opponents = [
    { id: "a", team_id: "t1" },
    { id: "b", team_id: "t1" },
    { id: "c", team_id: "t2" },
  ];

  it("compte les estimés posés par équipe, sans lire leur valeur", () => {
    const progress = opponentTeamsProgress(
      teams,
      opponents,
      [{ opponent_team_id: "t2", status: "LOCKED" }],
      new Set(["a"]),
    );

    expect(progress.map(({ teamName, filled, total, editable }) => ({
      teamName,
      filled,
      total,
      editable,
    }))).toEqual([
      { teamName: "GSH", filled: 1, total: 2, editable: true },
      { teamName: "MTB", filled: 0, total: 1, editable: false },
      { teamName: "LTA", filled: 0, total: 0, editable: true },
    ]);
  });

  it("liste la liste incomplète puis les équipes ouvertes à finir", () => {
    const progress = opponentTeamsProgress(teams, opponents, [], new Set(["a"]));
    const todos = playerTodos({ ...FULL_LIST, disposition: null }, progress, []);

    expect(todos).toEqual([
      { kind: "list", missing: ["disposition"] },
      { kind: "estimates", teamId: "t1", teamName: "GSH", filled: 1, total: 2 },
      { kind: "estimates", teamId: "t2", teamName: "MTB", filled: 0, total: 1 },
    ]);
  });

  it("ne demande plus rien une fois le tournoi clos", () => {
    const progress = opponentTeamsProgress(teams, opponents, [], new Set());
    expect(playerTodos({ army: "Orks" }, progress, ["LOCKED", "LOCKED"])).toEqual([]);
  });
});

describe("tirage des dispositions de test", () => {
  it("reprend exactement l'enum de l'application", () => {
    expect(DISPOSITION_VALUES).toEqual(DISPOSITIONS.map((entry) => entry.value));
  });

  it("couvre les cinq dispositions dans une équipe de 6, avec un doublon", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const drawn = drawTeamDispositions(6);
      expect(drawn).toHaveLength(6);
      expect(new Set(drawn).size).toBe(5);
    }
  });

  it("complète la couverture des dispositions déjà saisies", () => {
    const drawn = drawTeamDispositions(4, {
      alreadySet: ["TAKE_AND_HOLD", "DISRUPTION"],
    });
    expect(new Set([...drawn, "TAKE_AND_HOLD", "DISRUPTION"]).size).toBe(5);
  });
});
