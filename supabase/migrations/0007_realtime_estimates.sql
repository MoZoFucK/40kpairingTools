-- Diffusion temps réel des estimés — cahier des charges §19 et §40.
--
-- Le §40 demande des abonnements limités au tournoi courant, et non à toute la table.
-- Or le filtre Realtime de Supabase ne sait comparer qu'une colonne de la ligne diffusée :
-- il ne peut pas remonter `estimates → players → teams → tournaments`.
--
-- On dénormalise donc `tournament_id` sur `estimates`. La colonne est posée par un
-- trigger, jamais par l'application : elle ne peut pas diverger de la fiche joueur, et le
-- client n'a aucun moyen de la falsifier pour s'abonner au tournoi d'une autre équipe.

alter table public.estimates add column tournament_id uuid references public.tournaments (id) on delete cascade;

create function public.set_estimate_tournament()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.tournament_id := public.tournament_of_player(new.player_id);
  return new;
end;
$$;

create trigger estimates_set_tournament
  before insert or update of player_id on public.estimates
  for each row execute function public.set_estimate_tournament();

update public.estimates
set tournament_id = public.tournament_of_player(player_id)
where tournament_id is null;

alter table public.estimates alter column tournament_id set not null;

create index estimates_tournament_idx on public.estimates (tournament_id);

-- Publication Realtime. La RLS continue de s'appliquer à la diffusion : un utilisateur ne
-- reçoit que les lignes qu'il aurait le droit de lire.
alter publication supabase_realtime add table public.estimates;

-- `REPLICA IDENTITY FULL` est nécessaire pour que les événements UPDATE et DELETE portent
-- l'ancienne ligne ; sans elle, seul l'identifiant serait diffusé et le client ne saurait
-- pas quelle case rafraîchir.
alter table public.estimates replica identity full;
