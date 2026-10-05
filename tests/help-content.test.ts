import { describe, expect, it } from "vitest";
import {
  GUIDE_CYCLE,
  GUIDE_MISSIONS,
  GUIDE_PAIRING_CLOSING,
  GUIDE_PAIRING_STEP,
  GUIDE_PRINCIPLE,
  GUIDE_ROLES,
} from "@/lib/help/guide";
import { PAGE_HELP, helpFor, type HelpPage } from "@/lib/help/pages";

/**
 * Vocabulaire de la recommandation, en français et en anglais.
 *
 * La règle ESLint du projet ne vérifie que les identifiants du code ; les phrases lui
 * échappent. Or une aide est précisément l'endroit où un conseil se glisse sans qu'on y
 * pense — « désigne ton joueur le plus solide » sonne comme de l'aide, c'est une
 * recommandation (§1, §58).
 */
const FORBIDDEN = [
  "recommand",
  "recommend",
  "conseil",
  "meilleur",
  "best",
  "optimal",
  "idéal",
  "ideal",
  "suggér",
  "suggest",
  "privilégi",
  "devrais",
  "vaut mieux",
  "le plus solide",
  "le plus fort",
];

const PAGES = Object.keys(PAGE_HELP) as HelpPage[];

/** Pages que le joueur n'atteint pas : l'aide n'a rien à lui y dire. */
const COACH_ONLY: readonly HelpPage[] = ["pairing"];

function allTexts(): string[] {
  const pageTexts = PAGES.flatMap((page) => {
    const content = PAGE_HELP[page];
    return [content.purpose, content.next ?? "", ...(content.coach ?? []), ...(content.player ?? [])];
  });

  const guideTexts = [
    GUIDE_PRINCIPLE,
    GUIDE_MISSIONS,
    GUIDE_PAIRING_CLOSING,
    ...GUIDE_PAIRING_STEP,
    ...GUIDE_ROLES.flatMap((role) => role.lines),
    ...GUIDE_CYCLE.flatMap((step) => [step.title, step.body]),
  ];

  return [...pageTexts, ...guideTexts].filter((text) => text.length > 0);
}

describe("aide contextuelle", () => {
  it("décrit à quoi sert chaque page", () => {
    for (const page of PAGES) {
      expect(PAGE_HELP[page].purpose.trim(), page).not.toBe("");
    }
  });

  it("dit au coach ce qu'on attend de lui sur chaque page", () => {
    for (const page of PAGES) {
      expect(helpFor(page, "COACH").expected.length, page).toBeGreaterThan(0);
    }
  });

  /** Une aide muette pour un joueur sur une page qu'il atteint serait un trou. */
  it("dit au joueur ce qu'on attend de lui sur chaque page qu'il atteint", () => {
    for (const page of PAGES.filter((candidate) => !COACH_ONLY.includes(candidate))) {
      expect(helpFor(page, "PLAYER").expected.length, page).toBeGreaterThan(0);
    }
  });

  it("donne à l'admin l'aide du coach", () => {
    for (const page of PAGES) {
      expect(helpFor(page, "ADMIN")).toEqual(helpFor(page, "COACH"));
    }
  });

  it("ne contient aucun vocabulaire de recommandation", () => {
    for (const text of allTexts()) {
      const lowered = text.toLowerCase();
      for (const term of FORBIDDEN) {
        expect(lowered, `« ${term} » dans : ${text}`).not.toContain(term);
      }
    }
  });
});
