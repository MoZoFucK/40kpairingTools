import { describe, expect, it } from "vitest";
import { listSummary } from "@/lib/lists/summary";

describe("résumé d'une liste", () => {
  it("aligne faction, détachement et disposition", () => {
    expect(
      listSummary({
        army: "Aeldari",
        detachment: "Battle Host",
        disposition: "TAKE_AND_HOLD",
      }),
    ).toBe("Aeldari — Battle Host — Take and Hold");
  });

  /**
   * Toutes les fiches ne sont pas renseignées au moment du pairing — c'est même la règle
   * en début de tournoi. Un séparateur orphelin (« Aeldari —  — Take and Hold ») passerait
   * pour une donnée corrompue.
   */
  it("omet les segments absents sans laisser de séparateur", () => {
    expect(listSummary({ army: "Orks", disposition: "PURGE_THE_FOE" })).toBe(
      "Orks — Purge the Foe",
    );
    expect(listSummary({ army: "Orks", detachment: "War Horde" })).toBe("Orks — War Horde");
    expect(listSummary({ army: "Orks" })).toBe("Orks");
    expect(listSummary({ army: "Orks", detachment: null, disposition: null })).toBe("Orks");
    expect(listSummary({ army: "Orks", detachment: "   " })).toBe("Orks");
  });

  /** Le détachement est du texte libre : une liste peut en aligner plusieurs. */
  it("restitue le détachement tel qu'il a été saisi", () => {
    expect(
      listSummary({ army: "Space Marines", detachment: "Gladius + Ironstorm" }),
    ).toBe("Space Marines — Gladius + Ironstorm");
  });

  /** Une disposition inconnue vient forcément d'une donnée abîmée : mieux vaut ne rien dire. */
  it("ignore une disposition hors de l'énumération", () => {
    expect(listSummary({ army: "Necrons", disposition: "TAKE_AND_FLEE" })).toBe("Necrons");
  });
});
