/**
 * Accès d'administration à Supabase pour les scripts — REST et clé secrète.
 *
 * Écrit en `fetch` plutôt qu'avec supabase-js, comme scripts/set-role.mjs : un outil
 * d'administration n'a besoin que de quelques appels REST.
 *
 * La clé secrète contourne la RLS. Ce module ne doit jamais être importé par
 * l'application : il ne sert qu'aux scripts lancés depuis un poste.
 */
import { readFileSync } from "node:fs";

export function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Variables du processus, complétées par `.env.local` sans jamais les écraser. */
function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !env[match[1]]) {
        env[match[1]] = match[2];
      }
    }
  } catch {
    // .env.local absent : on se rabat sur l'environnement du processus.
  }
  return env;
}

export function createAdminApi() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    fail("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être renseignés dans .env.local.");
  }

  const headers = {
    apikey: secret,
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  async function rest(method, path, body) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      fail(`${method} ${path} → HTTP ${response.status} : ${await response.text()}`);
    }

    const text = await response.text();
    return text.length > 0 ? JSON.parse(text) : [];
  }

  async function insertOne(table, row) {
    const [created] = await rest("POST", table, [row]);
    return created;
  }

  /**
   * Insère des lignes une par une, dans l'ordre.
   *
   * Les écrans trient les joueurs par `created_at`. Un insert groupé donne la même date à
   * toutes les lignes, et l'ordre d'affichage devient alors arbitraire — les colonnes de la
   * matrice ne suivent plus le roster. Une insertion par ligne garantit des dates
   * distinctes et croissantes.
   */
  async function insertInOrder(table, rows) {
    const created = [];
    for (const row of rows) {
      created.push(await insertOne(table, row));
    }
    return created;
  }

  return { url, rest, insertOne, insertInOrder };
}
