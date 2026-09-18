import type { EstimateValue } from "@/types/domain";

/**
 * Légende des estimés, centralisée (§10.5) : aucun composant ne doit redéfinir ces libellés.
 * Les couleurs sont une aide, jamais la seule information : le chiffre reste toujours
 * affiché (§44).
 */
export interface EstimateLevel {
  value: EstimateValue;
  label: string;
  /** Classe CSS appliquée à la cellule. */
  className: string;
}

export const ESTIMATE_SCALE: readonly EstimateLevel[] = [
  { value: 1, label: "Très défavorable", className: "estimate-1" },
  { value: 2, label: "Défavorable", className: "estimate-2" },
  { value: 3, label: "Équilibré", className: "estimate-3" },
  { value: 4, label: "Favorable", className: "estimate-4" },
  { value: 5, label: "Très favorable", className: "estimate-5" },
] as const;

export const MIN_ESTIMATE = 1;
export const MAX_ESTIMATE = 5;

export function isEstimateValue(value: unknown): value is EstimateValue {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_ESTIMATE &&
    value <= MAX_ESTIMATE
  );
}

export function estimateLevel(value: EstimateValue): EstimateLevel {
  const level = ESTIMATE_SCALE.find((entry) => entry.value === value);
  if (!level) {
    throw new Error(`Estimé hors échelle : ${value}`);
  }
  return level;
}
