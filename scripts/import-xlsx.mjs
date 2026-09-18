#!/usr/bin/env node
/**
 * Import du classeur de l'équipe dans la base.
 *
 *   node scripts/import-xlsx.mjs "Retour L3 - 40k.xlsx" [email-du-coach]
 *
 * Charge le tournoi complet : notre équipe, les équipes adverses rencontrées, leurs
 * listes, les rondes avec leur scénario, la matrice d'estimés, et le déroulé du pairing
 * quand la feuille de ronde est complète.
 *
 * Le script est rejouable : il remplace le tournoi portant le même nom, et ne touche à
 * rien d'autre.
 *
 * Il n'écrit un pairing que si le moteur (`lib/pairing/`) accepte la séquence d'actions
 * reconstituée et aboutit exactement aux matchs inscrits dans le classeur. Une feuille
 * incomplète ou incohérente est signalée puis ignorée : mieux vaut une ronde sans pairing
 * qu'un pairing inventé.
 */
import { readFileSync } from "node:fs";
import { cell, readWorkbook } from "./lib/xlsx.mjs";

// --- Configuration -----------------------------------------------------------

const [, , filePath = "Retour L3 - 40k.xlsx", wantedEmail] = process.argv;
const TOURNAMENT_NAME = process.env.IMPORT_TOURNAMENT_NAME ?? "Retour L3";
const OUR_TEAM_NAME = process.env.IMPORT_TEAM_NAME ?? "ADLC";

/** Lignes du classeur, repérées une fois pour toutes. */
const ROSTER_OUR_ROWS = [3, 4, 5, 6, 7, 8];
const ROSTER_OPPONENT_FIRST_ROW = 13;
const ROSTER_OPPONENT_LAST_ROW = 42;
const ESTIMATES_FIRST_ROW = 3;
const ESTIMATES_LAST_ROW = 32;
const ESTIMATE_COLUMNS = ["E", "F", "G", "H", "I", "J"];

/**
 * Cellules d'une étape de pairing, dans « Ronde N ».
 *
 * `defender` = le défenseur du camp qui reçoit les attaques ; `attackers` = les deux
 * propositions et leur colonne « Retenu ».
 */
const PAIRING_STEPS = [
  {
    them: { defender: "B24", attackers: [["B25", "C25"], ["B26", "C26"]] },
    us: { defender: "B34", attackers: [["B35", "C35"], ["B36", "C36"]] },
  },
  {
    them: { defender: "B45", attackers: [["B46", "C46"], ["B47", "C47"]] },
    us: { defender: "B55", attackers: [["B56", "C56"], ["B57", "C57"]] },
  },
];

// --- Environnement -----------------------------------------------------------

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
  console.error(`✗ ${message}`);
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

// --- Lecture du classeur -----------------------------------------------------

const workbook = readWorkbook(filePath);

/**
 * Sépare « Necrons - wakened Dynasty » en armée et détachement.
 *
 * Le classeur les concatène avec un tiret ; certaines lignes n'ont pas de détachement.
 * Aucune normalisation des libellés n'est tentée : ce qui est saisi est conservé (§42).
 */
function splitArmy(label) {
  const separator = label.indexOf(" - ");
  if (separator === -1) {
    return { army: label.trim(), detachment: null };
  }
  return {
    army: label.slice(0, separator).trim(),
    detachment: label.slice(separator + 3).trim() || null,
  };
}

function readOurPlayers() {
  const sheet = workbook.sheet("Rosters");
  const players = [];

  for (const row of ROSTER_OUR_ROWS) {
    const armyLabel = cell(sheet, `B${row}`);
    const name = cell(sheet, `C${row}`);
    if (armyLabel === "" || name === "") {
      continue;
    }
    const { army, detachment } = splitArmy(armyLabel);
    // La colonne D du classeur compose « Armée (Joueur) » : c'est cette étiquette qui
    // sert de clé dans les autres feuilles.
    players.push({ name, army, detachment, label: `${armyLabel} (${name})` });
  }

  return players;
}

