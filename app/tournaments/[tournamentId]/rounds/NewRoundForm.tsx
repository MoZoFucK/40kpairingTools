"use client";

import { useActionState } from "react";
import { createRound, type FormState } from "./actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export function NewRoundForm({
  tournamentId,
  opponentTeams,
  nextNumber,
}: {
  tournamentId: string;
  opponentTeams: readonly { id: string; name: string }[];
  nextNumber: number;
}) {
  const [state, action] = useActionState(createRound, EMPTY);

  return (
    <form action={action}>
      <input type="hidden" name="tournamentId" value={tournamentId} />

      <div className="mb-3">
        <label htmlFor="round-number" className="form-label">
          Numéro de ronde
        </label>
        <input
          id="round-number"
          name="number"
          type="number"
          min={1}
          className={`form-control ${state.errors?.number ? "is-invalid" : ""}`}
          defaultValue={nextNumber}
          required
        />
        <FieldError message={state.errors?.number} />
      </div>

      <div className="mb-3">
        <label htmlFor="round-opponent" className="form-label">
          Équipe adverse
        </label>
        <select
          id="round-opponent"
          name="opponentTeamId"
          className={`form-select ${state.errors?.opponentTeamId ? "is-invalid" : ""}`}
          required
        >
          <option value="">Choisir…</option>
          {opponentTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <FieldError message={state.errors?.opponentTeamId} />
      </div>

      <SubmitButton label="Créer la ronde" />
      <FormMessage message={state.message} tone="danger" />
    </form>
  );
}
