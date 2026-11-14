import {
  dispositionColor,
  dispositionLabel,
  dispositionShortLabel,
} from "@/lib/lists/dispositions";

/**
 * Disposition d'une liste, en pastille à sa couleur (celle de la matrice gdmissions).
 *
 * `withGloss` ajoute la glose française, là où la place le permet. Rien n'est affiché
 * si la disposition n'est pas renseignée.
 */
export function DispositionBadge({
  disposition,
  withGloss = false,
  className = "",
}: {
  disposition: string | null | undefined;
  withGloss?: boolean;
  className?: string;
}) {
  const color = dispositionColor(disposition);
  const label = withGloss
    ? dispositionLabel(disposition)
    : dispositionShortLabel(disposition);

  if (!color || !label) {
    return null;
  }

  return (
    <span
      className={`badge text-white ${className}`.trim()}
      style={{ backgroundColor: color }}
      title={withGloss ? undefined : (dispositionLabel(disposition) ?? undefined)}
    >
      {label}
    </span>
  );
}
