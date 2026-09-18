-- Disposition de liste, et saisie de sa propre liste par le joueur.

-- ---------------------------------------------------------------------------
-- Disposition
-- ---------------------------------------------------------------------------
--
-- Contrairement à l'armée et au détachement, laissés en texte libre (migration 0004), la
-- disposition est une liste fermée définie par le règlement : un enum est donc justifié.
--
-- Les libellés lisibles vivent dans `lib/lists/dispositions.ts`, pas ici : le §10.5 veut
-- une légende centralisée côté application plutôt que répétée dans chaque composant.

create type public.list_disposition as enum (
  'TAKE_AND_HOLD',
  'DISRUPTION',
  'PURGE_THE_FOE',
  'PRIORITY_ASSETS',
  'RECONNAISSANCE'
);

alter table public.players add column disposition public.list_disposition;

comment on column public.players.disposition is
  'Disposition de la liste au sens du règlement. Nulle tant qu''elle n''est pas renseignée.';

-- ---------------------------------------------------------------------------
-- Le joueur saisit sa propre liste
-- ---------------------------------------------------------------------------
--
-- Jusqu'ici seul le coach modifiait les fiches (migration 0003). Un joueur doit pouvoir
-- renseigner sa liste lui-même : c'est lui qui la connaît, et cela évite au coach de
-- retaper six listes.

create policy players_update_own
  on public.players for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

/*
 * Une policy UPDATE ne sait pas restreindre les colonnes modifiables. Ce trigger s'en
 * charge : un joueur ne touche qu'à sa liste.
 *
 * Restent verrouillés pour lui :
 *   - `team_id` et `user_id`, sans quoi il pourrait se rattacher ailleurs ou s'approprier
 *     une autre fiche ;
 *   - `name`, qui relève du roster tenu par le coach ;
 *   - `notes`, qui est l'analyse du coach sur la liste, pas une donnée du joueur.
 *
 * SECURITY INVOKER (le défaut) : `current_user` doit désigner l'appelant pour reconnaître
 * `service_role`, comme dans la migration 0002.
 */
create function public.guard_player_self_update()
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

  return new;
end;
$$;

create trigger players_guard_self_update
  before update on public.players
  for each row execute function public.guard_player_self_update();
