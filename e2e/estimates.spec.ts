import { expect, test } from "@playwright/test";
import { COACH, signIn } from "./helpers";

/**
 * Saisie des estimés — §18, §45.
 *
 * Ce fichier tourne aussi sur le projet « mobile » de playwright.config.ts : c'est le seul
 * écran que les joueurs utilisent au téléphone, il doit y être praticable.
 */
test.describe("écran de saisie des estimés", () => {
  test("reste utilisable et sans débordement horizontal", async ({ page }) => {
    await signIn(page, COACH);

    await page.goto("/tournaments");
    await page.getByRole("link", { name: "Tournoi de démonstration" }).click();
    await page.getByRole("link", { name: "Rondes" }).click();
    await page.getByRole("link", { name: "Mes estimés" }).first().click();

    await expect(page.getByRole("heading", { name: /Mes estimés/ })).toBeVisible();

    // Le coach du seed n'est rattaché à aucune fiche joueur : l'écran doit le dire
    // clairement plutôt que d'afficher une page vide (§37).
    const notice = page.getByText(/n'est rattaché à aucune fiche joueur/);
    const pickers = page.getByRole("group", { name: "Estimé de 1 à 5" });

    expect((await notice.count()) + (await pickers.count())).toBeGreaterThan(0);

    // §45 : aucun défilement horizontal, sur mobile comme sur desktop.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
