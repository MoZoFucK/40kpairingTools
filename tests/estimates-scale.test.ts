import { describe, expect, it } from "vitest";
import {
  ESTIMATE_SCALE,
  estimateLevel,
  isEstimateValue,
} from "@/lib/estimates/scale";

describe("échelle des estimés", () => {
  it("couvre exactement les valeurs 1 à 5", () => {
    expect(ESTIMATE_SCALE.map((level) => level.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("accepte les entiers de 1 à 5", () => {
    expect([1, 2, 3, 4, 5].every(isEstimateValue)).toBe(true);
  });

  it("rejette tout ce qui sort de l'échelle", () => {
    for (const value of [0, 6, -1, 2.5, "3", null, undefined, NaN]) {
      expect(isEstimateValue(value)).toBe(false);
    }
  });

  it("expose un libellé pour chaque valeur", () => {
    expect(estimateLevel(1).label).toBe("Très défavorable");
    expect(estimateLevel(5).label).toBe("Très favorable");
  });
});
