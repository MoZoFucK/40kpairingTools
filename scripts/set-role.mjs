#!/usr/bin/env node
/**
 * Attribue un rôle applicatif à un compte existant.
 *
 *   node scripts/set-role.mjs morgan@example.com COACH
 *
 * Utilise la clé secrète et contourne donc la RLS : c'est un outil d'administration, pas
 * un chemin applicatif. Les comptes naissent PLAYER (§9) ; la promotion est un acte
 * délibéré.
 *
 * Écrit en `fetch` plutôt qu'avec supabase-js : le SDK instancie un client Realtime au
 * démarrage, qui exige un `WebSocket` global absent avant Node 22. Un script
 * d'administration n'a besoin que de deux appels REST.
 */
import { readFileSync } from "node:fs";

const ROLES = ["PLAYER", "COACH", "ADMIN"];

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

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [email, role] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  fail(`Usage : node scripts/set-role.mjs <email> <${ROLES.join("|")}>`);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être renseignés dans .env.local.",
  );
}

const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

const usersResponse = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
if (!usersResponse.ok) {
  fail(`Impossible de lister les comptes (HTTP ${usersResponse.status}).`);
}

const { users } = await usersResponse.json();
const user = users.find((candidate) => candidate.email === email);

if (!user) {
  fail(`Aucun compte pour ${email}. Créer d'abord le compte depuis le dashboard Supabase.`);
}

const updateResponse = await fetch(
  `${url}/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}`,
  {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ role }),
  },
);

if (!updateResponse.ok) {
  fail(`Échec de la mise à jour (HTTP ${updateResponse.status}) : ${await updateResponse.text()}`);
}

const [updated] = await updateResponse.json();
if (!updated) {
  fail(`Aucun profil trouvé pour ${email}. La migration 0001 est-elle bien appliquée ?`);
}

console.log(`${email} est maintenant ${updated.role}.`);
