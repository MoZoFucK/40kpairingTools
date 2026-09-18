-- Corrige les policies de `tournaments`, qui rendaient toute création impossible.
--
-- Symptôme : le coach crée un tournoi et reçoit « new row violates row-level security
-- policy ». L'INSERT passait pourtant : c'est le RETURNING qui était refusé.
--
-- Cause : `tournaments_select` appelait `can_read_tournament(id)`, qui vérifie la
-- propriété par une sous-requête sur `public.tournaments`. Or en PostgreSQL, une ligne
-- insérée par la commande en cours n'est pas visible aux sous-requêtes de cette même
-- commande. L'action `createTournament` fait `insert().select("id").single()`, donc un
-- INSERT ... RETURNING : la sous-requête ne voyait pas la ligne, la lecture échouait.
--
-- Correction : sur `tournaments`, la propriété se lit directement sur la ligne évaluée
-- (`created_by`), sans jamais relire la table. C'est aussi plus rapide.
--
-- Les policies de `teams` et `players` ne sont pas concernées : elles interrogent
-- `tournaments`, une table tierce dont la ligne existe déjà au moment du RETURNING.

-- Appartenance via un joueur rattaché à une équipe du tournoi. Isolée pour pouvoir être
-- utilisée sans passer par la table `tournaments`.
create function public.is_tournament_member(tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.players p
    join public.teams tm on tm.id = p.team_id
    where tm.tournament_id = tournament and p.user_id = auth.uid()
  );
$$;

drop policy tournaments_select on public.tournaments;
drop policy tournaments_update on public.tournaments;
drop policy tournaments_delete on public.tournaments;

create policy tournaments_select
  on public.tournaments for select
  using (
    created_by = auth.uid()
    or public.is_admin()
    or public.is_tournament_member(id)
  );

create policy tournaments_update
  on public.tournaments for update
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy tournaments_delete
  on public.tournaments for delete
  using (created_by = auth.uid() or public.is_admin());

-- `can_read_tournament` reste utilisée par `teams` et `players` ; elle est réécrite pour
-- s'appuyer sur la fonction d'appartenance plutôt que de dupliquer la jointure.
create or replace function public.can_read_tournament(tournament uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament and t.created_by = auth.uid()
    )
    or public.is_tournament_member(tournament);
$$;
