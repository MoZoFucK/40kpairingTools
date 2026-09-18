import { expect, type Page } from "@playwright/test";

/**
 * Comptes de test.
 *
 * Les identifiants viennent de l'environnement : un mot de passe n'a rien à faire dans le
 * dépôt, même pour des comptes de recette.
 */
export const COACH = {
  email: process.env.E2E_COACH_EMAIL ?? "",
  password: process.env.E2E_COACH_PASSWORD ?? "",
};

export const PLAYER = {
  email: process.env.E2E_PLAYER_EMAIL ?? "",
  password: process.env.E2E_PLAYER_PASSWORD ?? "",
};

export const DEMO_TOURNAMENT = "Tournoi de démonstration";

export function requireCredentials(account: { email: string; password: string }) {
  if (!account.email || !account.password) {
    throw new Error(
      "Identifiants de test absents. Renseigner E2E_COACH_EMAIL, E2E_COACH_PASSWORD, " +
        "E2E_PLAYER_EMAIL et E2E_PLAYER_PASSWORD (voir .env.example).",
    );
  }
}

export async function signIn(page: Page, account: { email: string; password: string }) {
  requireCredentials(account);

  await page.goto("/login");
  await page.getByLabel("Adresse e-mail").first().fill(account.email);
  await page.getByLabel("Mot de passe").fill(account.password);
  await page.getByRole("button", { name: "Se connecter" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
}

export async function openDemoTournament(page: Page) {
  await page.goto("/tournaments");
  await page.getByRole("link", { name: DEMO_TOURNAMENT }).click();
  await expect(page.getByRole("heading", { name: DEMO_TOURNAMENT })).toBeVisible();
}
