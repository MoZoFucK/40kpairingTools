"use client";

import { useActionState } from "react";
import { saveMyList, type FormState } from "./actions";
import { DispositionSelect } from "@/components/ui/DispositionSelect";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export interface MyList {
  name: string;
  army: string;
  detachment: string | null;
  listName: string | null;
  listContent: string | null;
  disposition: string | null;
}

/**
 * `readOnly` : le tournoi est clos. Un `<fieldset disabled>` désactive d'un coup tous les
 * champs et le bouton, nativement — la liste reste lisible, rien ne peut être soumis.
 * Le serveur refuse de toute façon l'écriture : ce n'est qu'un confort d'affichage.
 */
export function MyListForm({
  tournamentId,
  list,
  readOnly = false,
}: {
  tournamentId: string;
  list: MyList;
  readOnly?: boolean;
}) {
  const [state, action] = useActionState(saveMyList, EMPTY);

  return (
    <form action={action}>
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <fieldset disabled={readOnly} className="row g-3">
        <div className="col-12 col-md-6">
          <label htmlFor="my-army" className="form-label">
            Armée
          </label>
          <input
            id="my-army"
            name="army"
            type="text"
            className={`form-control ${state.errors?.army ? "is-invalid" : ""}`}
            defaultValue={list.army}
            required
          />
          <FieldError message={state.errors?.army} />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="my-detachment" className="form-label">
            Détachement
          </label>
          <input
            id="my-detachment"
            name="detachment"
            type="text"
            className="form-control"
            defaultValue={list.detachment ?? ""}
          />
        </div>

        <div className="col-12 col-md-6">
          <DispositionSelect id="my-disposition" defaultValue={list.disposition} />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor="my-list-name" className="form-label">
            Nom de la liste <span className="text-body-secondary">(optionnel)</span>
          </label>
          <input
            id="my-list-name"
            name="listName"
            type="text"
            className="form-control"
            defaultValue={list.listName ?? ""}
          />
        </div>

        <div className="col-12">
          <label htmlFor="my-list-content" className="form-label">
            Ma liste <span className="text-body-secondary">(optionnel)</span>
          </label>
          <textarea
            id="my-list-content"
            name="listContent"
            className="form-control font-monospace"
            rows={10}
            defaultValue={list.listContent ?? ""}
            placeholder={"Personnages\nImotekh\nOverlord\n\nUnités\n20 Warriors\n10 Immortals"}
          />
          <div className="form-text">
            Colle ta liste telle quelle. Les intitulés de section sont détectés pour
            l&apos;affichage ; rien n&apos;est perdu.
          </div>
        </div>

        {readOnly ? null : (
          <div className="col-12">
            <SubmitButton label="Enregistrer ma liste" />
            <FormMessage
              message={state.message}
              tone={state.message?.startsWith("Ta liste") ? "success" : "danger"}
            />
          </div>
        )}
      </fieldset>
    </form>
  );
}