function readRounds() {
  const sheet = workbook.sheet("Rosters");
  const rounds = new Map();

  for (let row = ROSTER_OPPONENT_FIRST_ROW; row <= ROSTER_OPPONENT_LAST_ROW; row += 1) {
    const number = Number(cell(sheet, `A${row}`));
    const armyLabel = cell(sheet, `B${row}`);
    const name = cell(sheet, `C${row}`);

    if (!Number.isFinite(number) || number <= 0) {
      continue;
    }

    if (!rounds.has(number)) {
      rounds.set(number, { number, teamName: "", scenario: null, players: [] });
    }
    const round = rounds.get(number);

    // Nom d'équipe et scénario ne figurent que sur la première ligne de la ronde.
    const teamName = cell(sheet, `F${row}`);
    if (teamName !== "") {
      round.teamName = teamName;
    }
    const scenario = cell(sheet, `G${row}`);
    if (scenario !== "") {
      round.scenario = scenario;
    }

    if (armyLabel === "" || name === "") {
      continue;
    }
    const { army, detachment } = splitArmy(armyLabel);
    round.players.push({ name, army, detachment, label: `${armyLabel} (${name})` });
  }

  // Une ronde sans adversaire saisi n'a rien à importer (rondes non jouées).
  return [...rounds.values()].filter((round) => round.players.length > 0);
}

/** Estimés, indexés `étiquette adverse → étiquette de notre joueur → valeur`. */
function readEstimates(ourPlayers) {
  const sheet = workbook.sheet("Estimes");
  const byColumn = new Map();

  for (const column of ESTIMATE_COLUMNS) {
    const header = cell(sheet, `${column}2`);
    const player = ourPlayers.find((candidate) => candidate.label === header);
    if (player) {
      byColumn.set(column, player.label);
    }
  }

  const estimates = new Map();

  for (let row = ESTIMATES_FIRST_ROW; row <= ESTIMATES_LAST_ROW; row += 1) {
    const opponentLabel = cell(sheet, `B${row}`);
    if (opponentLabel === "" || opponentLabel === "()") {
      continue;
    }

    const perPlayer = new Map();
    for (const [column, playerLabel] of byColumn) {
      const raw = cell(sheet, `${column}${row}`);
      const value = Math.round(Number(raw));
      if (Number.isFinite(value) && value >= 1 && value <= 5) {
        perPlayer.set(playerLabel, value);
      }
    }

    if (perPlayer.size > 0) {
      estimates.set(opponentLabel, perPlayer);
    }
  }

  return estimates;
}

/**
 * Séquence d'actions d'une ronde, reconstituée depuis sa feuille.
 *
 * Retourne `null` si la feuille est absente ou incomplète — c'est le cas des rondes
 * préparées mais non jouées.
 */
function readPairingActions(roundNumber) {
  const sheet = workbook.sheet(`Ronde ${roundNumber}`);
  if (!sheet) {
    return null;
  }

  const actions = [];

  for (const step of PAIRING_STEPS) {
    const ourDefender = cell(sheet, step.us.defender);
    const theirDefender = cell(sheet, step.them.defender);

    const read = (pairs) =>
      pairs.map(([nameRef, keptRef]) => ({
        label: cell(sheet, nameRef),
        kept: cell(sheet, keptRef).toLowerCase() === "oui",
      }));

    const ourAttackers = read(step.them.attackers);
    const theirAttackers = read(step.us.attackers);

    const filled =
      ourDefender !== "" &&
      theirDefender !== "" &&
      ourAttackers.every((entry) => entry.label !== "") &&
      theirAttackers.every((entry) => entry.label !== "") &&
      ourAttackers.filter((entry) => entry.kept).length === 1 &&
      theirAttackers.filter((entry) => entry.kept).length === 1;

    if (!filled) {
      return null;
    }

    actions.push(
      { type: "SELECT_DEFENDER", side: "US", labels: [ourDefender] },
      { type: "SELECT_DEFENDER", side: "THEM", labels: [theirDefender] },
      {
        type: "PROPOSE_ATTACKERS",
        side: "THEM",
        labels: ourAttackers.map((entry) => entry.label),
      },
      {
        type: "PROPOSE_ATTACKERS",
        side: "US",
        labels: theirAttackers.map((entry) => entry.label),
      },
      {
        type: "RETAIN_ATTACKER",
        side: "THEM",
        labels: [ourAttackers.find((entry) => entry.kept).label],
      },
      {
        type: "RETAIN_ATTACKER",
        side: "US",
        labels: [theirAttackers.find((entry) => entry.kept).label],
      },
    );
  }

  return actions;
}

