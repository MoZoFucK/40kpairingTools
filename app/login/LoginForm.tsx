"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, signIn, type AuthFormState } from "./actions";

const EMPTY: AuthFormState = {};

function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn-primary w-100" disabled={pending}>
      {pending ? busy : label}
    </button>
  );
}

export function LoginForm({ suite }: { suite: string }) {
  const [signInState, signInAction] = useActionState(signIn, EMPTY);
  const [resetState, resetAction] = useActionState(requestPasswordReset, EMPTY);

  return (
    <>
      <form action={signInAction} noValidate>
        <input type="hidden" name="suite" value={suite} />

        <div className="mb-3">
          <label htmlFor="email" className="form-label">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-control"
            autoComplete="email"
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="form-label">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            required
          />
        </div>

        {signInState.error ? (
          <div className="alert alert-danger py-2" role="alert">
            {signInState.error}
          </div>
        ) : null}

        <SubmitButton label="Se connecter" busy="Connexion…" />
      </form>

      <hr className="my-4" />

      <form action={resetAction}>
        <p className="text-body-secondary small mb-2">Mot de passe oublié ?</p>
        <div className="input-group">
          <input
            name="email"
            type="email"
            className="form-control"
            placeholder="Adresse e-mail"
            aria-label="Adresse e-mail pour la réinitialisation"
            required
          />
          <button type="submit" className="btn btn-outline-secondary">
            Envoyer un lien
          </button>
        </div>

        {resetState.error ? (
          <div className="alert alert-danger py-2 mt-3" role="alert">
            {resetState.error}
          </div>
        ) : null}
        {resetState.notice ? (
          <div className="alert alert-info py-2 mt-3" role="status">
            {resetState.notice}
          </div>
        ) : null}
      </form>
    </>
  );
}
