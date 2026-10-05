#!/usr/bin/env node
/**
 * Jeu de données de bêta-test, construit uniquement à partir du classeur de l'équipe.
 *
 *   node scripts/beta-dataset.mjs [classeur]           # affiche ce qui serait supprimé
 *   node scripts/beta-dataset.mjs [classeur] --yes     # remplace toutes les données
 *
 * Le classeur ne contient qu'un tournoi ; ses rondes sont réparties sur trois tournois qui
 * couvrent chacun un moment du cycle de vie, pour qu'un coach et un joueur puissent tout
 * tester :
 *
 *   « Retour L3 »             rondes 1, 2 et 5 — estimés, pairing et matchs du classeur,
 *                             rondes verrouillées : consultation seule.
 *   « Bêta — pairing en cours » ronde 4 — estimés complets, pairing non joué : le coach
 *                             le déroule lui-même.
 *   « Bêta — saisie initiale »  rondes 1 et 2 — équipes adverses saisies, estimés ouverts.
 *                             Les coéquipiers ont saisi les leurs, pas le joueur bêta.
 *                             La troisième équipe adverse reste à saisir par le coach :
 *                             une ronde ne peut pas exister sans adversaire.
 *
 * Le compte joueur est rattaché au même joueur dans les trois tournois. Dans le tournoi
 * en saisie, sa liste n'a ni détachement, ni contenu, ni disposition : à lui de la remplir.
 *
 * Le classeur date de la V10, où la disposition n'existait pas : chaque liste en reçoit
 * une tirée au hasard, chaque équipe couvrant les cinq (scripts/lib/dispositions.mjs).
 *
 * **Destructif.** Sans `--yes`, le script ne fait qu'afficher ce qu'il supprimerait. Avec,
 * il efface TOUS les tournois de la base et le référentiel de règles d'armée — rien de ce
 * qui n'est pas dans le classeur ne survit. Les comptes utilisateurs sont conservés.
 *
 * Variables facultatives :
 *   BETA_COACH_EMAIL   (défaut : coach@40kpairingtools.com)
 *   BETA_PLAYER_EMAIL  (défaut : joueur@40kpairingtools.com)
 *   BETA_PLAYER_NAME   (défaut : AtadiloTho Jérome, tel qu'écrit dans le classeur)
 */
import { createAdminApi, fail } from "./lib/admin-api.mjs";
import { drawTeamDispositions } from "./lib/dispositions.mjs";
import { readTeamWorkbook } from "./lib/team-workbook.mjs";

const args = process.argv.slice(2);
const confirmed = args.includes("--yes");
const filePath = args.find((arg) => !arg.startsWith("--")) ?? "Retour L3 - 40k.xlsx";

const COACH_EMAIL = process.env.BETA_COACH_EMAIL ?? "coach@40kpairingtools.com";
const PLAYER_EMAIL = process.env.BETA_PLAYER_EMAIL ?? "joueur@40kpairingtools.com";
const PLAYER_NAME = process.env.BETA_PLAYER_NAME ?? "AtadiloTho Jérome";
const OUR_TEAM_NAME = "ADLC";

const PAST_ROUNDS = [1, 2, 5];
const CURRENT_ROUND = 4;
const INITIAL_ROUNDS = [
  // Le statut décide de ce que le joueur peut faire ; les deux restent ouverts à la saisie.
  { number: 1, status: "ESTIMATES_OPEN" },
  { number: 2, status: "PREPARATION" },
];

const { rest, insertOne, insertInOrder } = createAdminApi();
const workbook = readTeamWorkbook(filePath);

// --- Vérifications, avant toute écriture --------------------------------------
//
// Tout ce qui peut échouer est contrôlé ici : une fois la base vidée, s'arrêter à mi-chemin
// laisserait les bêta-testeurs devant une application vide.

const roundByNumber = new Map(workbook.rounds.map((round) => [round.number, round]));
const neededRounds = [...new Set([...PAST_ROUNDS, CURRENT_ROUND, ...INITIAL_ROUNDS.map((r) => r.number)])];

for (const number of neededRounds) {
  if (!roundByNumber.has(number)) {
    fail(`La ronde ${number} est absente du classeur ou n'a aucun adversaire saisi.`);
  }
}

