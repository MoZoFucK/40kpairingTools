"use client";

import { useActionState } from "react";
import { createOpponentTeam, type FormState } from "./actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export function NewOpponentTeamForm({ tournamentId }: { tournamentId: string }) {
  const [state, action] = useActionState(createOpponentTeam, EMPTY);

  return (
    <form action={action}>
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className="mb-3">
        <label htmlFor="new-opp-name" className="form-label">
          Nom de l&apos;équipe
        </label>
        <input
          id="new-opp-name"
          name="name"
          type="text"
          className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
          placeholder="GSH"
          required
        />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="mb-3">
        <label htmlFor="new-opp-short" className="form-label">
          Nom court <span className="text-body-secondary">(optionnel)</span>
        </label>
        <input
          id="new-opp-short"
          name="shortName"
          type="text"
          className={`form-control ${state.errors?.shortName ? "is-invalid" : ""}`}
          maxLength={12}
        />
        <FieldError message={state.errors?.shortName} />
      </div>

      <SubmitButton label="Créer l'équipe" />
      <FormMessage message={state.message} tone="danger" />
    </form>
  );
}
