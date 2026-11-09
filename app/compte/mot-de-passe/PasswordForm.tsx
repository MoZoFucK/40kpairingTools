"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type PasswordFormState } from "./actions";

const EMPTY: PasswordFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary w-100" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
    </button>
  );
}

export function PasswordForm({ email }: { email: string | null }) {
  const [state, action] = useActionState(updatePassword, EMPTY);

  if (state.notice) {
    return (
      <>
        <div className="alert alert-success py-2" role="status">
          {state.notice}
        </div>
        <Link href="/dashboard" className="btn btn-primary w-100">
          Aller au tableau de bord
        </Link>
      </>
    );
  }

  return (
    <form action={action} noValidate>
      {/* Aide les gestionnaires de mots de passe à associer le nouveau mot de passe au bon compte. */}
      <input
        type="email"
        name="username"
        value={email ?? ""}
        autoComplete="username"
        readOnly
        hidden
      />

      <div className="mb-3">
        <label htmlFor="password" className="form-label">
          Nouveau mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="form-control"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <div className="form-text">8 caractères minimum.</div>
      </div>

      <div className="mb-3">
        <label htmlFor="confirmation" className="form-label">
          Confirmation
        </label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          className="form-control"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state.error ? (
        <div className="alert alert-danger py-2" role="alert">
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
