/**
 * Textes du guide (/guide) : le déroulé complet d'un tournoi.
 *
 * Mêmes règles que lib/help/pages.ts : décrire la mécanique, jamais conseiller, et tous
 * les textes au même endroit. Ce qui découle du code — tableau des statuts, nombre
 * d'étapes de pairing, échelle des estimés, dispositions — n'est pas écrit ici : la page
 * le calcule depuis les modules qui font foi, pour qu'il ne puisse pas se désynchroniser.
 */

export const GUIDE_PRINCIPLE =
  "Le coach prend les décisions. L'outil restitue les données saisies — listes, estimés, missions — et applique les règles mécaniques du protocole. Il ne classe rien et ne choisit rien à la place de personne.";

export interface GuideRole {
  role: string;
  lines: readonly string[];
}

export const GUIDE_ROLES: readonly GuideRole[] = [
  {
    role: "Coach",
    lines: [
      "Crée le tournoi, compose l'équipe et rattache chaque joueur à son compte.",
      "Saisit les équipes adverses, leurs listes, leurs dispositions et leurs règles.",
      "Fait avancer chaque ronde d'un statut à l'autre et déroule le pairing.",
    ],
  },
  {
    role: "Joueur",
    lines: [
      "Saisit sa liste et sa disposition pour chaque tournoi.",
      "Pose un estimé de 1 à 5 contre chaque joueur de chaque équipe adverse, avec un commentaire facultatif pour le coach.",
      "Consulte les listes adverses, la note du coach et l'historique.",
    ],
  },
];

export interface GuideStep {
  title: string;
  who: "Coach" | "Joueur" | "Coach et joueurs";
  body: string;
}

export const GUIDE_CYCLE: readonly GuideStep[] = [
  {
    title: "Préparer le tournoi",
    who: "Coach",
    body: "Créer le tournoi, ajouter les joueurs de l'équipe et rattacher chacun à son compte. Sans rattachement, un joueur ne peut rien saisir.",
  },
  {
    title: "Saisir les adversaires",
    who: "Coach",
    body: "Une équipe adverse par ronde, avec pour chaque joueur son armée, son détachement, sa disposition et sa liste. Les règles d'armée et de détachement, saisies une fois, valent pour toutes les listes de la même armée.",
  },
  {
    title: "Créer la ronde",
    who: "Coach",
    body: "Un numéro et une équipe adverse. La ronde démarre en « Préparation ».",
  },
  {
    title: "Saisir listes et estimés",
    who: "Coach et joueurs",
    body: "Chaque joueur renseigne sa liste et sa disposition, puis pose ses estimés équipe adverse par équipe adverse : le tirage des rondes n'est pas encore connu. Son tableau de bord lui dit ce qu'il reste à faire. La saisie est possible dès qu'une équipe adverse est saisie ; le coach passe la ronde en « Estimés ouverts » pour signaler que c'est le moment. La matrice se remplit en direct sous ses yeux.",
  },
  {
    title: "Verrouiller les estimés",
    who: "Coach",
    body: "« Estimés verrouillés » fige la matrice : plus aucun joueur ne peut modifier ses valeurs.",
  },
  {
    title: "Jouer le pairing",
    who: "Coach",
    body: "Étape par étape, en saisissant aussi les choix faits par l'équipe adverse à la table. Chaque action reste annulable.",
  },
  {
    title: "Clore la ronde",
    who: "Coach",
    body: "« Terminée », puis « Verrouillée » : la ronde rejoint l'historique et plus rien n'y bouge. Quand toutes les rondes d'un tournoi sont verrouillées, les listes des joueurs se figent à leur tour.",
  },
];

/** Une étape du protocole de pairing, dans l'ordre où elle se joue. */
export const GUIDE_PAIRING_STEP: readonly string[] = [
  "Chaque équipe désigne un défenseur parmi ses joueurs disponibles. Les deux désignations sont simultanées.",
  "Chaque équipe propose deux attaquants face au défenseur adverse.",
  "Chaque défenseur retient un des deux attaquants proposés contre lui : ce couple devient un match définitif.",
  "L'attaquant refusé redevient disponible pour l'étape suivante.",
];

export const GUIDE_PAIRING_CLOSING =
  "Après la dernière étape, il reste deux joueurs par équipe. Les deux derniers matchs se forment sans aucun choix : les deux attaquants refusés à la dernière étape s'affrontent, puis les deux joueurs restants.";

export const GUIDE_MISSIONS =
  "En V11, la mission primaire d'un match découle du croisement des dispositions des deux joueurs. Elle n'est pas la même pour les deux : chacun a la sienne, déterminée par sa disposition face à celle de l'autre. Tant qu'une des deux dispositions manque, aucune mission ne s'affiche.";
