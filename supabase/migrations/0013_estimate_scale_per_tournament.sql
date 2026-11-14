-- Échelle des estimés choisie par tournoi : sur 5 (1 à 5) ou sur 3 (Défaite / Égalité /
-- Victoire).
--
-- L'échelle sur 3 réutilise les valeurs 1, 3 et 5 : la colonne `estimates.value` et sa
-- contrainte `between 1 and 5` ne changent pas, et tout ce qui lit une valeur (couleurs,
-- pairing, historique) reste valable d'une échelle à l'autre.

alter table public.tournaments
  add column estimate_scale smallint not null default 5
    check (estimate_scale in (3, 5));

-- ---------------------------------------------------------------------------
-- Un estimé respecte l'échelle de son tournoi
-- ---------------------------------------------------------------------------
--
-- L'application le vérifie déjà (saveEstimate) ; le trigger le reprend parce qu'un joueur
-- peut écrire dans `estimates` directement par l'API REST avec son propre jeton.

create function public.guard_estimate_scale()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_scale smallint;
begin
  select t.estimate_scale into v_scale
  from public.tournaments t
  where t.id = public.tournament_of_player(new.player_id);

  if v_scale = 3 and new.value not in (1, 3, 5) then
    raise exception 'Ce tournoi note les estimés sur 3 : Défaite, Égalité ou Victoire.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger estimates_guard_scale
  before insert or update of value on public.estimates
  for each row execute function public.guard_estimate_scale();

-- ---------------------------------------------------------------------------
-- Passer un tournoi sur 3 n'invalide aucun estimé déjà saisi
-- ---------------------------------------------------------------------------
--
-- Un 2 ou un 4 n'a pas d'équivalent sur 3 ; plutôt que de l'arrondir dans le dos des
-- joueurs, on refuse le changement. Le retour sur 5 est toujours possible.

create function public.guard_tournament_scale_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estimate_scale = 3
     and old.estimate_scale is distinct from 3
     and exists (
       select 1
       from public.estimates e
       join public.players p on p.id = e.player_id
       join public.teams tm on tm.id = p.team_id
       where tm.tournament_id = new.id
         and e.value in (2, 4)
     ) then
    raise exception 'estimate_scale_conflict: des estimés à 2 ou 4 existent déjà dans ce tournoi.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tournaments_guard_scale_change
  before update of estimate_scale on public.tournaments
  for each row execute function public.guard_tournament_scale_change();
