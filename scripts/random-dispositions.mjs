#!/usr/bin/env node
/**
 * Attribue une disposition tirée au hasard aux listes qui n'en ont pas.
 *
 *   node scripts/random-dispositions.mjs          # affiche le tirage, ne modifie rien
 *   node scripts/random-dispositions.mjs --yes    # enregistre le tirage
 *
 * Les listes importées du classeur datent de la V10, où la disposition n'existait pas.
 * Sans elle, aucune mission primaire ne s'affiche. Ce script en pose une au hasard, de
 * sorte que chaque équipe — la nôtre comme les adverses — aligne au moins une liste de
 * chaque disposition (une équipe de 6 a donc un doublon).
 *
 * Ne touche qu'aux listes sans disposition : une disposition déjà saisie est conservée et
 * compte dans la couverture de son équipe.
 */
import { createAdminApi } from "./lib/admin-api.mjs";
import { drawTeamDispositions } from "./lib/dispositions.mjs";

const confirmed = process.argv.includes("--yes");
const { rest } = createAdminApi();

const [tournaments, teams, players] = await Promise.all([
  rest("GET", "tournaments?select=id,name"),
  rest("GET", "teams?select=id,name,kind,tournament_id"),
  rest("GET", "players?select=id,name,team_id,disposition&order=created_at.asc"),
]);

const tournamentName = new Map(tournaments.map((tournament) => [tournament.id, tournament.name]));
const updates = [];

for (const team of teams) {
  const roster = players.filter((player) => player.team_id === team.id);
  const alreadySet = roster.map((player) => player.disposition).filter(Boolean);
  const targets = roster.filter((player) => !player.disposition);

  const drawn = drawTeamDispositions(targets.length, { alreadySet });
  targets.forEach((player, index) => updates.push({ player, disposition: drawn[index] }));

  const label = `${tournamentName.get(team.tournament_id) ?? "?"} · ${team.name}`;
  const covered = new Set([...alreadySet, ...drawn]).size;
  console.log(`${label} : ${targets.length} tirée(s), ${covered}/5 dispositions couvertes`);
  for (const [index, player] of targets.entries()) {
    console.log(`    ${player.name.padEnd(28)} ${drawn[index]}`);
  }
}

if (!confirmed) {
  console.log(`\n${updates.length} liste(s) à compléter. Relance avec --yes pour enregistrer.`);
  process.exit(0);
}

for (const { player, disposition } of updates) {
  await rest("PATCH", `players?id=eq.${player.id}`, { disposition });
}

console.log(`\n✓ ${updates.length} disposition(s) enregistrée(s).`);
