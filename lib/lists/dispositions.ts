/**
 * Dispositions de liste.
 *
 * Légende centralisée (§10.5) : aucun composant ne redéfinit ces libellés. Les valeurs
 * correspondent à l'enum `public.list_disposition` (migration 0010) ; ajouter une
 * disposition demande donc une migration, ce qui est voulu — c'est le règlement qui fixe
 * cette liste, pas l'application.
 */

export type Disposition =
  | "TAKE_AND_HOLD"
  | "DISRUPTION"
  | "PURGE_THE_FOE"
  | "PRIORITY_ASSETS"
  | "RECONNAISSANCE";

export interface DispositionEntry {
  value: Disposition;
  /** Intitulé du règlement, conservé en anglais comme sur les feuilles de tournoi. */
  label: string;
  /** Glose française, pour lever l'ambiguïté d'un coup d'œil. */
  gloss: string;
}

export const DISPOSITIONS: readonly DispositionEntry[] = [
  { value: "TAKE_AND_HOLD", label: "Take and Hold", gloss: "prendre et tenir" },
  { value: "DISRUPTION", label: "Disruption", gloss: "perturber, saboter" },
  { value: "PURGE_THE_FOE", label: "Purge the Foe", gloss: "éliminer l'ennemi" },
  {
    value: "PRIORITY_ASSETS",
    label: "Priority Assets",
    gloss: "sécuriser les objectifs prioritaires",
  },
  { value: "RECONNAISSANCE", label: "Reconnaissance", gloss: "reconnaissance" },
] as const;

export function isDisposition(value: unknown): value is Disposition {
  return DISPOSITIONS.some((entry) => entry.value === value);
}

export function dispositionEntry(value: Disposition): DispositionEntry {
  const entry = DISPOSITIONS.find((candidate) => candidate.value === value);
  if (!entry) {
    throw new Error(`Disposition inconnue : ${value}`);
  }
  return entry;
}

/** Libellé affichable, ou `null` si la disposition n'est pas renseignée. */
export function dispositionLabel(value: string | null | undefined): string | null {
  if (!isDisposition(value)) {
    return null;
  }
  const entry = dispositionEntry(value);
  return `${entry.label} — ${entry.gloss}`;
}
