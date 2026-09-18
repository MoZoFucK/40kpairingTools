-- Tournois, équipes et joueurs — cahier des charges §10.1 à §10.3.
--
-- Une seule table `teams` porte notre équipe et les équipes adverses, distinguées par
-- `kind` (§10.2) : leurs colonnes sont identiques, deux tables ne feraient que dupliquer
-- les contraintes et les policies.

-- Horodatage de modification, partagé par toutes les tables qui en ont besoin.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.tournaments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  -- La taille d'équipe est configurable (§7). Paire et raisonnable : le protocole de
  -- pairing consomme deux joueurs par étape et en apparie deux à la clôture.
  team_size  integer not null default 6
             check (team_size >= 4 and team_size <= 12 and team_size % 2 = 0),
  -- Le coach propriétaire. Pour le MVP, c'est lui seul (ou un admin) qui administre le
  -- tournoi ; un second coach relève d'une évolution ultérieure.
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tournaments_touch
  before update on public.tournaments
  for each row execute function public.touch_updated_at();

create type public.team_kind as enum ('OUR_TEAM', 'OPPONENT');

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  kind          public.team_kind not null,
  name          text not null check (length(trim(name)) > 0),
  short_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index teams_tournament_idx on public.teams (tournament_id);

-- Un tournoi n'a qu'une seule « notre équipe ». Les adverses sont libres : une par ronde
-- rencontrée, conservées dans l'historique (§14).
create unique index teams_single_our_team
  on public.teams (tournament_id)
  where kind = 'OUR_TEAM';

create trigger teams_touch
  before update on public.teams
  for each row execute function public.touch_updated_at();

create table public.players (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams (id) on delete cascade,
  -- Absent pour les joueurs adverses, qui n'ont pas de compte (§10.3).
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null check (length(trim(name)) > 0),
  army       text not null check (length(trim(army)) > 0),
  detachment text,
  list_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_team_idx on public.players (team_id);
create index players_user_idx on public.players (user_id) where user_id is not null;

-- Un compte ne peut être rattaché qu'à un seul joueur d'une même équipe.
create unique index players_single_account_per_team
  on public.players (team_id, user_id)
  where user_id is not null;

create trigger players_touch
  before update on public.players
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Droits d'accès
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER : ces fonctions sont appelées depuis les policies et doivent donc
-- lire les tables sans redéclencher la RLS, sous peine de récursion infinie.

-- Lecture : le propriétaire du tournoi, tout joueur qui y participe, et l'admin.
create function public.can_read_tournament(tournament uuid)
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
    or exists (
      select 1
      from public.players p
      join public.teams tm on tm.id = p.team_id
      where tm.tournament_id = tournament and p.user_id = auth.uid()
    );
$$;

-- Écriture : le propriétaire du tournoi et l'admin. Un joueur ne modifie jamais une
-- équipe ni un roster (§8).
create function public.can_manage_tournament(tournament uuid)
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
    );
$$;

create function public.tournament_of_team(team uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tournament_id from public.teams where id = team;
$$;

alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;

create policy tournaments_select
  on public.tournaments for select
  using (public.can_read_tournament(id));

-- Seul un coach ou un admin crée un tournoi, et uniquement en son nom.
create policy tournaments_insert
  on public.tournaments for insert
  with check (
    created_by = auth.uid()
    and public.current_user_role() in ('COACH', 'ADMIN')
  );

create policy tournaments_update
  on public.tournaments for update
  using (public.can_manage_tournament(id))
  with check (public.can_manage_tournament(id));

create policy tournaments_delete
  on public.tournaments for delete
  using (public.can_manage_tournament(id));

create policy teams_select
  on public.teams for select
  using (public.can_read_tournament(tournament_id));

create policy teams_write
  on public.teams for all
  using (public.can_manage_tournament(tournament_id))
  with check (public.can_manage_tournament(tournament_id));

create policy players_select
  on public.players for select
  using (public.can_read_tournament(public.tournament_of_team(team_id)));

create policy players_write
  on public.players for all
  using (public.can_manage_tournament(public.tournament_of_team(team_id)))
  with check (public.can_manage_tournament(public.tournament_of_team(team_id)));