const ourLabels = new Set(workbook.ourPlayers.map((player) => player.label));

/** Pairing complet des rondes passées, lu une fois pour vérifier qu'il existe. */
const pastPairings = new Map();
for (const number of PAST_ROUNDS) {
  const round = roundByNumber.get(number);
  const opponentLabels = new Set(round.players.map((player) => player.label));
  const actions = workbook.readPairingActions(number);
  const matches = workbook.readFinalMatches(number, ourLabels, opponentLabels);

  if (!actions || !matches) {
    fail(`La feuille « Ronde ${number} » est incomplète : impossible d'en faire une ronde passée.`);
  }
  pastPairings.set(number, { actions, matches });
}

const betaPlayer = workbook.ourPlayers.find((player) => player.name === PLAYER_NAME);
if (!betaPlayer) {
  fail(
    `« ${PLAYER_NAME} » introuvable dans notre équipe. Joueurs du classeur : ` +
      workbook.ourPlayers.map((player) => player.name).join(", "),
  );
}

const profiles = await rest("GET", "profiles?select=user_id,email,role");
const coach = profiles.find((profile) => profile.email === COACH_EMAIL);
const playerAccount = profiles.find((profile) => profile.email === PLAYER_EMAIL);

if (!coach || !["COACH", "ADMIN"].includes(coach.role)) {
  fail(`${COACH_EMAIL} n'existe pas ou n'est pas COACH. Voir scripts/set-role.mjs.`);
}
if (!playerAccount) {
  fail(`${PLAYER_EMAIL} n'existe pas. Le compte doit avoir été créé avant.`);
}

// --- Ce qui va disparaître -----------------------------------------------------

const existing = await rest("GET", "tournaments?select=id,name&order=created_at.asc");
const armyRules = await rest("GET", "army_rules?select=army");
const detachmentRules = await rest("GET", "detachment_rules?select=army");

console.log(`Classeur : ${filePath}`);
console.log(`\nSeront supprimés :`);
console.log(`  ${existing.length} tournoi(s) : ${existing.map((t) => t.name).join(", ") || "aucun"}`);
console.log(`  ${armyRules.length} règle(s) d'armée, ${detachmentRules.length} règle(s) de détachement`);

if (!confirmed) {
  console.log(`\nRien n'a été modifié. Relancer avec --yes pour appliquer.`);
  process.exit(0);
}

// --- Remise à zéro ---------------------------------------------------------------

for (const tournament of existing) {
  await rest("DELETE", `tournaments?id=eq.${tournament.id}`);
}
// PostgREST refuse un DELETE sans filtre : celui-ci vise toutes les lignes.
await rest("DELETE", "detachment_rules?army=not.is.null");
await rest("DELETE", "army_rules?army=not.is.null");

// --- Construction ----------------------------------------------------------------

/**
 * Crée un tournoi avec notre équipe, et rattache le compte joueur à sa fiche.
 *
 * `blankPlayerList` vide la liste du joueur bêta au-delà de l'armée, seul champ
 * obligatoire : c'est lui qui doit la saisir.
 */
async function createTournament(name, { blankPlayerList = false } = {}) {
  const tournament = await insertOne("tournaments", {
    name,
    team_size: workbook.ourPlayers.length,
    created_by: coach.user_id,
  });

  const ourTeam = await insertOne("teams", {
    tournament_id: tournament.id,
    kind: "OUR_TEAM",
    name: OUR_TEAM_NAME,
  });

  const blankBeta = (player) => blankPlayerList && player.name === PLAYER_NAME;
  const drawn = drawTeamDispositions(
    workbook.ourPlayers.filter((player) => !blankBeta(player)).length,
  );

  const created = await insertInOrder(
    "players",
    workbook.ourPlayers.map((player) => {
      const isBeta = player.name === PLAYER_NAME;
      return {
        team_id: ourTeam.id,
        name: player.name,
        army: player.army,
        detachment: blankBeta(player) ? null : player.detachment,
        disposition: blankBeta(player) ? null : drawn.shift(),
        user_id: isBeta ? playerAccount.user_id : null,
      };
    }),
  );

  /** Étiquette du classeur → identifiant en base, propre à ce tournoi. */
  const idByLabel = new Map();
  workbook.ourPlayers.forEach((player, index) => {
    idByLabel.set(player.label, created[index].id);
  });

  return { tournament, idByLabel };
}

