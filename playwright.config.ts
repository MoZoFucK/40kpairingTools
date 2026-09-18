import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout — cahier des charges §48.
 *
 * Ils tournent contre le projet Supabase réel, sur le jeu de données du seed : le §3.2
 * exclut Docker, donc pas de base jetable locale. Les tests ne modifient que le tournoi de
 * démonstration, recréé par `npm run seed`.
 *
 * Ils ne sont pas lancés à chaque PR (§49) : `npm test` couvre le métier, ceux-ci
 * vérifient le parcours et coûtent bien plus cher.
 */
/**
 * Navigateur piloté. Par défaut le Chrome déjà installé sur la machine plutôt que le
 * binaire téléchargé par Playwright : `playwright install` passe par `cdn.playwright.dev`,
 * que certains réseaux d'entreprise bloquent. Mettre `E2E_BROWSER_CHANNEL=` (vide) pour
 * revenir au navigateur embarqué de Playwright.
 */
const BROWSER = process.env.E2E_BROWSER_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    trace: "on-first-retry",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: BROWSER } },
    // Les joueurs saisissent leurs estimés au téléphone (§45) : le parcours doit y passer.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: BROWSER },
      testMatch: /estimates\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
