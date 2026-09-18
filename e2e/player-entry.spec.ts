import { expect, test } from "@playwright/test";
import { PLAYER, signIn } from "./helpers";

/**
 * Accès à la saisie des estimés — §34, §45.
 *
 * Un joueur ouvre l'application pour saisir ses estimés : ce chemin doit tenir en un clic
 * depuis le tableau de bord, sur téléphone comme sur poste.
 */
test("un joueur atteint la saisie en un clic depuis le tableau de bord", async ({ page }) => {
  await signIn(page, PLAYER);

  const entry = page.getByRole("link", { name: /Saisir mes estimés/ }).first();
  await expect(entry).toBeVisible();
  await entry.click();

  await expect(page.getByRole("heading", { name: /Mes estimés/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Estimé de 1 à 5" }).first()).toBeVisible();
});
