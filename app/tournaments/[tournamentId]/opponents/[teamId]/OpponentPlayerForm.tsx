"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { lookupRules, saveOpponentPlayer, type FormState } from "../actions";
import { DispositionSelect } from "@/components/ui/DispositionSelect";
import { FieldError, FormMessage, SubmitButton } from "@/components/ui/FormFeedback";

const EMPTY: FormState = {};

export interface EditableOpponent {
  id: string;
  name: string;
  army: string;
  detachment: string | null;
  listName: string | null;
  listContent: string | null;
  notes: string | null;
  disposition: string | null;
}

/**
 * Saisie d'un joueur adverse.
 *
 * L'enjeu est la vitesse : six joueurs à saisir avant une ronde. Le formulaire se vide et
 * rend le focus au premier champ après chaque ajout, les armées et détachements déjà
 * connus sont proposés en autocomplétion, et les règles se pré-remplissent dès que
 * l'armée saisie est connue du référentiel (§17).
 */
export function OpponentPlayerForm({
  tournamentId,
  teamId,
  player,
  knownArmies,
  knownDetachments,
  onDone,
}: {
  tournamentId: string;
  teamId: string;
  player?: EditableOpponent;
  knownArmies: readonly string[];
  knownDetachments: readonly string[];
  onDone?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [army, setArmy] = useState(player?.army ?? "");
  const [detachment, setDetachment] = useState(player?.detachment ?? "");
  const [armyRule, setArmyRule] = useState("");
  const [detachmentRule, setDetachmentRule] = useState("");
  const [rulesLoaded, setRulesLoaded] = useState(false);

  const [state, action] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await saveOpponentPlayer(previous, formData);
      if (!result.errors && !result.message?.startsWith("L'enregistrement")) {
        if (player) {
          onDone?.();
        } else {
          formRef.current?.reset();
          setArmy("");
          setDetachment("");
          setArmyRule("");
          setDetachmentRule("");
          firstFieldRef.current?.focus();
        }
      }
      return result;
    },
    EMPTY,
  );

  // Pré-remplissage depuis le référentiel, sans jamais écraser une saisie en cours.
  //
  // Tous les `setState` vivent dans le callback différé, jamais dans le corps de l'effet :
  // un état posé pendant l'effet relance un rendu qui relance l'effet.
  useEffect(() => {
    const trimmedArmy = army.trim();
    if (trimmedArmy.length < 3) {
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      const found = await lookupRules(trimmedArmy, detachment.trim());
      if (cancelled) {
        return;
      }
      if (found.armyRule) {
        setArmyRule((current) => (current.length === 0 ? found.armyRule! : current));
      }
      if (found.detachmentRule) {
        setDetachmentRule((current) =>
          current.length === 0 ? found.detachmentRule! : current,
        );
      }
      setRulesLoaded(Boolean(found.armyRule));
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [army, detachment]);

  const suffix = player?.id ?? "new";

  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="teamId" value={teamId} />
      {player ? <input type="hidden" name="playerId" value={player.id} /> : null}

      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label htmlFor={`opp-name-${suffix}`} className="form-label">
            Joueur
          </label>
          <input
            id={`opp-name-${suffix}`}
            ref={firstFieldRef}
            name="name"
            type="text"
            className={`form-control ${state.errors?.name ? "is-invalid" : ""}`}
            defaultValue={player?.name ?? ""}
            autoComplete="off"
            required
          />
          <FieldError message={state.errors?.name} />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor={`opp-army-${suffix}`} className="form-label">
            Armée
          </label>
          <input
            id={`opp-army-${suffix}`}
            name="army"
            type="text"
            list={`armies-${suffix}`}
            className={`form-control ${state.errors?.army ? "is-invalid" : ""}`}
            value={army}
            onChange={(event) => setArmy(event.target.value)}
            autoComplete="off"
            required
          />
          <datalist id={`armies-${suffix}`}>
            {knownArmies.map((known) => (
              <option key={known} value={known} />
            ))}
          </datalist>
          <FieldError message={state.errors?.army} />
        </div>

        <div className="col-12 col-md-4">
          <label htmlFor={`opp-detach-${suffix}`} className="form-label">
            Détachement
          </label>
          <input
            id={`opp-detach-${suffix}`}
            name="detachment"
            type="text"
            list={`detachments-${suffix}`}
            className="form-control"
            value={detachment}
            onChange={(event) => setDetachment(event.target.value)}
            autoComplete="off"
          />
          <datalist id={`detachments-${suffix}`}>
            {knownDetachments.map((known) => (
              <option key={known} value={known} />
            ))}
          </datalist>
        </div>

        <div className="col-12 col-md-4">
          <DispositionSelect
            id={`opp-disposition-${suffix}`}
            defaultValue={player?.disposition}
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor={`opp-rule-army-${suffix}`} className="form-label">
            Règle d&apos;armée
            {rulesLoaded && armyRule.length > 0 ? (
              <span className="badge text-bg-light ms-2">déjà connue</span>
            ) : null}
          </label>
          <textarea
            id={`opp-rule-army-${suffix}`}
            name="armyRule"
            className="form-control"
            rows={2}
            value={armyRule}
            onChange={(event) => {
              setArmyRule(event.target.value);
              setRulesLoaded(false);
            }}
            placeholder="Saisie une seule fois, réutilisée pour toutes les listes de cette armée."
          />
        </div>

        <div className="col-12 col-md-6">
          <label htmlFor={`opp-rule-detach-${suffix}`} className="form-label">
            Règle de détachement
          </label>
          <textarea
            id={`opp-rule-detach-${suffix}`}
            name="detachmentRule"
            className="form-control"
            rows={2}
            value={detachmentRule}
            onChange={(event) => setDetachmentRule(event.target.value)}
            disabled={detachment.trim().length === 0}
            placeholder={
              detachment.trim().length === 0
                ? "Renseigne d'abord un détachement."
                : "Saisie une seule fois, réutilisée."
            }
          />
        </div>

        <div className="col-12 col-md-8">
          <label htmlFor={`opp-listname-${suffix}`} className="form-label">
            Nom de la liste <span className="text-body-secondary">(optionnel)</span>
          </label>
          <input
            id={`opp-listname-${suffix}`}
            name="listName"
            type="text"
            className="form-control"
            defaultValue={player?.listName ?? ""}
            autoComplete="off"
          />
        </div>

        <div className="col-12">
          <label htmlFor={`opp-notes-${suffix}`} className="form-label">
            Notes du coach <span className="text-body-secondary">(optionnel)</span>
          </label>
          <textarea
            id={`opp-notes-${suffix}`}
            name="notes"
            className="form-control"
            rows={2}
            defaultValue={player?.notes ?? ""}
            placeholder="Ce qu'il faut repérer dans cette liste : combos, pièges, unités clés."
          />
          <div className="form-text">
            Visible par tes joueurs au moment de saisir leur estimé.
          </div>
        </div>

        <div className="col-12">
          <label htmlFor={`opp-list-${suffix}`} className="form-label">
            Liste complète <span className="text-body-secondary">(optionnel)</span>
          </label>
          <textarea
            id={`opp-list-${suffix}`}
            name="listContent"
            className="form-control font-monospace"
            rows={6}
            defaultValue={player?.listContent ?? ""}
            placeholder={"Personnages\nImotekh\nOverlord\n\nUnités\n20 Warriors\n10 Immortals"}
          />
          <div className="form-text">
            Colle la liste telle quelle. Les intitulés de section sont détectés pour
            l&apos;affichage ; rien n&apos;est perdu.
          </div>
        </div>

        <div className="col-12 d-flex gap-2">
          <SubmitButton label={player ? "Enregistrer" : "Ajouter le joueur"} />
          {player ? (
            <button type="button" className="btn btn-outline-secondary" onClick={onDone}>
              Annuler
            </button>
          ) : null}
        </div>
      </div>

      <FormMessage message={state.message} tone={state.errors ? "danger" : "success"} />
    </form>
  );
}
