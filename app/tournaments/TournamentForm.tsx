"use client";

import { useActionState } from "react";
import { createTournament, updateTournament, type FormState } from "./actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from "@/lib/validation/team";

const EMPTY: FormState = {};

/** Tailles d'équipe proposées. Le pairing apparie deux à deux, donc uniquement des paires. */
const SIZES = Array.from(
  { length: (MAX_TEAM_SIZE - MIN_TEAM_SIZE) / 2 + 1 },
  (_, index) => MIN_TEAM_SIZE + index * 2,
);

export function TournamentForm({
  tournament,
}: {
  tournament?: { id: string; name: string; teamSize: number };
}) {
  const [state, action] = useActionState(
    tournament ? updateTournament : createTournament,
    EMPTY,
  );

  return (
    <form action={action}>
      {tournament ? (
        <input type="hidden" name="tournamentId" value={tournament.id} />
      ) : null}

      <div className="mb-3">
        <label htmlFor="tournament-name" className="form-label">
          Nom du tournoi
        </label>
        <input
          id="tournament-name"
          name="name"
          type="text"
          className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
          defaultValue={tournament?.name ?? ""}
          required
        />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="mb-3">
        <label htmlFor="tournament-size" className="form-label">
          Joueurs par équipe
        </label>
        <select
          id="tournament-size"
          name="teamSize"
          className={`form-select ${state.errors?.teamSize ? "is-invalid" : ""}`}
          defaultValue={tournament?.teamSize ?? 6}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <FieldError message={state.errors?.teamSize} />
      </div>

      <SubmitButton label={tournament ? "Enregistrer" : "Créer le tournoi"} />
      <FormMessage message={state.message} tone={state.errors ? "danger" : "success"} />
    </form>
  );
}
