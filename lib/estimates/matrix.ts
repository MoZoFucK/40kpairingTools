import type { EstimateValue } from "@/types/domain";

/**
 * Construction de la matrice d'estimés — §20.
 *
 * La matrice ne fait que restituer joueur × adversaire × estimé (§57). Elle ne calcule
 * aucune moyenne, aucun total, aucun classement : toute agrégation serait une lecture
 * stratégique déguisée.
 */

export interface MatrixPlayer {
  id: string;
  name: string;
  army: string;
  detachment?: string | null;
  /** Sert à déduire la mission primaire ; la matrice elle-même l'ignore. */
  disposition?: string | null;
}

export interface MatrixCell {
  ourPlayerId: string;
  opponentPlayerId: string;
  /** `null` tant que le joueur n'a rien saisi. */
  value: EstimateValue | null;
  comment?: string | null;
}

export interface Matrix {
  ourPlayers: readonly MatrixPlayer[];
  opponentPlayers: readonly MatrixPlayer[];
  /** Indexée `${ourPlayerId}:${opponentPlayerId}`. */
  cells: ReadonlyMap<string, MatrixCell>;
}

export function cellKey(ourPlayerId: string, opponentPlayerId: string): string {
  return `${ourPlayerId}:${opponentPlayerId}`;
}

export interface RawEstimate {
  player_id: string;
  opponent_player_id: string;
  value: EstimateValue;
  comment?: string | null;
}

export function buildMatrix(
  ourPlayers: readonly MatrixPlayer[],
  opponentPlayers: readonly MatrixPlayer[],
  estimates: readonly RawEstimate[],
): Matrix {
  const cells = new Map<string, MatrixCell>();

  for (const ourPlayer of ourPlayers) {
    for (const opponent of opponentPlayers) {
      cells.set(cellKey(ourPlayer.id, opponent.id), {
        ourPlayerId: ourPlayer.id,
        opponentPlayerId: opponent.id,
        value: null,
        comment: null,
      });
    }
  }

  for (const estimate of estimates) {
    const key = cellKey(estimate.player_id, estimate.opponent_player_id);
    // Un estimé qui ne correspond à aucune case de cette matrice est ignoré : il concerne
    // une autre ronde, il n'a rien à faire ici.
    if (!cells.has(key)) {
      continue;
    }
    cells.set(key, {
      ourPlayerId: estimate.player_id,
      opponentPlayerId: estimate.opponent_player_id,
      value: estimate.value,
      comment: estimate.comment ?? null,
    });
  }

  return { ourPlayers, opponentPlayers, cells };
}

export function getCell(
  matrix: Matrix,
  ourPlayerId: string,
  opponentPlayerId: string,
): MatrixCell | undefined {
  return matrix.cells.get(cellKey(ourPlayerId, opponentPlayerId));
}

/**
 * Avancement de la saisie, pour que le coach sache qui n'a pas fini.
 *
 * C'est un décompte de remplissage, pas une lecture des valeurs : la répartition des
 * estimés n'est jamais résumée.
 */
export function completionByPlayer(
  matrix: Matrix,
): ReadonlyMap<string, { filled: number; total: number }> {
  const progress = new Map<string, { filled: number; total: number }>();

  for (const ourPlayer of matrix.ourPlayers) {
    let filled = 0;
    for (const opponent of matrix.opponentPlayers) {
      if (getCell(matrix, ourPlayer.id, opponent.id)?.value !== null) {
        filled += 1;
      }
    }
    progress.set(ourPlayer.id, { filled, total: matrix.opponentPlayers.length });
  }

  return progress;
}

/** Transpose la matrice : nos joueurs en colonnes, les adversaires en lignes. */
export function transpose(matrix: Matrix): Matrix {
  const cells = new Map<string, MatrixCell>();
  for (const cell of matrix.cells.values()) {
    cells.set(cellKey(cell.opponentPlayerId, cell.ourPlayerId), {
      ...cell,
      ourPlayerId: cell.opponentPlayerId,
      opponentPlayerId: cell.ourPlayerId,
    });
  }

  return {
    ourPlayers: matrix.opponentPlayers,
    opponentPlayers: matrix.ourPlayers,
    cells,
  };
}
