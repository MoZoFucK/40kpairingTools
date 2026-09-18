"use client";

import { linkPlayerAccount } from "./rounds/actions";

export interface AccountOption {
  userId: string;
  label: string;
}

/**
 * Rattache un compte à une fiche joueur.
 *
 * C'est ce lien qui permet ensuite à chacun de saisir ses estimés, et seulement les siens
 * (§8, §12). Sans lui, un joueur connecté ne voit rien du tournoi.
 *
 * Le formulaire se soumet au changement : un rattachement est un geste ponctuel, un bouton
 * « Enregistrer » de plus n'apporterait rien.
 */
export function AccountLink({
  tournamentId,
  playerId,
  currentUserId,
  accounts,
}: {
  tournamentId: string;
  playerId: string;
  currentUserId: string | null;
  accounts: readonly AccountOption[];
}) {
  return (
    <form action={linkPlayerAccount}>
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="playerId" value={playerId} />

      <label htmlFor={`link-${playerId}`} className="visually-hidden">
        Compte rattaché
      </label>
      <select
        id={`link-${playerId}`}
        name="userId"
        className="form-select form-select-sm"
        defaultValue={currentUserId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Aucun compte</option>
        {accounts.map((account) => (
          <option key={account.userId} value={account.userId}>
            {account.label}
          </option>
        ))}
      </select>
    </form>
  );
}
