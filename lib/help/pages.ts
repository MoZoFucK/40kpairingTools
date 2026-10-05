import type { UserRole } from "@/types/domain";

/**
 * Aide contextuelle de chaque page.
 *
 * Tous les textes vivent ici plutôt que dans les pages : après les retours des
 * bêta-testeurs, on les relit et on les corrige d'un coup, sans chercher dans le code.
 *
 * Règle d'écriture : décrire la mécanique, jamais conseiller. « Tu désignes ici ton
 * défenseur » est une aide ; « désigne ton joueur le plus solide » est une recommandation,
 * interdite par le §1 du cahier des charges. `tests/help-content.test.ts` passe chaque
 * texte au crible du vocabulaire de recommandation.
 */

export type HelpPage =
  | "dashboard"
  | "tournaments"
  | "tournament"
  | "opponents"
  | "opponentTeam"
  | "rounds"
  | "round"
  | "estimates"
  | "estimatesIndex"
  | "pairing"
  | "history"
  | "historyRound"
  | "myList";

export interface PageHelpContent {
  /** À quoi sert la page, en une phrase. */
  purpose: string;
  /** Ce qu'on attend du coach (et de l'admin). Absent : la page ne le concerne pas. */
  coach?: readonly string[];
  /** Ce qu'on attend du joueur. Absent : la page ne le concerne pas. */
  player?: readonly string[];
  /** Ce qui se passe ensuite, pour situer la page dans le déroulé. */
  next?: string;
}

