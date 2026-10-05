import { describe, expect, it } from "vitest";
import {
  ROUND_STATUS_LABEL,
  allowedTransitions,
  areEstimatesEditable,
  canTransition,
  estimatesClosedReason,
  isPairingReachable,
  isPairingUnderway,
  isRoundLocked,
  isTournamentClosed,
} from "@/lib/rounds/status";
import {
  buildMatrix,
  cellKey,
  completionByPlayer,
  getCell,
  transpose,
  type MatrixPlayer,
} from "@/lib/estimates/matrix";
import type { RoundStatus } from "@/types/domain";

const ALL_STATUSES: readonly RoundStatus[] = [
  "PREPARATION",
  "ESTIMATES_OPEN",
  "ESTIMATES_LOCKED",
  "PAIRING",
  "COMPLETED",
  "LOCKED",
];

describe("statut de ronde (§10.6, §18)", () => {
  it("nomme chaque statut", () => {
    for (const status of ALL_STATUSES) {
      expect(ROUND_STATUS_LABEL[status]).toBeTruthy();
    }
  });

  it("n'autorise la saisie qu'en préparation et phase ouverte", () => {
    expect(areEstimatesEditable("PREPARATION")).toBe(true);
    expect(areEstimatesEditable("ESTIMATES_OPEN")).toBe(true);

    for (const status of ["ESTIMATES_LOCKED", "PAIRING", "COMPLETED", "LOCKED"] as const) {
      expect(areEstimatesEditable(status)).toBe(false);
    }
  });

  it("explique au joueur pourquoi la saisie lui est fermée", () => {
    expect(estimatesClosedReason("ESTIMATES_OPEN")).toBeNull();
    expect(estimatesClosedReason("PAIRING")).toContain("pairing");
    expect(estimatesClosedReason("LOCKED")).toContain("terminée");
    expect(estimatesClosedReason("ESTIMATES_LOCKED")).toContain("verrouillée");
  });

  it("rend une ronde verrouillée définitive", () => {
    expect(isRoundLocked("LOCKED")).toBe(true);
    expect(allowedTransitions("LOCKED")).toEqual([]);
  });

  it("autorise les retours en arrière tant que la ronde n'est pas verrouillée", () => {
    expect(canTransition("ESTIMATES_OPEN", "PREPARATION")).toBe(true);
    expect(canTransition("PAIRING", "ESTIMATES_LOCKED")).toBe(true);
    expect(canTransition("COMPLETED", "PAIRING")).toBe(true);
  });

  it("interdit les sauts d'étape", () => {
    expect(canTransition("PREPARATION", "PAIRING")).toBe(false);
    expect(canTransition("PREPARATION", "LOCKED")).toBe(false);
    expect(canTransition("ESTIMATES_OPEN", "COMPLETED")).toBe(false);
  });

  it("ne propose jamais un statut vers lui-même", () => {
    for (const status of ALL_STATUSES) {
      expect(allowedTransitions(status)).not.toContain(status);
    }
  });

  /**
   * Le bouton « Pairing » de la liste des rondes s'appuie dessus : le faire apparaître en
   * préparation mènerait le coach à un écran qui ne sait que lui dire de revenir.
   */
  it("n'ouvre le pairing qu'une fois la préparation passée", () => {
    expect(isPairingReachable("PREPARATION")).toBe(false);

    for (const status of ALL_STATUSES.filter((s) => s !== "PREPARATION")) {
      expect(isPairingReachable(status), status).toBe(true);
    }
  });

  /** Le raccourci du tableau de bord ne remonte que les rondes que le coach a lui-même ouvertes. */
  it("ne considère le pairing en cours que sur les deux statuts concernés", () => {
    expect(ALL_STATUSES.filter(isPairingUnderway)).toEqual(["ESTIMATES_LOCKED", "PAIRING"]);
  });

  /** Les listes d'un tournoi clos font partie de son historique : elles se figent. */
  it("clôt un tournoi quand toutes ses rondes sont verrouillées", () => {
    expect(isTournamentClosed(["LOCKED"])).toBe(true);
    expect(isTournamentClosed(["LOCKED", "LOCKED", "LOCKED"])).toBe(true);
  });

  /** Une seule ronde encore ouverte suffit : le tournoi n'est pas fini. */
  it("ne clôt pas un tournoi dont une ronde reste ouverte", () => {
    for (const status of ALL_STATUSES.filter((s) => s !== "LOCKED")) {
      expect(isTournamentClosed(["LOCKED", status]), status).toBe(false);
    }
  });

  /** Sans ronde, le tournoi n'a pas commencé : le joueur doit pouvoir saisir sa liste. */
  it("ne clôt pas un tournoi sans ronde", () => {
    expect(isTournamentClosed([])).toBe(false);
  });

  /** Un raccourci qui mènerait à un écran inatteignable serait pire que pas de raccourci. */
  it("garde le raccourci inclus dans ce qui est atteignable", () => {
    for (const status of ALL_STATUSES.filter(isPairingUnderway)) {
      expect(isPairingReachable(status), status).toBe(true);
    }
  });
});

