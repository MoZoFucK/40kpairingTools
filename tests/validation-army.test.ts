import { describe, expect, it } from "vitest";
import {
  parseListSections,
  ruleKey,
  sameRuleKey,
  shortArmyLabel,
} from "@/lib/validation/army";

describe("clé de rapprochement des règles", () => {
  it("ignore la casse et les espaces superflus", () => {
    expect(ruleKey("  Necrons  ")).toBe("necrons");
    expect(sameRuleKey("Necrons", "necrons")).toBe(true);
    expect(sameRuleKey("Wakened  Dynasty", "wakened dynasty")).toBe(true);
  });

  it("distingue deux armées différentes", () => {
    expect(sameRuleKey("Necrons", "Orks")).toBe(false);
  });
});

describe("découpage d'une liste collée", () => {
  it("regroupe les unités sous leur section", () => {
    const sections = parseListSections(
      [
        "Personnages",
        "Imotekh",
        "Overlord",
        "Technomancer",
        "",
        "Unités",
        "20 Warriors",
        "10 Immortals",
        "6 Wraiths",
      ].join("\n"),
    );

    expect(sections).toHaveLength(2);
    expect(sections[0]?.title).toBe("Personnages");
    expect(sections[0]?.entries).toEqual(["Imotekh", "Overlord", "Technomancer"]);
    expect(sections[1]?.title).toBe("Unités");
    expect(sections[1]?.entries).toHaveLength(3);
  });

  it("reconnaît les entêtes en majuscules des exports courants", () => {
    const sections = parseListSections(["CHARACTERS", "Overlord", "OTHER", "5 Scarabs"].join("\n"));

    expect(sections.map((section) => section.title)).toEqual(["CHARACTERS", "OTHER"]);
  });

  it("ne traite pas une ligne chiffrée comme un titre", () => {
    const sections = parseListSections(["Unités", "20 Warriors", "10 Immortals"].join("\n"));

    expect(sections).toHaveLength(1);
    expect(sections[0]?.entries).toEqual(["20 Warriors", "10 Immortals"]);
  });

  it("regroupe tout sous une section unique quand aucun titre n'est reconnaissable", () => {
    const sections = parseListSections(["20 Warriors", "10 Immortals"].join("\n"));

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe("Liste");
    expect(sections[0]?.entries).toHaveLength(2);
  });

  it("ignore les lignes vides et la décoration", () => {
    const sections = parseListSections(
      ["## Personnages :", "", "  - Imotekh  ", "", ""].join("\n"),
    );

    expect(sections[0]?.title).toBe("Personnages");
    expect(sections[0]?.entries).toEqual(["- Imotekh"]);
  });

  it("ne renvoie rien pour un contenu vide", () => {
    expect(parseListSections("")).toEqual([]);
    expect(parseListSections("   \n  \n")).toEqual([]);
  });
});

describe("libellé compact", () => {
  it("assemble armée et détachement", () => {
    expect(shortArmyLabel("Necrons", "Wakened Dynasty")).toBe("Necrons — Wakened Dynasty");
  });

  it("se contente de l'armée sans détachement", () => {
    expect(shortArmyLabel("Necrons", null)).toBe("Necrons");
    expect(shortArmyLabel("  Necrons  ", "  ")).toBe("Necrons");
  });
});
