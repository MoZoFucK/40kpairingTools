"use client";

import { useActionState, useRef } from "react";
import { savePlayer, type FormState } from "../actions";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export interface EditablePlayer {
  id: string;
  name: string;
  army: string;
  detachment: string | null;
  listName: string | null;
}

/**
 * Sert à l'ajout comme à la modification : c'est le même formulaire, avec ou sans
 * `player`. Deux composants quasi identiques n'apporteraient rien (§43).
 */
export function PlayerForm({
  tournamentId,
  teamId,
  player,
  onDone,
}: {
  tournamentId: string;
  teamId: string;
  player?: EditablePlayer;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await savePlayer(previous, formData);
      if (!result.errors && !player) {
        formRef.current?.reset();
      }
      if (!result.errors && player) {
        onDone?.();
      }
      return result;
    },
    EMPTY,
  );

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form action={action} ref={formRef} className="row g-2 align-items-end">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="teamId" value={teamId} />
      {player ? <input type="hidden" name="playerId" value={player.id} /> : null}

      <div className="col-12 col-md-3">
        <label htmlFor={`player-name-${player?.id ?? "new"}`} className="form-label">
          Joueur
        </label>
        <input
          id={`player-name-${player?.id ?? "new"}`}
          name="name"
          type="text"
          className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
          defaultValue={player?.name ?? ""}
          required
        />
        <FieldError message={state.errors?.name} />
      </div>

      <div className="col-12 col-md-3">
        <label htmlFor={`player-army-${player?.id ?? "new"}`} className="form-label">
          Armée
        </label>
        <input
          id={`player-army-${player?.id ?? "new"}`}
          name="army"
          type="text"
          className={`form-control ${state.errors?.army ? "is-invalid" : ""}`}
          defaultValue={player?.army ?? ""}
          required
        />
        <FieldError message={state.errors?.army} />
      </div>

      <div className="col-12 col-md-3">
        <label htmlFor={`player-detach-${player?.id ?? "new"}`} className="form-label">
          Détachement
        </label>
        <input
          id={`player-detach-${player?.id ?? "new"}`}
          name="detachment"
          type="text"
          className="form-control"
          defaultValue={player?.detachment ?? ""}
        />
      </div>

      <div className="col-12 col-md-2">
        <label htmlFor={`player-list-${player?.id ?? "new"}`} className="form-label">
          Liste
        </label>
        <input
          id={`player-list-${player?.id ?? "new"}`}
          name="listName"
          type="text"
          className="form-control"
          defaultValue={player?.listName ?? ""}
        />
      </div>

      <div className="col-12 col-md-1 d-grid">
        <SubmitButton
          label={player ? "OK" : "Ajouter"}
          busyLabel="…"
          className="btn btn-primary"
        />
      </div>

      <div className="col-12">
        <FormMessage message={state.message} tone={state.errors ? "danger" : "success"} />
      </div>
    </form>
  );
}
