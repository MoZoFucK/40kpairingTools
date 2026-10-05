"use client";

import { useId, useState, useTransition } from "react";
import { ESTIMATE_COMMENT_MAX_LENGTH } from "@/lib/estimates/comment";

/**
 * Commentaire facultatif qui accompagne un estimé.
 *
 * Enregistré quand le champ perd le focus, comme la note s'enregistre au clic : aucun
 * bouton de plus à trouver sur un téléphone. Le coach le lit sur la matrice et pendant le
 * pairing.
 *
 * Désactivé tant qu'aucune note n'est posée : le commentaire l'accompagne, il n'existe pas
 * seul.
 */
export function EstimateCommentField({
  initial,
  hasValue,
  disabled = false,
  onSave,
}: {
  initial: string | null;
  hasValue: boolean;
  disabled?: boolean;
  onSave: (comment: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const id = useId();
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | undefined>();
  const [, startTransition] = useTransition();

  const locked = disabled || !hasValue;

  function save() {
    if (locked || text.trim() === saved.trim()) {
      return;
    }

    setStatus("saving");
    setError(undefined);

    startTransition(async () => {
      const result = await onSave(text);
      if (result.ok) {
        setSaved(text);
        setStatus("saved");
        return;
      }
      setStatus("error");
      setError(result.message);
    });
  }

  return (
    <div className="mt-2">
      <label htmlFor={id} className="form-label small text-body-secondary mb-1">
        Commentaire pour le coach <span className="fw-normal">(facultatif)</span>
      </label>
      <textarea
        id={id}
        className="form-control form-control-sm"
        rows={2}
        maxLength={ESTIMATE_COMMENT_MAX_LENGTH}
        placeholder={hasValue ? "Ex. : dépend du déploiement" : "Pose d'abord ta note"}
        value={text}
        disabled={locked}
        onChange={(event) => {
          setText(event.target.value);
          setStatus("idle");
        }}
        onBlur={save}
      />
      <div className="small mt-1 d-flex justify-content-between" style={{ minHeight: "1.25rem" }}>
        <span>
          {status === "saving" ? (
            <span className="text-body-secondary">Enregistrement…</span>
          ) : null}
          {status === "saved" ? <span className="text-success">✓ Commentaire enregistré</span> : null}
          {status === "error" ? (
            <span className="text-danger">{error ?? "Échec de l'enregistrement."}</span>
          ) : null}
        </span>
        {!locked && text.length > 0 ? (
          <span className="text-body-secondary">
            {text.length}/{ESTIMATE_COMMENT_MAX_LENGTH}
          </span>
        ) : null}
      </div>
    </div>
  );
}
