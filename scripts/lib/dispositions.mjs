/**
 * Tirage de dispositions pour les listes importées de la V10, qui n'en avaient pas.
 *
 * Données de test, pas une lecture du règlement : la disposition réelle d'une liste reste
 * à saisir par son joueur. Le tirage garantit seulement que chaque équipe aligne au moins
 * une liste de chaque disposition, pour que toutes les missions primaires apparaissent.
 *
 * Les valeurs reprennent l'enum `public.list_disposition` (migration 0010) et
 * `lib/lists/dispositions.ts`.
 */

export const DISPOSITION_VALUES = [
  "TAKE_AND_HOLD",
  "DISRUPTION",
  "PURGE_THE_FOE",
  "PRIORITY_ASSETS",
  "RECONNAISSANCE",
];

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/**
 * `count` dispositions tirées au hasard pour les listes d'une équipe qui n'en ont pas.
 *
 * `alreadySet` porte les dispositions déjà renseignées dans l'équipe : elles comptent
 * dans la couverture, le tirage ne fait que compléter. Les dispositions encore absentes
 * passent en premier ; les places restantes sont des doublons tirés au hasard. S'il y a
 * moins de places que de dispositions manquantes, la couverture reste partielle.
 *
 * `random` est injectable pour que le tirage soit testable.
 */
export function drawTeamDispositions(count, { alreadySet = [], random = Math.random } = {}) {
  const uncovered = DISPOSITION_VALUES.filter((value) => !alreadySet.includes(value));
  const covering = shuffle(uncovered, random).slice(0, count);
  const extra = Array.from(
    { length: Math.max(0, count - covering.length) },
    () => DISPOSITION_VALUES[Math.floor(random() * DISPOSITION_VALUES.length)],
  );
  return shuffle([...covering, ...extra], random);
}
