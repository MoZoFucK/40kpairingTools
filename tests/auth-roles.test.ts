import { describe, expect, it } from "vitest";
import {
  canEditEstimatesOf,
  canImportOpponents,
  canLockRound,
  canManageRounds,
  canManageTeam,
  canManageUsers,
  canReadAllEstimates,
  canRunPairing,
  hasAtLeast,
} from "@/lib/auth/roles";

describe("permissions par rôle (§8)", () => {
  it("un joueur ne gère ni l'équipe, ni les rondes, ni le pairing", () => {
    expect(canManageTeam("PLAYER")).toBe(false);
    expect(canImportOpponents("PLAYER")).toBe(false);
    expect(canManageRounds("PLAYER")).toBe(false);
    expect(canRunPairing("PLAYER")).toBe(false);
    expect(canLockRound("PLAYER")).toBe(false);
    expect(canManageUsers("PLAYER")).toBe(false);
  });

  it("un coach gère son équipe, les rondes et le pairing", () => {
    expect(canManageTeam("COACH")).toBe(true);
    expect(canImportOpponents("COACH")).toBe(true);
    expect(canManageRounds("COACH")).toBe(true);
    expect(canRunPairing("COACH")).toBe(true);
    expect(canLockRound("COACH")).toBe(true);
  });

  it("un coach ne gère pas les utilisateurs", () => {
    expect(canManageUsers("COACH")).toBe(false);
  });

  it("un admin couvre toutes les actions du coach", () => {
    expect(canManageTeam("ADMIN")).toBe(true);
    expect(canRunPairing("ADMIN")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(true);
  });

  it("ordonne les rôles sans les confondre", () => {
    expect(hasAtLeast("ADMIN", "COACH")).toBe(true);
    expect(hasAtLeast("COACH", "COACH")).toBe(true);
    expect(hasAtLeast("COACH", "ADMIN")).toBe(false);
    expect(hasAtLeast("PLAYER", "COACH")).toBe(false);
  });
});

describe("estimés : qui peut écrire quoi (§8, §12)", () => {
  it("un joueur modifie ses propres estimés", () => {
    expect(canEditEstimatesOf("PLAYER", "joueur-1", "joueur-1")).toBe(true);
  });

  it("un joueur ne modifie pas ceux d'un autre", () => {
    expect(canEditEstimatesOf("PLAYER", "joueur-1", "joueur-2")).toBe(false);
  });

  it("un joueur sans fiche associée ne modifie rien", () => {
    expect(canEditEstimatesOf("PLAYER", undefined, "joueur-1")).toBe(false);
  });

  it("le coach lit tous les estimés mais ne saisit pas à la place des joueurs", () => {
    expect(canReadAllEstimates("COACH")).toBe(true);
    expect(canEditEstimatesOf("COACH", undefined, "joueur-1")).toBe(false);
    expect(canEditEstimatesOf("COACH", "joueur-2", "joueur-1")).toBe(false);
  });

  it("un joueur ne lit pas tous les estimés", () => {
    expect(canReadAllEstimates("PLAYER")).toBe(false);
  });
});
