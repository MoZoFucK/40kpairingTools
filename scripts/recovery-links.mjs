#!/usr/bin/env node
/**
 * Génère un lien personnel de choix du mot de passe, sans envoyer d'e-mail.
 *
 *   node scripts/recovery-links.mjs                      # tous les comptes
 *   node scripts/recovery-links.mjs a@x.fr b@y.fr        # seulement ceux-là
 *   node scripts/recovery-links.mjs --site http://localhost:3000 a@x.fr
 *
 * Pensé pour le premier accès : les comptes sont créés avec un mot de passe que personne
 * ne connaît, et le service d'e-mails intégré de Supabase est limité à quelques envois
 * par heure. Le lien est transmis à la main (MP Discord) et mène, via /auth/confirm, à la
 * page /compte/mot-de-passe.
 *
 * Chaque lien ne sert qu'une fois et expire selon « Email OTP Expiration » (1 h par
 * défaut). Il ouvre le compte à quiconque le suit en premier : à envoyer en privé
 * uniquement. Générer un nouveau lien pour un compte invalide le précédent.
 *
 * Sortie : une ligne `email<TAB>lien` par compte, à coller telle quelle dans la page des
 * messages Discord.
 *
 * Écrit en `fetch`, comme scripts/set-role.mjs.
 */
import { readFileSync } from "node:fs";

const DEFAULT_SITE = "https://40kpairing-tools.vercel.app";

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

const args = process.argv.slice(2);
let site = DEFAULT_SITE;
const emails = [];

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--site") {
    site = args[index + 1] ?? fail("--site attend une adresse.");
    index += 1;
  } else {
    emails.push(args[index].trim().toLowerCase());
  }
}

site = site.replace(/\/+$/, "");

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
};

if (emails.length === 0) {
  const response = await fetch(`${url}/rest/v1/profiles?select=email&order=email`, { headers });
  if (!response.ok) {
    fail(`Lecture des comptes → HTTP ${response.status} : ${await response.text()}`);
  }
  for (const row of await response.json()) {
    if (row.email) {
      emails.push(row.email);
    }
  }
}

let failures = 0;

for (const email of emails) {
  // L'API d'administration génère le jeton sans rien envoyer.
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "recovery", email }),
  });

  const body = await response.json().catch(() => ({}));
  const tokenHash = body.hashed_token ?? body.properties?.hashed_token;

  if (!response.ok || !tokenHash) {
    failures += 1;
    console.error(`${email}\tÉCHEC (HTTP ${response.status}) ${body.msg ?? body.message ?? ""}`);
    continue;
  }

  const link = `${site}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  console.log(`${email}\t${link}`);
}

console.error(
  `\n${emails.length - failures} lien(s) générés. Usage unique, expiration selon le réglage ` +
    "« Email OTP Expiration » de Supabase (1 h par défaut). À envoyer en MP uniquement.",
);

if (failures > 0) {
  process.exit(1);
}
