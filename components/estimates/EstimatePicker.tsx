"use client";

import { useState, useTransition } from "react";
import { estimateScale, type EstimateScaleSize } from "@/lib/estimates/scale";
import type { EstimateValue } from "@/types/domain";

/**
 * Saisie d'un estimé — §18, §36.
 *
 * Un bouton par niveau (cinq ou trois selon le tournoi) plutôt qu'une liste déroulante : sur téléphone, un estimé se pose d'un
 * pouce. L'enregistrement est immédiat, et son état est visible (§36) sans jamais
 * déplacer la mise en page.
 *
 * Le repère (chiffre ou initiale) reste toujours affiché : la couleur est une aide, jamais la seule
 * information (§44).
 */
export function EstimatePicker({
  value,
  scale,
  disabled = false,
  onSave,
}: {
  value: EstimateValue | null;
  scale: EstimateScaleSize;
  disabled?: boolean;
  onSave: (value: EstimateValue) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [current, setCurrent] = useState<EstimateValue | null>(value);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | undefined>();
  const [, startTransition] = useTransition();
  const levels = estimateScale(scale);

  function choose(next: EstimateValue) {
    if (disabled || status === "saving") {
      return;
    }

    const previous = current;
    setCurrent(next);
    setStatus("saving");
    setError(undefined);

    startTransition(async () => {
      const result = await onSave(next);
      if (result.ok) {
        setStatus("saved");
        return;
      }
      // Le serveur a refusé : on remet la valeur qu'il considère comme vraie.
      setCurrent(previous);
      setStatus("error");
      setError(result.message);
    });
  }

  return (
    <div>
      <div
        className="btn-group w-100"
        role="group"
        aria-label={scale === 3 ? "Estimé : défaite, égalité ou victoire" : "Estimé de 1 à 5"}
      >
        {levels.map((level) => {
          const selected = current === level.value;
          return (
            <button
              key={level.value}
              type="button"
              className={`btn ${selected ? level.className : "btn-outline-secondary"}`}
              aria-pressed={selected}
              aria-label={`${level.short} — ${level.label}`}
              title={level.label}
              disabled={disabled}
              onClick={() => choose(level.value)}
            >
              {/* Sur 3, le libellé tient en entier même au téléphone. */}
              {scale === 3 ? level.label : level.short}
            </button>
          );
        })}
      </div>

      <div className="small mt-1" style={{ minHeight: "1.25rem" }}>
        {status === "saving" ? (
          <span className="text-body-secondary">Enregistrement…</span>
        ) : null}
        {status === "saved" ? <span className="text-success">✓ Enregistré</span> : null}
        {status === "error" ? (
          <span className="text-danger">{error ?? "Échec de l'enregistrement."}</span>
        ) : null}
        {status === "idle" && current !== null ? (
          <span className="text-body-secondary">
            {levels.find((level) => level.value === current)?.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
