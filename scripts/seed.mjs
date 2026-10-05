#!/usr/bin/env node
/**
 * Seed de développement — cahier des charges §52 et §53.
 *
 *   node scripts/seed.mjs [--coach <email>] [--player <email>] [--name "<tournoi>"]
 *
 * Avec `--player`, le compte indiqué est rattaché à une fiche joueur et **ses estimés sont
 * laissés vides** : c'est précisément ce qu'il faut pour recetter l'écran de saisie. Les
 * estimés des autres joueurs sont remplis, la matrice du coach reste donc réaliste.
 *
 * Crée un tournoi complet et réaliste : une équipe de 6, une équipe adverse de 6 avec
 * listes et règles, une ronde, et une matrice d'estimés entièrement remplie. De quoi
 * ouvrir n'importe quel écran sans rien saisir à la main.
 *
 * Les données sont volontairement fictives (§53) : aucun nom réel, aucune donnée
 * personnelle. Les pseudonymes sont des noms d'armée ou des étiquettes neutres.
 *
 * Le script est rejouable : il supprime le tournoi de démonstration existant avant de le
 * recréer. Il n'efface jamais rien d'autre.
 *
 * Écrit en `fetch` plutôt qu'avec supabase-js, comme scripts/set-role.mjs : un outil
 * d'administration n'a besoin que de quelques appels REST.
 */
import { readFileSync } from "node:fs";

const DEFAULT_TOURNAMENT_NAME = "Tournoi de démonstration";

const OUR_PLAYERS = [
  { name: "Alpha", army: "Dark Angels", detachment: "Gladius Task Force" },
  { name: "Bravo", army: "Necrons", detachment: "Awakened Dynasty" },
  { name: "Charlie", army: "Thousand Sons", detachment: "Cult of Magic" },
  { name: "Delta", army: "Tyranides", detachment: "Invasion Fleet" },
  { name: "Echo", army: "Astra Militarum", detachment: "Combined Regiment" },
  { name: "Foxtrot", army: "T'au", detachment: "Kauyon" },
];

const OPPONENT_PLAYERS = [
  {
    name: "Opposant 1",
    army: "Necrons",
    detachment: "Awakened Dynasty",
    list_name: "Phalange silencieuse",
    list_content:
      "Personnages\nSeigneur de la dynastie\nTechnomancien\nCryptek\n\nUnités\n20 Guerriers\n10 Immortels\n6 Spectres\n3 Scarabées lourds",
  },
  {
    name: "Opposant 2",
    army: "Ultramarines",
    detachment: "Gladius Task Force",
    list_name: "Lance d'azur",
    list_content:
      "Personnages\nCapitaine en armure Gravis\nBibliothécaire\n\nUnités\n10 Intercessors\n5 Aggressors\n3 Eradicators\n1 Repulsor",
  },
  {
    name: "Opposant 3",
    army: "Orks",
    detachment: "War Horde",
    list_name: "Vague verte",
    list_content:
      "Personnages\nSeigneur de guerre\nMekano\n\nUnités\n30 Boyz\n10 Nobz\n6 Deffkoptas\n1 Gorkanaut",
  },
  {
    name: "Opposant 4",
    army: "Votann",
    detachment: "Hearthband",
    list_name: "Ligue minière",
    list_content:
      "Personnages\nGardien des cendres\nGrimnyr\n\nUnités\n20 Hearthkyn\n10 Hearthguard\n2 Sagitaur",
  },
  {
    name: "Opposant 5",
    army: "Death Guard",
    detachment: "Virulent Vectorium",
    list_name: "Marée de rouille",
    list_content:
      "Personnages\nSeigneur de la peste\nBiologus Putrifier\n\nUnités\n20 Plague Marines\n7 Blightlord Terminators\n1 Plagueburst Crawler",
  },
  {
    name: "Opposant 6",
    army: "Custodes",
    detachment: "Talons of the Emperor",
    list_name: "Garde dorée",
    list_content:
      "Personnages\nCapitaine-général\nShield-Captain en Allarus\n\nUnités\n10 Custodian Guard\n5 Allarus Custodians\n3 Vertus Praetors",
  },
];

