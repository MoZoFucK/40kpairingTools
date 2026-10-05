export interface Crumb {
  label: string;
  /** Absent sur le dernier élément : la page courante ne se lie pas à elle-même. */
  href?: string;
}

/**
 * Construction des fils d'Ariane — §34.
 *
 * Fonctions pures, sans accès à la base ni à React : chaque page a déjà lu ce qu'il
 * faut pour se situer, elle n'a qu'à le passer ici.
 *
 * Toutes les pistes partent du tableau de bord, qui est la porte d'entrée commune au
 * coach et au joueur. Les construire ici plutôt que de les recopier dans onze pages
 * évite qu'une branche dérive et mène ailleurs que les autres.
 */
export function dashboardTrail(): Crumb[] {
  return [{ label: "Tableau de bord", href: "/dashboard" }];
}

export function tournamentsTrail(): Crumb[] {
  return [...dashboardTrail(), { label: "Tournois", href: "/tournaments" }];
}

export function tournamentTrail(tournamentId: string, tournamentName: string): Crumb[] {
  return [
    ...tournamentsTrail(),
    { label: tournamentName, href: `/tournaments/${tournamentId}` },
  ];
}

export function roundsTrail(tournamentId: string, tournamentName: string): Crumb[] {
  return [
    ...tournamentTrail(tournamentId, tournamentName),
    { label: "Rondes", href: `/tournaments/${tournamentId}/rounds` },
  ];
}

export function roundTrail(
  tournamentId: string,
  tournamentName: string,
  roundId: string,
  roundNumber: number,
): Crumb[] {
  return [
    ...roundsTrail(tournamentId, tournamentName),
    {
      label: `Ronde ${roundNumber}`,
      href: `/tournaments/${tournamentId}/rounds/${roundId}`,
    },
  ];
}

/**
 * Saisie des estimés du joueur, rangée par équipe adverse et non par ronde : le joueur
 * estime une équipe avant que le tirage dise quand il la rencontrera.
 */
export function estimatesTrail(tournamentId: string, tournamentName: string): Crumb[] {
  return [
    ...tournamentTrail(tournamentId, tournamentName),
    { label: "Mes estimés", href: `/tournaments/${tournamentId}/estimates` },
  ];
}

export function historyTrail(tournamentId: string, tournamentName: string): Crumb[] {
  return [
    ...tournamentTrail(tournamentId, tournamentName),
    { label: "Historique", href: `/tournaments/${tournamentId}/history` },
  ];
}

export function opponentsTrail(tournamentId: string, tournamentName: string): Crumb[] {
  return [
    ...tournamentTrail(tournamentId, tournamentName),
    { label: "Équipes adverses", href: `/tournaments/${tournamentId}/opponents` },
  ];
}

/**
 * Ajoute la page courante en bout de piste, sans lien.
 *
 * Le dernier élément d'un fil d'Ariane décrit où l'on est ; le rendre cliquable
 * inviterait à un clic qui ne mène nulle part.
 */
export function endingAt(trail: readonly Crumb[], label: string): Crumb[] {
  return [...trail, { label }];
}
