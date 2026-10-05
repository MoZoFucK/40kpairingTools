/**
 * Complétude d'une liste de joueur.
 *
 * Une liste est « saisie » quand elle porte ce dont l'équipe a besoin pour travailler :
 * l'armée (toujours présente, la base l'exige), le détachement, et la disposition — sans
 * elle, aucune mission primaire ne peut être déduite face aux adversaires.
 *
 * Le contenu collé de la liste reste facultatif : les listes importées du classeur n'en
 * ont pas, et les compter comme incomplètes noierait le signal utile.
 *
 * Constat mécanique sur des champs vides, jamais un jugement sur la liste elle-même.
 */

export interface ListFields {
  army?: string | null;
  detachment?: string | null;
  disposition?: string | null;
}

export type MissingListField = "army" | "detachment" | "disposition";

export const MISSING_FIELD_LABEL: Readonly<Record<MissingListField, string>> = {
  army: "armée",
  detachment: "détachement",
  disposition: "disposition",
};

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** Champs manquants, dans l'ordre du formulaire. Vide : la liste est saisie. */
export function missingListFields(list: ListFields): MissingListField[] {
  const missing: MissingListField[] = [];
  if (isBlank(list.army)) missing.push("army");
  if (isBlank(list.detachment)) missing.push("detachment");
  if (isBlank(list.disposition)) missing.push("disposition");
  return missing;
}

export function isListComplete(list: ListFields): boolean {
  return missingListFields(list).length === 0;
}

/** « détachement et disposition », pour une phrase lisible. */
export function describeMissing(missing: readonly MissingListField[]): string {
  const labels = missing.map((field) => MISSING_FIELD_LABEL[field]);
  if (labels.length <= 1) {
    return labels.join("");
  }
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}