const ARMY_RULES = [
  ["Necrons", "Protocoles de réanimation : les figurines détruites peuvent revenir en jeu."],
  ["Ultramarines", "Doctrines de combat : bonus offensif ou défensif selon la phase."],
  ["Orks", "Vague verte : plus l'unité est nombreuse, plus elle frappe fort."],
  ["Votann", "Jugement des ancêtres : marquage d'une cible pour la toucher plus sûrement."],
  ["Death Guard", "Contagion : affaiblit les unités ennemies à proximité."],
  ["Custodes", "Martyrs dorés : peu de figurines, mais chacune très résistante."],
];

const DETACHMENT_RULES = [
  ["Necrons", "Awakened Dynasty", "Relance des réanimations autour des personnages."],
  ["Ultramarines", "Gladius Task Force", "Ordres tactiques rejouables chaque tour."],
  ["Orks", "War Horde", "Charge renforcée pour les unités nombreuses."],
  ["Votann", "Hearthband", "Jugements supplémentaires à chaque tour."],
  ["Death Guard", "Virulent Vectorium", "Portée de contagion étendue."],
  ["Custodes", "Talons of the Emperor", "Sauvegardes améliorées contre les tirs."],
];

/** Matrice d'estimés, une ligne par joueur de notre équipe. Valeurs 1 à 5 (§10.5). */
const ESTIMATES = [
  [4, 4, 4, 3, 2, 4],
  [3, 4, 4, 4, 3, 2],
  [4, 2, 4, 3, 3, 2],
  [3, 5, 1, 4, 4, 4],
  [3, 2, 3, 4, 5, 1],
  [2, 3, 2, 4, 3, 4],
];

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

async function rest(method, path, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { ...headers, Prefer: "return=representation" },
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

// --- Coach propriétaire ------------------------------------------------------

function parseOptions(argv) {
  const options = {};
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--coach" || argument === "--player" || argument === "--name") {
      options[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      positional.push(argument);
    }
  }

  // Forme historique : `node scripts/seed.mjs <email-du-coach>`.
  options.coach ??= positional[0];
  return options;
}

const options = parseOptions(process.argv.slice(2));
const wantedEmail = options.coach;
const TOURNAMENT_NAME = options.name ?? DEFAULT_TOURNAMENT_NAME;
const profiles = await rest("GET", "profiles?select=user_id,email,role&role=in.(COACH,ADMIN)");

if (profiles.length === 0) {
  fail(
    "Aucun compte COACH ou ADMIN. Créer un compte puis lui attribuer un rôle :\n" +
      "  node scripts/set-role.mjs <email> COACH",
  );
}

const coach = wantedEmail
  ? profiles.find((profile) => profile.email === wantedEmail)
  : profiles[0];

if (!coach) {
  fail(`Aucun coach pour ${wantedEmail}. Comptes possibles : ${profiles.map((p) => p.email).join(", ")}`);
}

// --- Compte joueur à rattacher ----------------------------------------------

/**
 * Sans rattachement, un joueur connecté ne voit rien du tournoi : l'accès en lecture passe
 * par `players.user_id` (migration 0003). C'est donc le rattachement, et non le rôle, qui
 * ouvre l'accès.
 */
let linkedProfile = null;

if (options.player) {
  const [found] = await rest(
    "GET",
    `profiles?select=user_id,email&email=eq.${encodeURIComponent(options.player)}`,
  );
  if (!found) {
    fail(`Aucun compte pour ${options.player}. Le créer depuis le dashboard Supabase.`);
  }
  linkedProfile = found;
}

// --- Remise à zéro du tournoi de démonstration -------------------------------

const existing = await rest(
  "GET",
  `tournaments?select=id&name=eq.${encodeURIComponent(TOURNAMENT_NAME)}`,
);