/**
 * Ajoute une ronde du classeur : équipe adverse, joueurs, ronde et estimés.
 *
 * `skipEstimatesOf` écarte les estimés d'un de nos joueurs — ceux que le joueur bêta doit
 * saisir lui-même.
 */
async function addRound({ tournament, idByLabel }, number, { skipEstimatesOf } = {}) {
  const round = roundByNumber.get(number);

  const team = await insertOne("teams", {
    tournament_id: tournament.id,
    kind: "OPPONENT",
    name: round.teamName || `Adversaire ronde ${number}`,
  });

  const dispositions = drawTeamDispositions(round.players.length);
  const opponents = await insertInOrder(
    "players",
    round.players.map((player, index) => ({
      team_id: team.id,
      name: player.name,
      army: player.army,
      detachment: player.detachment,
      disposition: dispositions[index],
    })),
  );
  round.players.forEach((player, index) => {
    idByLabel.set(player.label, opponents[index].id);
  });

  const created = await insertOne("rounds", {
    tournament_id: tournament.id,
    number,
    opponent_team_id: team.id,
    // Statut d'attente : chaque appelant pose le statut final une fois ses écritures faites.
    status: "ESTIMATES_LOCKED",
  });

  const rows = [];
  for (const opponent of round.players) {
    for (const [playerLabel, value] of workbook.estimates.get(opponent.label) ?? []) {
      if (playerLabel === skipEstimatesOf) {
        continue;
      }
      rows.push({
        player_id: idByLabel.get(playerLabel),
        opponent_player_id: idByLabel.get(opponent.label),
        value,
      });
    }
  }
  if (rows.length > 0) {
    await rest("POST", "estimates", rows);
  }

  return { round: created, estimateCount: rows.length };
}

async function setStatus(round, status) {
  await rest("PATCH", `rounds?id=eq.${round.id}`, { status });
}

const report = [];

// Tournoi passé ------------------------------------------------------------------

const past = await createTournament("Retour L3");
for (const number of PAST_ROUNDS) {
  const { round, estimateCount } = await addRound(past, number);
  const { actions, matches } = pastPairings.get(number);

  await rest(
    "POST",
    "pairing_actions",
    actions.map((action, sequence) => ({
      round_id: round.id,
      sequence,
      type: action.type,
      side: action.side,
      player_ids: action.labels.map((label) => past.idByLabel.get(label)),
    })),
  );
  await rest(
    "POST",
    "matches",
    matches.map((match) => ({
      round_id: round.id,
      our_player_id: past.idByLabel.get(match.ourLabel),
      opponent_player_id: past.idByLabel.get(match.opponentLabel),
      origin: match.origin,
      step_index: match.stepIndex,
    })),
  );

  // Verrouillée en dernier : une ronde verrouillée n'accepte plus aucune écriture.
  await setStatus(round, "LOCKED");
  report.push(`Retour L3 · ronde ${number} : ${estimateCount} estimés, ${matches.length} matchs, verrouillée`);
}

// Tournoi en cours ------------------------------------------------------------------

const current = await createTournament("Bêta — pairing en cours");
{
  const { round, estimateCount } = await addRound(current, CURRENT_ROUND);
  await setStatus(round, "PAIRING");
  report.push(`Bêta — pairing en cours · ronde ${CURRENT_ROUND} : ${estimateCount} estimés, pairing à jouer`);
}

// Tournoi en saisie initiale ----------------------------------------------------------

const initial = await createTournament("Bêta — saisie initiale", { blankPlayerList: true });
for (const { number, status } of INITIAL_ROUNDS) {
  const { round, estimateCount } = await addRound(initial, number, {
    skipEstimatesOf: betaPlayer.label,
  });
  await setStatus(round, status);
  report.push(
    `Bêta — saisie initiale · ronde ${number} : ${estimateCount} estimés (sans ${PLAYER_NAME}), ${status}`,
  );
}

console.log(`\n✓ Jeu de bêta construit pour ${COACH_EMAIL}, ${PLAYER_EMAIL} rattaché à ${PLAYER_NAME}`);
for (const line of report) {
  console.log(`  ${line}`);
}