const OURS: MatrixPlayer[] = [
  { id: "us-1", name: "Morgan", army: "Tyranides" },
  { id: "us-2", name: "Marc", army: "Astra Militarum" },
];

const THEIRS: MatrixPlayer[] = [
  { id: "them-1", name: "Keyradin", army: "Necrons" },
  { id: "them-2", name: "Uma", army: "Ultramarines" },
  { id: "them-3", name: "LouisC", army: "Orks" },
];

describe("matrice d'estimés (§20)", () => {
  it("crée une case par croisement, vide par défaut", () => {
    const matrix = buildMatrix(OURS, THEIRS, []);

    expect(matrix.cells.size).toBe(OURS.length * THEIRS.length);
    for (const cell of matrix.cells.values()) {
      expect(cell.value).toBeNull();
    }
  });

  it("place chaque estimé dans sa case", () => {
    const matrix = buildMatrix(OURS, THEIRS, [
      { player_id: "us-1", opponent_player_id: "them-2", value: 5 },
      { player_id: "us-2", opponent_player_id: "them-1", value: 3 },
    ]);

    expect(getCell(matrix, "us-1", "them-2")?.value).toBe(5);
    expect(getCell(matrix, "us-2", "them-1")?.value).toBe(3);
    expect(getCell(matrix, "us-1", "them-1")?.value).toBeNull();
  });

  it("ignore un estimé qui concerne une autre ronde", () => {
    const matrix = buildMatrix(OURS, THEIRS, [
      { player_id: "us-1", opponent_player_id: "autre-ronde", value: 4 },
    ]);

    expect(matrix.cells.size).toBe(OURS.length * THEIRS.length);
    expect(matrix.cells.has(cellKey("us-1", "autre-ronde"))).toBe(false);
  });

  it("compte l'avancement de la saisie sans résumer les valeurs", () => {
    const matrix = buildMatrix(OURS, THEIRS, [
      { player_id: "us-1", opponent_player_id: "them-1", value: 1 },
      { player_id: "us-1", opponent_player_id: "them-2", value: 5 },
    ]);

    const progress = completionByPlayer(matrix);
    expect(progress.get("us-1")).toEqual({ filled: 2, total: 3 });
    expect(progress.get("us-2")).toEqual({ filled: 0, total: 3 });
  });

  it("transpose sans perdre aucune valeur", () => {
    const matrix = buildMatrix(OURS, THEIRS, [
      { player_id: "us-1", opponent_player_id: "them-3", value: 2 },
    ]);
    const flipped = transpose(matrix);

    expect(flipped.ourPlayers).toEqual(THEIRS);
    expect(flipped.opponentPlayers).toEqual(OURS);
    expect(flipped.cells.size).toBe(matrix.cells.size);
    expect(getCell(flipped, "them-3", "us-1")?.value).toBe(2);
  });

  it("revient à l'identique après deux transpositions", () => {
    const matrix = buildMatrix(OURS, THEIRS, [
      { player_id: "us-2", opponent_player_id: "them-1", value: 4 },
    ]);

    expect(transpose(transpose(matrix))).toEqual(matrix);
  });

  it("supporte une équipe encore vide", () => {
    const matrix = buildMatrix([], THEIRS, []);
    expect(matrix.cells.size).toBe(0);
    expect(completionByPlayer(matrix).size).toBe(0);
  });
});