for (const tournament of existing) {
  await rest("DELETE", `tournaments?id=eq.${tournament.id}`);
}

// --- Création ----------------------------------------------------------------

const tournament = await insertOne("tournaments", {
  name: TOURNAMENT_NAME,
  team_size: 6,
  created_by: coach.user_id,
});

const ourTeam = await insertOne("teams", {
  tournament_id: tournament.id,
  kind: "OUR_TEAM",
  name: "Notre équipe",
  short_name: "NOUS",
});

const opponentTeam = await insertOne("teams", {
  tournament_id: tournament.id,
  kind: "OPPONENT",
  name: "Équipe adverse",
  short_name: "EUX",
});

const ourPlayers = await rest(
  "POST",
  "players",
  OUR_PLAYERS.map((player, index) => ({
    ...player,
    team_id: ourTeam.id,
    // Le compte est rattaché à la première fiche de l'équipe.
    user_id: index === 0 && linkedProfile ? linkedProfile.user_id : null,
  })),
);

const opponentPlayers = await rest(
  "POST",
  "players",
  OPPONENT_PLAYERS.map((player) => ({ ...player, team_id: opponentTeam.id })),
);

// Les règles sont partagées entre tournois : on ne recrée que celles qui manquent.
const knownArmies = await rest("GET", "army_rules?select=army");
const knownKeys = new Set(knownArmies.map((row) => row.army.trim().toLowerCase()));
const missingArmyRules = ARMY_RULES.filter(([army]) => !knownKeys.has(army.toLowerCase()));

if (missingArmyRules.length > 0) {
  await rest(
    "POST",
    "army_rules",
    missingArmyRules.map(([army, rule]) => ({ army, rule })),
  );
}

const knownDetachments = await rest("GET", "detachment_rules?select=army,detachment");
const knownDetachmentKeys = new Set(
  knownDetachments.map((row) => `${row.army.trim().toLowerCase()}|${row.detachment.trim().toLowerCase()}`),
);
const missingDetachmentRules = DETACHMENT_RULES.filter(
  ([army, detachment]) =>
    !knownDetachmentKeys.has(`${army.toLowerCase()}|${detachment.toLowerCase()}`),
);

if (missingDetachmentRules.length > 0) {
  await rest(
    "POST",
    "detachment_rules",
    missingDetachmentRules.map(([army, detachment, rule]) => ({ army, detachment, rule })),
  );
}

await insertOne("rounds", {
  tournament_id: tournament.id,
  number: 1,
  opponent_team_id: opponentTeam.id,
  status: "ESTIMATES_OPEN",
});

/*
 * Les estimés du joueur rattaché sont laissés vides : c'est lui qui va les saisir pendant
 * la recette. Ceux des autres sont remplis, pour que la matrice du coach reste réaliste et
 * que l'indicateur d'avancement ait du sens.
 */
const estimates = [];
ourPlayers.forEach((ourPlayer, row) => {
  if (linkedProfile && row === 0) {
    return;
  }
  opponentPlayers.forEach((opponent, column) => {
    estimates.push({
      player_id: ourPlayer.id,
      opponent_player_id: opponent.id,
      value: ESTIMATES[row][column],
    });
  });
});

await rest("POST", "estimates", estimates);

console.log(`✓ « ${TOURNAMENT_NAME} » créé pour ${coach.email}`);
console.log(`  ${ourPlayers.length} joueurs, ${opponentPlayers.length} adversaires, ${estimates.length} estimés, 1 ronde.`);
if (linkedProfile) {
  console.log(
    `  ${linkedProfile.email} est rattaché à « ${OUR_PLAYERS[0].name} » (${OUR_PLAYERS[0].army}), ses estimés sont vides.`,
  );
  console.log(`  Connecte-toi avec ce compte, la ronde 1 est ouverte à la saisie.`);
} else {
  console.log(`  Rattache un compte joueur à une fiche depuis l'écran du tournoi pour tester la saisie.`);
}