// --- Matchs finaux -----------------------------------------------------------

/**
 * Bloc « Résumé Ronde » : chaque match occupe deux lignes, une par joueur, suivies de sa
 * table. Les sections « Rejetés » et « Oubliés » désignent les deux derniers matchs.
 */
const MATCH_BLOCKS = [
  { rows: ["B73", "B74"], table: "B75", origin: "SELECTED", stepIndex: 0 },
  { rows: ["B76", "B77"], table: "B78", origin: "SELECTED", stepIndex: 0 },
  { rows: ["B79", "B80"], table: "B81", origin: "SELECTED", stepIndex: 1 },
  { rows: ["B82", "B83"], table: "B84", origin: "SELECTED", stepIndex: 1 },
  { rows: ["B86", "B87"], table: "B88", origin: "REJECTED_PAIR", stepIndex: 1 },
  { rows: ["B90", "B91"], table: "B92", origin: "REMAINING_PAIR", stepIndex: 1 },
];

/**
 * Matchs d'une ronde, lus tels qu'ils sont inscrits dans le classeur.
 *
 * Aucune règle de pairing n'est rejouée ici : ce script transcrit, il ne déduit pas. Le
 * moteur de l'application reste la seule implémentation du protocole, et c'est lui qui
 * rejouera le journal quand le coach ouvrira l'écran de pairing.
 *
 * Retourne `null` si le résumé est incomplet.
 */
function readFinalMatches(roundNumber, ourLabels, opponentLabels) {
  const sheet = workbook.sheet(`Ronde ${roundNumber}`);
  if (!sheet) {
    return null;
  }

  const matches = [];

  for (const block of MATCH_BLOCKS) {
    const labels = block.rows.map((reference) => cell(sheet, reference));
    if (labels.some((label) => label === "" || label.startsWith("#"))) {
      return null;
    }

    const ourLabel = labels.find((label) => ourLabels.has(label));
    const opponentLabel = labels.find((label) => opponentLabels.has(label));

    // Chaque match doit opposer exactement un joueur de chaque camp.
    if (!ourLabel || !opponentLabel) {
      return null;
    }

    const table = Number(cell(sheet, block.table));

    matches.push({
      ourLabel,
      opponentLabel,
      origin: block.origin,
      stepIndex: block.stepIndex,
      table: Number.isInteger(table) && table > 0 ? table : null,
    });
  }

  // Un joueur n'apparaît qu'une fois, de chaque côté (§31).
  const ourUsed = new Set(matches.map((match) => match.ourLabel));
  const opponentUsed = new Set(matches.map((match) => match.opponentLabel));
  if (ourUsed.size !== matches.length || opponentUsed.size !== matches.length) {
    return null;
  }

  return matches;
}

// --- Import ------------------------------------------------------------------

const ourPlayers = readOurPlayers();
const rounds = readRounds();
const estimates = readEstimates(ourPlayers);

if (ourPlayers.length === 0) {
  fail("Aucun joueur trouvé dans l'onglet « Rosters ».");
}

console.log(`Classeur : ${filePath}`);
console.log(`  ${ourPlayers.length} joueurs, ${rounds.length} rondes renseignées.`);

const profiles = await rest("GET", "profiles?select=user_id,email,role&role=in.(COACH,ADMIN)");
if (profiles.length === 0) {
  fail("Aucun compte COACH ou ADMIN. Utiliser d'abord : node scripts/set-role.mjs <email> COACH");
}

const coach = wantedEmail
  ? profiles.find((profile) => profile.email === wantedEmail)
  : profiles[0];

if (!coach) {
  fail(`Aucun coach pour ${wantedEmail}. Comptes possibles : ${profiles.map((p) => p.email).join(", ")}`);
}

const existing = await rest(
  "GET",
  `tournaments?select=id&name=eq.${encodeURIComponent(TOURNAMENT_NAME)}`,
);
for (const tournament of existing) {
  await rest("DELETE", `tournaments?id=eq.${tournament.id}`);
}

const tournament = await insertOne("tournaments", {
  name: TOURNAMENT_NAME,
  team_size: ourPlayers.length,
  created_by: coach.user_id,
});

const ourTeam = await insertOne("teams", {
  tournament_id: tournament.id,
  kind: "OUR_TEAM",
  name: OUR_TEAM_NAME,
});

