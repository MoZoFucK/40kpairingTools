"use client";

import { useFormStatus } from "react-dom";

/**
 * Design system minimal (§43) : les états d'interface communs à tous les formulaires —
 * Loading, Saving, Saved, Error (§36) — au lieu de les redéclarer dans chaque écran.
 */

export function SubmitButton({
  label,
  busyLabel,
  className = "btn btn-primary",
}: {
  label: string;
  busyLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (busyLabel ?? "Enregistrement…") : label}
    </button>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <div className="invalid-feedback d-block">{message}</div>;
}

export function FormMessage({
  message,
  tone = "success",
}: {
  message?: string;
  tone?: "success" | "danger";
}) {
  if (!message) {
    return null;
  }
  return (
    <div className={`alert alert-${tone} py-2 mt-3 mb-0`} role="status">
      {message}
    </div>
  );
}
