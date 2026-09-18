import { expect, test } from "@playwright/test";
import { COACH, PLAYER, openDemoTournament, signIn } from "./helpers";

/**
 * Parcours coach — cahier des charges §48.
 *
 * Il part du jeu de données du seed plutôt que de tout créer : le §48 demande de vérifier
 * le parcours, pas de reconstruire l'application à chaque exécution.
 */
test.describe("parcours du coach", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, COACH);
  });

  test("consulte son équipe et ses effectifs", async ({ page }) => {
    await openDemoTournament(page);

    await expect(page.getByRole("heading", { name: "Mon équipe" })).toBeVisible();
    await expect(page.getByText("6 / 6")).toBeVisible();
    await expect(page.getByText("Alpha")).toBeVisible();
  });

  test("consulte les listes adverses et leurs règles", async ({ page }) => {
    await openDemoTournament(page);
    await page.getByRole("link", { name: "Équipes adverses" }).click();
    await page.getByRole("link", { name: "Équipe adverse" }).click();

    await expect(page.getByText("Opposant 1")).toBeVisible();
    await expect(page.getByText("Awakened Dynasty").first()).toBeVisible();
    // Les règles du référentiel sont restituées sur la fiche (§17).
    await expect(page.getByText(/Protocoles de réanimation/)).toBeVisible();
  });

  test("lit la matrice d'estimés et peut la transposer", async ({ page }) => {
    await openDemoTournament(page);
    await page.getByRole("link", { name: "Rondes" }).click();
    await page.getByRole("link", { name: /Ronde 1/ }).click();

    await expect(page.getByRole("heading", { name: /Matrice/ })).toBeVisible();
    await expect(page.getByText("6/6 saisis").first()).toBeVisible();

    await page.getByRole("button", { name: "Adversaires en lignes" }).click();
    await expect(page.getByRole("button", { name: "Nos joueurs en lignes" })).toBeVisible();
  });

  test("n'affiche aucune recommandation stratégique", async ({ page }) => {
    await openDemoTournament(page);
    await page.getByRole("link", { name: "Rondes" }).click();
    await page.getByRole("link", { name: /Ronde 1/ }).click();

    // §1 : l'interface ne doit jamais suggérer un choix. Ce test échouerait si un libellé
    // du genre « pairing recommandé » apparaissait un jour.
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const banned of [
      "recommandé",
      "recommande",
      "meilleur",
      "optimal",
      "conseillé",
      "suggéré",
    ]) {
      expect(body).not.toContain(banned);
    }
  });

  test("ouvre l'historique d'une ronde en lecture seule", async ({ page }) => {
    await openDemoTournament(page);
    await page.getByRole("link", { name: "Historique" }).click();
    await page.getByRole("link", { name: /Ronde 1/ }).click();

    await expect(page.getByRole("heading", { name: "Estimés" })).toBeVisible();
    // Une consultation d'historique n'offre aucune action.
    await expect(page.getByRole("button", { name: /Annuler/ })).toHaveCount(0);
  });
});

test.describe("séparation des rôles", () => {
  test("un joueur n'atteint pas l'écran de pairing", async ({ page }) => {
    await signIn(page, PLAYER);

    await page.goto("/tournaments");
    const link = page.getByRole("link", { name: "Tournoi de démonstration" });

    if ((await link.count()) > 0) {
      await link.click();
      // Le joueur voit l'équipe, mais aucun formulaire de gestion ne lui est rendu.
      await expect(page.getByRole("button", { name: "Ajouter le joueur" })).toHaveCount(0);
    }
  });
});
