"use client";

import { useActionState } from "react";
import { saveOurTeam, type FormState } from "../actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export function TeamForm({
  tournamentId,
  team,
}: {
  tournamentId: string;
  team?: { id: string; name: string; shortName: string | null };
}) {
  const [state, action] = useActionState(saveOurTeam, EMPTY);

  return (
    <form action={action} className="row g-3 align-items-end">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      {team ? <input type="hidden" name="teamId" value={team.id} /> : null}

      <div className="col-12 col-sm-6">
        <label htmlFor="team-name" className="form-label">
          Nom de l&apos;équipe
        </label>
        <input
          id="team-name"
          name="name"
          type="text"
          className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
          defaultValue={team?.name ?? ""}
          placeholder="ADLC"
          required
        />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="col-12 col-sm-4">
        <label htmlFor="team-short" className="form-label">
          Nom court <span className="text-body-secondary">(optionnel)</span>
        </label>
        <input
          id="team-short"
          name="shortName"
          type="text"
          className={`form-control ${state.errors?.shortName ? "is-invalid" : ""}`}
          defaultValue={team?.shortName ?? ""}
          maxLength={12}
        />
        <FieldError message={state.errors?.shortName} />
      </div>

      <div className="col-12 col-sm-2">
        <SubmitButton
          label={team ? "Enregistrer" : "Créer"}
          className="btn btn-primary w-100"
        />
      </div>

      <div className="col-12">
        <FormMessage message={state.message} tone={state.errors ? "danger" : "success"} />
      </div>
    </form>
  );
}