const createdOurPlayers = await rest(
  "POST",
  "players",
  ourPlayers.map((player) => ({
    team_id: ourTeam.id,
    name: player.name,
    army: player.army,
    detachment: player.detachment,
  })),
);

/** Étiquette du classeur → identifiant en base. */
const idByLabel = new Map();
ourPlayers.forEach((player, index) => {
  idByLabel.set(player.label, createdOurPlayers[index].id);
});

const ourIds = createdOurPlayers.map((player) => player.id);
let estimateCount = 0;
const pairingReport = [];

for (const round of rounds) {
  const opponentTeam = await insertOne("teams", {
    tournament_id: tournament.id,
    kind: "OPPONENT",
    name: round.teamName || `Adversaire ronde ${round.number}`,
  });

  const createdOpponents = await rest(
    "POST",
    "players",
    round.players.map((player) => ({
      team_id: opponentTeam.id,
      name: player.name,
      army: player.army,
      detachment: player.detachment,
    })),
  );

  const opponentIds = createdOpponents.map((player) => player.id);
  round.players.forEach((player, index) => {
    idByLabel.set(player.label, createdOpponents[index].id);
  });

  const createdRound = await insertOne("rounds", {
    tournament_id: tournament.id,
    number: round.number,
    opponent_team_id: opponentTeam.id,
    scenario: round.scenario,
    status: "ESTIMATES_LOCKED",
  });

  // Estimés de la ronde.
  const rows = [];
  for (const opponent of round.players) {
    const perPlayer = estimates.get(opponent.label);
    if (!perPlayer) {
      continue;
    }
    for (const [playerLabel, value] of perPlayer) {
      const playerId = idByLabel.get(playerLabel);
      const opponentId = idByLabel.get(opponent.label);
      if (playerId && opponentId) {
        rows.push({ player_id: playerId, opponent_player_id: opponentId, value });
      }
    }
  }
  if (rows.length > 0) {
    await rest("POST", "estimates", rows);
    estimateCount += rows.length;
  }

  // Pairing de la ronde, s'il est complet.
  const ourLabels = new Set(ourPlayers.map((player) => player.label));
  const opponentLabels = new Set(round.players.map((player) => player.label));

  const rawActions = readPairingActions(round.number);
  const matches = readFinalMatches(round.number, ourLabels, opponentLabels);

  if (!rawActions || !matches) {
    pairingReport.push(
      `ronde ${round.number} : feuille absente ou incomplète, pairing non importé`,
    );
    continue;
  }

  const unknown = [
    ...rawActions.flatMap((action) => action.labels),
    ...matches.flatMap((match) => [match.ourLabel, match.opponentLabel]),
  ].filter((label) => !idByLabel.has(label));

  if (unknown.length > 0) {
    pairingReport.push(
      `ronde ${round.number} : joueurs introuvables (${[...new Set(unknown)].join(", ")}), pairing non importé`,
    );
    continue;
  }

  if (matches.length !== ourIds.length || matches.length !== opponentIds.length) {
    pairingReport.push(
      `ronde ${round.number} : ${matches.length} matchs pour ${ourIds.length} joueurs, pairing non importé`,
    );
    continue;
  }

  await rest(
    "POST",
    "pairing_actions",
    rawActions.map((action, sequence) => ({
      round_id: createdRound.id,
      sequence,
      type: action.type,
      side: action.side,
      player_ids: action.labels.map((label) => idByLabel.get(label)),
    })),
  );

  await rest(
    "POST",
    "matches",
    matches.map((match) => ({
      round_id: createdRound.id,
      our_player_id: idByLabel.get(match.ourLabel),
      opponent_player_id: idByLabel.get(match.opponentLabel),
      origin: match.origin,
      step_index: match.stepIndex,
      table_number: match.table,
    })),
  );

  await rest("PATCH", `rounds?id=eq.${createdRound.id}`, { status: "COMPLETED" });
  pairingReport.push(`ronde ${round.number} : pairing importé (${matches.length} matchs)`);
}

console.log(`\n✓ « ${TOURNAMENT_NAME} » importé pour ${coach.email}`);
console.log(`  ${ourPlayers.length} joueurs, ${rounds.length} équipes adverses, ${estimateCount} estimés.`);
for (const line of pairingReport) {
  console.log(`  ${line}`);
}
