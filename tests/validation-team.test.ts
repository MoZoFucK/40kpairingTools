import { describe, expect, it } from "vitest";
import {
  hasErrors,
  optionalText,
  teamSizeNotice,
  validatePlayer,
  validateTeam,
  validateTeamSize,
  validateTournament,
} from "@/lib/validation/team";

describe("taille d'équipe (§7)", () => {
  it("accepte les tailles paires de 4 à 12", () => {
    for (const size of [4, 6, 8, 10, 12]) {
      expect(validateTeamSize(size)).toBeNull();
    }
  });

  it("refuse une taille impaire", () => {
    expect(validateTeamSize(7)).toContain("paire");
  });

  it("refuse une taille hors bornes", () => {
    expect(validateTeamSize(2)).not.toBeNull();
    expect(validateTeamSize(14)).not.toBeNull();
  });

  it("refuse une taille non entière", () => {
    expect(validateTeamSize(6.5)).not.toBeNull();
  });
});

describe("tournoi", () => {
  it("accepte un tournoi valide", () => {
    expect(hasErrors(validateTournament({ name: "ADLC 2026", teamSize: 6 }))).toBe(false);
  });

  it("exige un nom non vide", () => {
    expect(validateTournament({ name: "   ", teamSize: 6 }).name).toBeDefined();
  });

  it("remonte l'erreur de taille sur le bon champ", () => {
    expect(validateTournament({ name: "ADLC", teamSize: 7 }).teamSize).toBeDefined();
  });
});

describe("équipe", () => {
  it("exige un nom", () => {
    expect(validateTeam({ name: "" }).name).toBeDefined();
  });

  it("limite la longueur du nom court", () => {
    expect(validateTeam({ name: "ADLC", shortName: "A".repeat(13) }).shortName).toBeDefined();
    expect(hasErrors(validateTeam({ name: "ADLC", shortName: "ADLC" }))).toBe(false);
  });

  it("accepte un nom court absent", () => {
    expect(hasErrors(validateTeam({ name: "ADLC" }))).toBe(false);
  });
});

describe("joueur", () => {
  it("exige le nom et l'armée", () => {
    const errors = validatePlayer({ name: "", army: "" });
    expect(errors.name).toBeDefined();
    expect(errors.army).toBeDefined();
  });

  it("n'exige ni détachement ni liste", () => {
    expect(hasErrors(validatePlayer({ name: "Morgan", army: "Tyranides" }))).toBe(false);
  });
});

describe("texte optionnel", () => {
  it("efface les chaînes vides ou blanches", () => {
    expect(optionalText("")).toBeUndefined();
    expect(optionalText("   ")).toBeUndefined();
    expect(optionalText(undefined)).toBeUndefined();
  });

  it("conserve le texte utile, débarrassé de ses espaces", () => {
    expect(optionalText("  Gladius  ")).toBe("Gladius");
  });
});

describe("effectif", () => {
  it("ne signale rien quand l'effectif est complet", () => {
    expect(teamSizeNotice(6, 6)).toBeNull();
  });

  it("signale un effectif incomplet", () => {
    expect(teamSizeNotice(4, 6)).toContain("il en manque 2");
  });

  it("signale un effectif en surnombre", () => {
    expect(teamSizeNotice(7, 6)).toContain("en trop");
  });
});
