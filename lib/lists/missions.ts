import { DISPOSITIONS, type Disposition } from "./dispositions";

/**
 * Mission primaire déduite du croisement des dispositions.
 *
 * Le tableau n'est pas symétrique, et ce n'est pas une erreur : les noms vont par paires
 * complémentaires — « Immovable Object » face à « Unstoppable Force », « Death Trap » face
 * à « Determined Acquisition ». Chaque joueur reçoit donc **sa propre** mission primaire
 * dans un même match, déterminée par sa disposition face à celle de son adversaire.
 *
 * Nom et résumé vivent dans la même entrée, jamais dans deux tables indexées l'une par
 * l'autre : une coquille dans un nom ferait disparaître le résumé sans le moindre signal.
 *
 * Ce module ne fait que restituer une donnée de règlement. Il ne juge aucune mission et
 * n'en classe aucune : la table est une lecture, pas une aide à la décision (§58).
 *
 * Les résumés emploient une emphase légère (`**gras**`, `` `terme` ``) rendue par
 * `components/lists/MissionSummary.tsx` : les valeurs de points doivent ressortir d'un
 * coup d'œil.
 */

export interface Mission {
  name: string;
  summary: string;
}

interface MissionEntry extends Mission {
  own: Disposition;
  opponent: Disposition;
}

