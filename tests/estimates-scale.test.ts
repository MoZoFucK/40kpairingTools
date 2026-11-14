import { describe, expect, it } from "vitest";
import {
  ESTIMATE_SCALE,
  estimateLevel,
  estimateScale,
  isEstimateScaleSize,
  isEstimateValue,
} from "@/lib/estimates/scale";
import { buildMatrix, transpose } from "@/lib/estimates/matrix";

describe("échelle des estimés sur 5", () => {
  it("couvre exactement les valeurs 1 à 5", () => {
    expect(ESTIMATE_SCALE.map((level) => level.value)).toEqual([1, 2, 3, 4, 5]);
    expect(estimateScale(5)).toBe(ESTIMATE_SCALE);
  });

  it("accepte les entiers de 1 à 5", () => {
    expect([1, 2, 3, 4, 5].every((value) => isEstimateValue(value))).toBe(true);
  });

  it("rejette tout ce qui sort de l'échelle", () => {
    for (const value of [0, 6, -1, 2.5, "3", null, undefined, NaN]) {
      expect(isEstimateValue(value)).toBe(false);
    }
  });

  it("expose un libellé et un repère pour chaque valeur", () => {
    expect(estimateLevel(1).label).toBe("Très défavorable");
    expect(estimateLevel(5).label).toBe("Très favorable");
    expect(estimateLevel(4).short).toBe("4");
  });
});

describe("échelle des estimés sur 3", () => {
  it("réutilise les valeurs 1, 3 et 5", () => {
    expect(estimateScale(3).map((level) => level.value)).toEqual([1, 3, 5]);
  });

  it("nomme les niveaux Défaite, Égalité, Victoire", () => {
    expect(estimateScale(3).map((level) => level.label)).toEqual([
      "Défaite",
      "Égalité",
      "Victoire",
    ]);
    expect(estimateLevel(5, 3).short).toBe("V");
  });

  it("refuse les valeurs intermédiaires", () => {
    expect([1, 3, 5].every((value) => isEstimateValue(value, 3))).toBe(true);
    expect(isEstimateValue(2, 3)).toBe(false);
    expect(isEstimateValue(4, 3)).toBe(false);
  });

  it("affiche malgré tout une valeur saisie avant le passage sur 3", () => {
    expect(estimateLevel(2, 3).label).toBe("Défavorable");
  });

  it("n'admet que 3 et 5 comme tailles d'échelle", () => {
    expect(isEstimateScaleSize(3)).toBe(true);
    expect(isEstimateScaleSize(5)).toBe(true);
    expect(isEstimateScaleSize(4)).toBe(false);
    expect(isEstimateScaleSize("3")).toBe(false);
  });

  it("est portée par la matrice, y compris transposée", () => {
    const matrix = buildMatrix([], [], [], 3);
    expect(matrix.scale).toBe(3);
    expect(transpose(matrix).scale).toBe(3);
    expect(buildMatrix([], [], []).scale).toBe(5);
  });
});
