import { DISPOSITIONS } from "@/lib/lists/dispositions";

/**
 * Choix de la disposition d'une liste.
 *
 * Liste fermée, définie par le règlement : une liste déroulante et non un champ libre.
 * L'intitulé anglais est conservé — c'est celui des feuilles de tournoi — accompagné de sa
 * glose française pour lever l'ambiguïté sans avoir à la chercher.
 */
export function DispositionSelect({
  id,
  name = "disposition",
  defaultValue,
  disabled,
}: {
  id: string;
  name?: string;
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  return (
    <>
      <label htmlFor={id} className="form-label">
        Disposition
      </label>
      <select
        id={id}
        name={name}
        className="form-select"
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
      >
        <option value="">Non renseignée</option>
        {DISPOSITIONS.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label} — {entry.gloss}
          </option>
        ))}
      </select>
    </>
  );
}