const ENTRIES: readonly MissionEntry[] = [
  // --- Take and Hold ---------------------------------------------------------
  {
    own: "TAKE_AND_HOLD",
    opponent: "TAKE_AND_HOLD",
    name: "Battlefield Dominance",
    summary:
      "R1-2 : **2 VP** si tu contrôles plus d'objectifs que l'adversaire. R2+ : **3 VP/objectif contrôlé**, +**2 VP/objectif non domestique** si tu contrôles ton objectif domestique.",
  },
  {
    own: "TAKE_AND_HOLD",
    opponent: "DISRUPTION",
    name: "Determined Acquisition",
    summary:
      "**2 VP** par objectif non domestique nouvellement contrôlé. R2+ : **3 VP/objectif contrôlé**, +**3 VP** par objectif en territoire adverse.",
  },
  {
    own: "TAKE_AND_HOLD",
    opponent: "PURGE_THE_FOE",
    name: "Immovable Object",
    summary:
      "**3 VP** si tu contrôles au moins un objectif central. R2-4 puis R5 : **5 VP par objectif non domestique contrôlé**.",
  },
  {
    own: "TAKE_AND_HOLD",
    opponent: "PRIORITY_ASSETS",
    name: "Inescapable Dominion",
    summary:
      "**4 VP** si tu contrôles 3+ objectifs. R2+ : **5 VP** si tu en contrôles 2+, +**4 VP** si tu en contrôles plus que l'adversaire. Fin de partie : **5 VP** si tu contrôles l'objectif adverse.",
  },
  {
    own: "TAKE_AND_HOLD",
    opponent: "RECONNAISSANCE",
    name: "Purge and Secure",
    summary:
      "**3 VP** si tu détruis une unité ennemie dans ou près d'un objectif. R2+ : **4 VP/objectif non domestique**, +**3 VP** si tu prends un nouvel objectif non domestique.",
  },

  // --- Disruption ------------------------------------------------------------
  {
    own: "DISRUPTION",
    opponent: "TAKE_AND_HOLD",
    name: "Death Trap",
    summary:
      "**2 VP** par zone de terrain piégée ce tour, +**3 VP** si elle contient un objectif, et **3 VP** si une unité ennemie qui y était présente est détruite. R2+ : **4 VP** si tu contrôles un objectif non domestique.",
  },
  {
    own: "DISRUPTION",
    opponent: "DISRUPTION",
    name: "Outmanoeuvre",
    summary:
      "**10 VP** si tu contrôles l'objectif domestique adverse. R1 : **4 VP/objectif non domestique** ; R2-3 : **5 VP** ; R4+ : **6 VP**.",
  },
  {
    own: "DISRUPTION",
    opponent: "PURGE_THE_FOE",
    name: "Delaying Action",
    summary:
      "**2 VP par unité ennemie détruite**. R2+ : **4 VP** si tu contrôles un objectif non domestique ; **3 VP** si tu contrôles au moins un objectif central **et** un objectif d'expansion.",
  },
  {
    own: "DISRUPTION",
    opponent: "PRIORITY_ASSETS",
    name: "Locate and Deny",
    summary:
      "**4 VP** si tu détruis une unité qui avait commencé près d'un objectif, ou s'il ne reste qu'un marqueur d'opération dans une zone occupée par une de tes unités et aucun ennemi. R2+ : **4 VP** si tu contrôles un objectif non domestique. Fin de partie : **5 VP** pour cette dernière condition.",
  },
  {
    own: "DISRUPTION",
    opponent: "RECONNAISSANCE",
    name: "Smoke and Mirrors",
    summary:
      "**2 VP par objectif transformé en `Decoy`**, +**2 VP** s'il est en territoire adverse. R2+ : **4 VP** si tu contrôles un objectif non domestique. Fin : **10 VP** si 4+ objectifs sont `Decoy`.",
  },

  // --- Purge the Foe ---------------------------------------------------------
  {
    own: "PURGE_THE_FOE",
    opponent: "TAKE_AND_HOLD",
    name: "Unstoppable Force",
    summary:
      "**3 VP** si tu détruis au moins une unité. R2+ : **4 VP/objectif non domestique**, +**3 VP** pour un objectif non domestique nouvellement contrôlé. Fin : **5 VP** si tu contrôles un objectif central.",
  },
  {
    own: "PURGE_THE_FOE",
    opponent: "DISRUPTION",
    name: "Punishment",
    summary:
      "Désigner 1 à 3 unités `CONDEMNED`. **5 VP** si au moins une unité condamnée quitte la table. R2+ : **4 VP** si tu contrôles un objectif non domestique, +**5 VP** si tu en contrôles plus que l'adversaire. Fin : **8 VP** si tu contrôles son objectif domestique.",
  },
  {
    own: "PURGE_THE_FOE",
    opponent: "PURGE_THE_FOE",
    name: "Meatgrinder",
    summary:
      "**3 VP** si tu détruis une unité. R2+ : **4 VP** si tu contrôles un objectif non domestique ; **5 VP** si tu détruis plus d'unités que l'adversaire n'en a perdu au tour précédent ; **5 VP** si tu contrôles son objectif domestique.",
  },
  {
    own: "PURGE_THE_FOE",
    opponent: "PRIORITY_ASSETS",
    name: "Destroyer's Wrath",
    summary:
      "**3 VP** si tu détruis une unité. R2+ : **4 VP** si tu contrôles un objectif non domestique, +**6 VP** si tu en contrôles plus que l'adversaire. +**4 VP** si tu détruis plus d'unités que l'adversaire n'en a perdu au tour précédent.",
  },
  {
    own: "PURGE_THE_FOE",
    opponent: "RECONNAISSANCE",
    name: "Consecrate",
    summary:
      "Les unités ayant détruit une unité peuvent consacrer un objectif. **3 VP** pour 1-2 objectifs consacrés, **6 VP** pour 3+. R2+ : **4 VP** pour contrôler un objectif non domestique, +**4 VP** si tu en contrôles plus que l'adversaire. Fin : **5 VP** si son objectif domestique est consacré.",
  },

  // --- Priority Assets -------------------------------------------------------
  {
    own: "PRIORITY_ASSETS",
    opponent: "TAKE_AND_HOLD",
    name: "Secure Asset",
    summary:
      "**4 VP** si une unité accomplit `Secure Asset`, +**2 VP** si tu détruis une unité ayant commencé près d'un objectif central. R2+ : **4 VP** pour contrôler un objectif non domestique, et **4 VP** supplémentaires pour 3+ objectifs.",
  },
  {
    own: "PRIORITY_ASSETS",
    opponent: "DISRUPTION",
    name: "Extract Relic",
    summary:
      "**4 VP** pour `Sensor Sweep`, **3 VP** pour détruire une unité ayant commencé près d'un objectif, **4 VP** pour la condition du dernier marqueur adverse. R2+ : **4 VP** si un objectif non domestique est contrôlé. Fin : **5 VP** pour la condition du marqueur.",
  },
  {
    own: "PRIORITY_ASSETS",
    opponent: "PURGE_THE_FOE",
    name: "Vital Link",
    summary:
      "**2 VP** pour contrôler un objectif central, +**1 VP par marqueur ami** à proximité. R2+ : **4 VP** pour un objectif non domestique, +**4 VP** si l'un est central. Fin : **10 VP** si tu contrôles l'objectif adverse.",
  },
  {
    own: "PRIORITY_ASSETS",
    opponent: "PRIORITY_ASSETS",
    name: "Sabotage",
    summary:
      "**3 VP par unité** ayant effectué `Sabotage`, +**2 VP** pour chacune à portée d'un objectif en territoire adverse. R2+ : **4 VP** si tu contrôles un objectif non domestique.",
  },
  {
    own: "PRIORITY_ASSETS",
    opponent: "RECONNAISSANCE",
    name: "Vanguard Operation",
    summary:
      "**4 VP** pour `Vanguard Operation`, +**2 VP** si tu détruis au moins une unité. R2+ : **4 VP** si tu contrôles un objectif non domestique. Fin : **10 VP** si tu contrôles l'objectif adverse.",
  },

  // --- Reconnaissance --------------------------------------------------------
  {
    own: "RECONNAISSANCE",
    opponent: "TAKE_AND_HOLD",
    name: "Reconnaissance Sweep",
    summary:
      "**3 VP** avec 3+ unités dans 3 quarts différents, ou **6 VP** dans les 4 quarts. +**1 VP par unité ennemie détruite**. R2+ : **3 VP** si tu contrôles un objectif non domestique.",
  },
  {
    own: "RECONNAISSANCE",
    opponent: "DISRUPTION",
    name: "Surveil the Foe",
    summary:
      "**4 VP** si tu surveilles une unité ennemie dans les conditions requises. R2+ : **4 VP** pour un objectif non domestique, +**4 VP** si tu en contrôles plus que l'adversaire. **5 VP** si aucun marqueur ennemi ne reste sur table.",
  },
  {
    own: "RECONNAISSANCE",
    opponent: "PURGE_THE_FOE",
    name: "Triangulation",
    summary:
      "R2+ : **4 VP** si un objectif non domestique est contrôlé. Puis **3 / 6 / 10 VP** pour respectivement 1 / 2 / 3+ objectifs triangulés. Fin : **10 VP** si tu contrôles 4+ objectifs.",
  },
  {
    own: "RECONNAISSANCE",
    opponent: "PRIORITY_ASSETS",
    name: "Search and Scour",
    summary:
      "**3 VP** si tu contrôles un objectif central, +**2 VP** si tu détruis une unité ayant commencé dans une zone de terrain. R2+ : **4 VP par objectif non domestique**. Fin : **5 VP** si aucune unité ennemie n'est entièrement dans ton territoire.",
  },
  {
    own: "RECONNAISSANCE",
    opponent: "RECONNAISSANCE",
    name: "Gather Intel",
    summary:
      "R1 : **6 VP** si tu contrôles un objectif central. R2+ : **4 VP** pour un objectif non domestique, +**7 VP par unité** ayant effectué `Extract Intelligence`. Fin : **5 VP** si 3+ marqueurs sont sur table, +**5 VP** si un marqueur est près de l'objectif adverse.",
  },
];

const TABLE: ReadonlyMap<string, Mission> = new Map(
  ENTRIES.map((entry) => [
    `${entry.own}|${entry.opponent}`,
    { name: entry.name, summary: entry.summary },
  ]),
);

/** Nombre de croisements attendus : chaque disposition contre chaque disposition. */
export const EXPECTED_MISSION_COUNT = DISPOSITIONS.length * DISPOSITIONS.length;

/**
 * Mission primaire du joueur dont la disposition est `own`, face à `opponent`.
 *
 * `null` dès qu'une des deux dispositions n'est pas renseignée : mieux vaut ne rien
 * afficher qu'une mission fausse.
 */
export function missionFor(
  own: string | null | undefined,
  opponent: string | null | undefined,
): Mission | null {
  if (!own || !opponent) {
    return null;
  }
  return TABLE.get(`${own}|${opponent}`) ?? null;
}

/** Les deux missions d'un même match : la nôtre et celle de l'adversaire. */
export function missionsOfMatch(
  own: string | null | undefined,
  opponent: string | null | undefined,
): { ours: Mission | null; theirs: Mission | null } {
  return {
    ours: missionFor(own, opponent),
    theirs: missionFor(opponent, own),
  };
}
