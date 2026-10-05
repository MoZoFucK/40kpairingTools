-- Un joueur ne modifie plus sa liste une fois le tournoi clos.
--
-- Un tournoi est clos quand toutes ses rondes sont verrouillées. Ses listes font alors
-- partie de son historique : les modifier réécrirait ce que la consultation des rondes
-- passées affiche. Le coach garde la main — c'est lui qui tient les fiches.
--
-- L'application applique déjà la règle (lib/rounds/status.ts, isTournamentClosed). Elle
-- est reprise ici parce qu'un joueur peut écrire dans `players` directement par l'API
-- REST avec son propre jeton : la policy `players_update_own` (migration 0010) le lui
-- permet, et seul ce trigger s'interpose.

/*
 * SECURITY DEFINER : le résultat ne doit pas dépendre de ce que la RLS laisse voir à
 * l'appelant. Un tournoi sans ronde n'est pas clos — il n'a pas encore commencé.
 */
create function public.is_tournament_closed(tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.rounds where tournament_id = tournament)
     and not exists (
       select 1 from public.rounds
       where tournament_id = tournament and status <> 'LOCKED'
     );
$$;

/*
 * Reprend la garde de la migration 0010 et y ajoute la fermeture du tournoi.
 *
 * Le contrôle des colonnes reste en tête : il répond à une autre question (qu'est-ce
 * qu'un joueur a le droit de toucher), et son message reste le plus précis quand il
 * s'applique.
 */
create or replace function public.guard_player_self_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'service_role'
     or public.can_manage_tournament(public.tournament_of_team(old.team_id)) then
    return new;
  end if;

  if new.team_id is distinct from old.team_id
     or new.user_id is distinct from old.user_id
     or new.name is distinct from old.name
     or new.notes is distinct from old.notes then
    raise exception 'Tu ne peux modifier que ta propre liste.'
      using errcode = '42501';
  end if;

  if public.is_tournament_closed(public.tournament_of_team(old.team_id)) then
    raise exception 'Ce tournoi est terminé : ta liste n''est plus modifiable.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
