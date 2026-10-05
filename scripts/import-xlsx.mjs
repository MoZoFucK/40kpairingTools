#!/usr/bin/env node
/**
 * Import du classeur de l'équipe dans la base.
 *
 *   node scripts/import-xlsx.mjs "Retour L3 - 40k.xlsx" [email-du-coach]
 *
 * Charge le tournoi complet : notre équipe, les équipes adverses rencontrées, leurs
 * listes, les rondes, la matrice d'estimés, et le déroulé du pairing
 * quand la feuille de ronde est complète.
 *
 * Le script est rejouable : il remplace le tournoi portant le même nom, et ne touche à
 * rien d'autre.
 *
 * Il n'écrit un pairing que si la feuille de ronde est complète : défenseurs, attaquants,
 * retenus et résumé des six matchs, chaque joueur n'apparaissant qu'une fois. Une feuille
 * incomplète ou incohérente est signalée puis ignorée : mieux vaut une ronde sans pairing
 * qu'un pairing inventé. Le script ne rejoue pas le protocole — il transcrit.
 *
 * La lecture du classeur vit dans scripts/lib/team-workbook.mjs.
 */
import { createAdminApi, fail } from "./lib/admin-api.mjs";
import { readTeamWorkbook } from "./lib/team-workbook.mjs";

const [, , filePath = "Retour L3 - 40k.xlsx", wantedEmail] = process.argv;
const TOURNAMENT_NAME = process.env.IMPORT_TOURNAMENT_NAME ?? "Retour L3";
const OUR_TEAM_NAME = process.env.IMPORT_TEAM_NAME ?? "ADLC";

const { rest, insertOne, insertInOrder } = createAdminApi();
const workbook = readTeamWorkbook(filePath);

// --- Import ------------------------------------------------------------------

const { ourPlayers, rounds, estimates } = workbook;

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

const createdOurPlayers = await insertInOrder(
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

  const createdOpponents = await insertInOrder(
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

  const rawActions = workbook.readPairingActions(round.number);
  const matches = workbook.readFinalMatches(round.number, ourLabels, opponentLabels);

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
