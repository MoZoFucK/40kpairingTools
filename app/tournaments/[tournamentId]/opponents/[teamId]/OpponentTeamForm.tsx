"use client";

import { useActionState } from "react";
import { renameOpponentTeam, type FormState } from "../actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export function OpponentTeamForm({
  tournamentId,
  team,
}: {
  tournamentId: string;
  team: { id: string; name: string; shortName: string | null };
}) {
  const [state, action] = useActionState(renameOpponentTeam, EMPTY);

  return (
    <form action={action} className="row g-3 align-items-end">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="teamId" value={team.id} />

      <div className="col-12 col-sm-6">
        <label htmlFor="opp-team-name" className="form-label">
          Nom de l&apos;équipe
        </label>
        <input
          id="opp-team-name"
          name="name"
          type="text"
          className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
          defaultValue={team.name}
          required
        />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="col-12 col-sm-4">
        <label htmlFor="opp-team-short" className="form-label">
          Nom court <span className="text-body-secondary">(optionnel)</span>
        </label>
        <input
          id="opp-team-short"
          name="shortName"
          type="text"
          className={`form-control ${state.errors?.shortName ? "is-invalid" : ""}`}
          defaultValue={team.shortName ?? ""}
          maxLength={12}
        />
        <FieldError message={state.errors?.shortName} />
      </div>

      <div className="col-12 col-sm-2">
        <SubmitButton label="Enregistrer" className="btn btn-primary w-100" />
      </div>

      <div className="col-12">
        <FormMessage message={state.message} tone={state.errors ? "danger" : "success"} />
      </div>
    </form>
  );
}
