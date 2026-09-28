import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Contraste du thème sombre — §44.
 *
 * Le test lit les couleurs directement dans `app/globals.css` plutôt que de les recopier :
 * une valeur retouchée à la main dans la feuille de style est exactement le cas que ce
 * test doit attraper. Les recopier ici reviendrait à ne vérifier que la copie.
 *
 * Seuil retenu : 4.5:1, le niveau AA pour du texte courant. Les estimés sont affichés en
 * petit, dans les cellules d'une matrice — le seuil assoupli des grands caractères ne
 * s'applique pas.
 */
const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

const AA = 4.5;

function variable(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(CSS);
  if (!match?.[1]) {
    throw new Error(`Variable CSS --${name} introuvable dans app/globals.css`);
  }
  return match[1];
}

/** Luminance relative, formule WCAG 2.1. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Composite une couleur semi-opaque sur un fond, comme le fait le navigateur. */
function over(foreground: string, background: string, alpha: number): string {
  const blend = (offset: number) => {
    const front = parseInt(foreground.slice(offset, offset + 2), 16);
    const back = parseInt(background.slice(offset, offset + 2), 16);
    return Math.round(alpha * front + (1 - alpha) * back)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${blend(1)}${blend(3)}${blend(5)}`;
}

/** Opacité des lignes déjà appariées, lue dans la feuille de style. */
function pairedOpacity(): number {
  const match = /\.is-paired\s*\{[^}]*opacity:\s*([\d.]+)/.exec(CSS);
  if (!match?.[1]) {
    throw new Error("Règle .is-paired introuvable dans app/globals.css");
  }
  return Number(match[1]);
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

describe("contraste du thème sombre", () => {
  it("tient le niveau AA sur les cinq couleurs d'estimé", () => {
    for (const level of [1, 2, 3, 4, 5]) {
      const ratio = contrast(variable(`estimate-${level}-ink`), variable(`estimate-${level}-bg`));
      expect(ratio, `estimé ${level} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("tient le niveau AA sur le texte courant, sur le fond comme sur les surfaces", () => {
    for (const background of ["gd-void", "gd-surface", "gd-surface-raised"]) {
      for (const ink of ["gd-bone", "gd-bone-bright", "gd-bone-dim"]) {
        const ratio = contrast(variable(ink), variable(background));
        expect(ratio, `${ink} sur ${background} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
      }
    }
  });

  it("tient le niveau AA sur l'encre des boutons principaux", () => {
    const ratio = contrast(variable("gd-brass-ink"), variable("gd-brass"));
    expect(ratio, `${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  /**
   * Une ligne atténuée reste de l'information : le coach y lit encore les estimés du
   * joueur apparié. L'atténuation s'applique à l'encre comme au fond, et rapproche donc
   * les deux — c'est le cas le plus serré de toute l'interface.
   */
  it("tient le niveau AA même sur les lignes déjà appariées", () => {
    const alpha = pairedOpacity();
    const page = variable("gd-void");

    for (const level of [1, 2, 3, 4, 5]) {
      const ratio = contrast(
        over(variable(`estimate-${level}-ink`), page, alpha),
        over(variable(`estimate-${level}-bg`), page, alpha),
      );

      expect(ratio, `estimé ${level} atténué : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("tient le niveau AA sur les liens", () => {
    for (const background of ["gd-void", "gd-surface"]) {
      const ratio = contrast(variable("gd-brass-bright"), variable(background));
      expect(ratio, `lien sur ${background} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
    }
  });
});
