import type { EstimateValue } from "@/types/domain";

/**
 * Légende des estimés, centralisée (§10.5) : aucun composant ne doit redéfinir ces libellés.
 * Les couleurs sont une aide, jamais la seule information : le repère (`short`) reste
 * toujours affiché (§44).
 *
 * Deux échelles, au choix du coach pour chaque tournoi :
 * - sur 5, de « Très défavorable » à « Très favorable » ;
 * - sur 3, Défaite / Égalité / Victoire.
 *
 * L'échelle sur 3 est stockée sur les valeurs 1, 3 et 5 de l'échelle sur 5 : la base, les
 * couleurs et tout ce qui lit une valeur restent identiques d'une échelle à l'autre.
 */
export interface EstimateLevel {
  value: EstimateValue;
  label: string;
  /** Repère affiché dans les cases et les boutons, en plus de la couleur. */
  short: string;
  /** Classe CSS appliquée à la cellule. */
  className: string;
}

/** Nombre de niveaux de l'échelle d'un tournoi. */
export type EstimateScaleSize = 3 | 5;

export const ESTIMATE_SCALE_SIZES: readonly EstimateScaleSize[] = [5, 3];
export const DEFAULT_ESTIMATE_SCALE: EstimateScaleSize = 5;

export const ESTIMATE_SCALE: readonly EstimateLevel[] = [
  { value: 1, label: "Très défavorable", short: "1", className: "estimate-1" },
  { value: 2, label: "Défavorable", short: "2", className: "estimate-2" },
  { value: 3, label: "Équilibré", short: "3", className: "estimate-3" },
  { value: 4, label: "Favorable", short: "4", className: "estimate-4" },
  { value: 5, label: "Très favorable", short: "5", className: "estimate-5" },
] as const;

export const THREE_LEVEL_SCALE: readonly EstimateLevel[] = [
  { value: 1, label: "Défaite", short: "D", className: "estimate-1" },
  { value: 3, label: "Égalité", short: "É", className: "estimate-3" },
  { value: 5, label: "Victoire", short: "V", className: "estimate-5" },
] as const;

export const MIN_ESTIMATE = 1;
export const MAX_ESTIMATE = 5;

export function isEstimateScaleSize(value: unknown): value is EstimateScaleSize {
  return value === 3 || value === 5;
}

/** Libellé de l'échelle, pour les réglages et les légendes. */
export function estimateScaleLabel(size: EstimateScaleSize): string {
  return size === 3 ? "Sur 3 — Défaite / Égalité / Victoire" : "Sur 5 — de 1 à 5";
}

export function estimateScale(size: EstimateScaleSize = DEFAULT_ESTIMATE_SCALE) {
  return size === 3 ? THREE_LEVEL_SCALE : ESTIMATE_SCALE;
}

/** La valeur fait-elle partie de l'échelle donnée (sur 5 par défaut) ? */
export function isEstimateValue(
  value: unknown,
  size: EstimateScaleSize = DEFAULT_ESTIMATE_SCALE,
): value is EstimateValue {
  return estimateScale(size).some((level) => level.value === value);
}

/**
 * Niveau correspondant à une valeur.
 *
 * Une valeur absente de l'échelle demandée (un 2 saisi avant le passage du tournoi sur 3,
 * par exemple) retombe sur l'échelle sur 5 : on montre ce qui a été saisi plutôt que de
 * casser l'écran.
 */
export function estimateLevel(
  value: EstimateValue,
  size: EstimateScaleSize = DEFAULT_ESTIMATE_SCALE,
): EstimateLevel {
  const level =
    estimateScale(size).find((entry) => entry.value === value) ??
    ESTIMATE_SCALE.find((entry) => entry.value === value);
  if (!level) {
    throw new Error(`Estimé hors échelle : ${value}`);
  }
  return level;
}