export const PAGE_HELP: Readonly<Record<HelpPage, PageHelpContent>> = {
  dashboard: {
    purpose: "Ton point d'entrée : ce qui t'attend aujourd'hui, en un clic.",
    coach: [
      "« Ouvrir le pairing » apparaît dès qu'une ronde est en « estimés verrouillés » ou « pairing en cours ».",
      "« Listes non saisies » nomme, par tournoi en cours, les joueurs de ton équipe dont la liste manque d'un détachement ou d'une disposition.",
      "« Gérer les tournois » mène à la création des tournois et des équipes.",
    ],
    player: [
      "« À faire » liste, tournoi par tournoi, ce qu'il te reste à saisir : ta liste si elle est incomplète, puis chaque équipe adverse pas encore entièrement estimée.",
      "Quand tout est saisi, le tournoi passe « À jour ». Une fois toutes ses rondes verrouillées, il passe « Terminé » et ta liste en consultation.",
      "Si on te dit que ton compte n'est rattaché à aucune fiche, c'est ton coach qui doit faire le lien.",
    ],
  },

  tournaments: {
    purpose: "La liste des tournois auxquels tu as accès.",
    coach: [
      "Crée un tournoi avec son nom et la taille des équipes, un nombre pair de joueurs.",
      "Ouvre ensuite le tournoi pour composer ton équipe.",
    ],
    player: ["Tu vois les tournois où ton coach t'a rattaché à une fiche joueur."],
  },

  tournament: {
    purpose: "Ton équipe pour ce tournoi, et l'accès aux rondes, aux adversaires et à l'historique.",
    coach: [
      "Ajoute tes joueurs : nom, armée, détachement.",
      "Rattache chaque joueur à son compte avec la liste « Aucun compte » : c'est ce qui lui permet de saisir ses estimés et sa liste.",
      "Le compteur indique si l'effectif atteint la taille du tournoi : le pairing ne démarre pas sans équipe complète.",
      "Un joueur dont la liste manque d'un détachement ou d'une disposition est signalé « Liste à compléter ». Sans compte rattaché, c'est à toi de la saisir.",
    ],
    player: [
      "Tu vois ton équipe. Seul le coach la modifie.",
      "« Mes estimés » et « Ma liste » mènent à ta propre saisie pour ce tournoi.",
    ],
    next: "Saisis ensuite les équipes adverses, puis crée les rondes.",
  },

  opponents: {
    purpose: "Les équipes adverses du tournoi, une par ronde.",
    coach: [
      "Crée une équipe adverse par adversaire rencontré, puis ouvre-la pour saisir ses joueurs et leurs listes.",
    ],
    player: ["Tu consultes les équipes adverses saisies par ton coach."],
    next: "Une ronde ne peut être créée qu'une fois son équipe adverse saisie.",
  },

  opponentTeam: {
    purpose: "Les joueurs d'une équipe adverse et leurs listes.",
    coach: [
      "Pour chaque joueur : nom, armée, détachement, disposition et contenu de la liste.",
      "Les règles d'armée et de détachement sont partagées : saisies une fois, elles s'affichent sur toutes les listes de la même armée.",
      "La note du coach est visible par tes joueurs au moment d'estimer. Elle n'est pas modifiable par eux.",
    ],
    player: [
      "Tu lis les listes adverses, les règles et la note de ton coach avant de poser tes estimés.",
    ],
  },

  rounds: {
    purpose: "Les rondes du tournoi et leur statut.",
    coach: [
      "Crée une ronde en choisissant son numéro et son équipe adverse.",
      "« Pairing » ouvre directement l'écran de pairing de la ronde, dès qu'elle a quitté la préparation.",
    ],
    player: ["« Mes estimés » ouvre ta saisie contre l'équipe adverse de la ronde."],
    next: "Ouvre une ronde pour suivre ses estimés et changer son statut.",
  },

  round: {
    purpose: "La matrice d'estimés de la ronde, mise à jour en direct, et son statut.",
    coach: [
      "Les boutons à côté du statut ne sont pas des liens : ils font passer la ronde à l'étape nommée. « Estimés verrouillés » ferme la saisie aux joueurs.",
      "Un retour en arrière reste possible tant que la ronde n'est pas « verrouillée ». Le verrouillage, lui, est définitif.",
      "« Adversaires en lignes » inverse la matrice.",
      "Une case marquée ✎ porte un commentaire du joueur. Tous les commentaires sont repris sous la matrice.",
    ],
    player: ["Tu vois la matrice. « Mes estimés » ouvre ta propre saisie contre cette équipe."],
    next: "Une fois les estimés verrouillés, « Pairing live » ouvre le déroulé du pairing.",
  },

  estimatesIndex: {
    purpose: "Les équipes adverses du tournoi, et où tu en es de tes estimés contre chacune.",
    player: [
      "Les estimés se posent par équipe adverse, pas par ronde : au moment de les saisir, le tirage n'a pas encore dit qui tu affronteras à quelle ronde.",
      "Le compteur indique combien d'estimés tu as posés sur le nombre de joueurs adverses saisis.",
      "Une équipe en « saisie fermée » a une ronde dont le coach a verrouillé les estimés : tu peux encore relire les tiens.",
    ],
    coach: [
      "Cette page est celle de ta fiche joueur. Les estimés de toute l'équipe se lisent sur la page de chaque ronde.",
    ],
  },

  estimates: {
    purpose: "Tes estimés contre chaque joueur d'une équipe adverse, de 1 à 5.",
    player: [
      "Pour chaque adversaire, choisis une valeur de 1 (très défavorable) à 5 (très favorable). Elle est enregistrée immédiatement.",
      "Le commentaire, facultatif, accompagne ta note : quelques mots que ton coach lit sur la matrice et pendant le pairing. Il s'enregistre quand tu quittes le champ.",
      "« Voir la liste complète » déplie la liste adverse et ses règles.",
      "La mission primaire du match se déduit de ta disposition face à celle de l'adversaire. Elle s'affiche dès que les deux sont renseignées ; la tienne se saisit dans « Ma liste ».",
      "Tu peux corriger tes estimés jusqu'à ce que le coach les verrouille.",
    ],
    coach: [
      "Cette page est celle de ta fiche joueur. Les estimés de toute l'équipe se lisent sur la page de la ronde.",
    ],
  },

  pairing: {
    purpose: "Le déroulé du pairing, étape par étape, selon le protocole de l'équipe.",
    coach: [
      "Chaque étape : les deux équipes désignent un défenseur, proposent deux attaquants face au défenseur adverse, puis chaque défenseur en retient un.",
      "Tu saisis aussi les choix de l'équipe adverse, faits à la table : quand leur défenseur retient un de tes attaquants, c'est sa décision, tu l'enregistres.",
      "Les boutons d'attaquant affichent l'estimé saisi par le joueur pour ce match, et la mission primaire si les dispositions sont connues.",
      "Une case de la matrice marquée ✎ porte un commentaire du joueur. Ils sont repris sous la matrice ; ceux des matchs déjà formés passent en grisé.",
      "Après la dernière étape, les deux derniers matchs se forment seuls : les attaquants refusés s'affrontent, puis les deux joueurs restants.",
      "« Annuler la dernière action » revient d'un cran, autant de fois que nécessaire, tant que la ronde n'est pas verrouillée.",
    ],
    next: "Une fois tous les matchs formés, passe la ronde en « Terminée » puis « Verrouillée » depuis sa page pour la figer.",
  },

  history: {
    purpose: "Les rondes du tournoi, consultables telles qu'elles ont été jouées.",
    coach: ["Rien n'est modifiable ici : c'est une consultation."],
    player: ["Rien n'est modifiable ici : c'est une consultation."],
  },

  historyRound: {
    purpose: "Une ronde passée : ses matchs, la matrice d'estimés et le journal du pairing.",
    coach: ["Le journal reprend chaque action du pairing, dans l'ordre où elle a été saisie."],
    player: ["Le journal reprend chaque action du pairing, dans l'ordre où elle a été saisie."],
  },

  myList: {
    purpose: "Ta liste pour ce tournoi, telle que ton équipe et ton coach la verront.",
    player: [
      "Renseigne ton armée, ton détachement et ta disposition, puis colle ta liste telle quelle.",
      "La disposition fixe ta mission primaire face à chaque adversaire : sans elle, aucune mission ne s'affiche.",
      "Ta liste n'est plus modifiable une fois toutes les rondes du tournoi verrouillées.",
    ],
    coach: [
      "Cette page est celle de ta propre fiche. Tu peux la modifier même une fois le tournoi terminé.",
    ],
  },
};

export interface ResolvedHelp {
  purpose: string;
  expected: readonly string[];
  next?: string;
}

/**
 * Aide d'une page pour un rôle donné.
 *
 * L'admin lit l'aide du coach : il en a tous les droits (§8).
 */
export function helpFor(page: HelpPage, role: UserRole): ResolvedHelp {
  const content = PAGE_HELP[page];
  const expected = (role === "PLAYER" ? content.player : content.coach) ?? [];

  return { purpose: content.purpose, expected, next: content.next };
}
