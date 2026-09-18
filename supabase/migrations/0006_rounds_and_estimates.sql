-- Rondes et estimés — cahier des charges §10.5, §10.6 et §18.

-- ---------------------------------------------------------------------------
-- E-mail sur le profil
-- ---------------------------------------------------------------------------
--
-- Le coach doit pouvoir rattacher un compte à une fiche joueur, donc désigner un compte.
-- `auth.users` n'est pas lisible depuis l'application : on recopie l'e-mail sur le profil.

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.user_id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, email)
  values (new.id, new.raw_user_meta_data ->> 'display_name', new.email);
  return new;
end;
$$;

-- Le coach a besoin de la liste des comptes pour les rattacher aux fiches joueurs.
create policy profiles_select_coach
  on public.profiles for select
  using (public.current_user_role() in ('COACH', 'ADMIN'));

-- ---------------------------------------------------------------------------
-- Rondes
-- ---------------------------------------------------------------------------

create type public.round_status as enum (
  'PREPARATION',
  'ESTIMATES_OPEN',
  'ESTIMATES_LOCKED',
  'PAIRING',
  'COMPLETED',
  'LOCKED'
);

create table public.rounds (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references public.tournaments (id) on delete cascade,
  number           integer not null check (number > 0),
  opponent_team_id uuid not null references public.teams (id) on delete restrict,
  scenario         text,
  status           public.round_status not null default 'PREPARATION',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index rounds_number_per_tournament
  on public.rounds (tournament_id, number);

create index rounds_opponent_idx on public.rounds (opponent_team_id);

create trigger rounds_touch
  before update on public.rounds
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Estimés
-- ---------------------------------------------------------------------------
--
-- Un estimé est une donnée utilisateur, jamais calculée (§57). Il lie un de nos joueurs à
-- un joueur adverse ; la ronde n'apparaît pas, elle se déduit de l'équipe adverse.

create table public.estimates (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid not null references public.players (id) on delete cascade,
  opponent_player_id  uuid not null references public.players (id) on delete cascade,
  value               smallint not null check (value between 1 and 5),
  comment             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index estimates_unique_pair
  on public.estimates (player_id, opponent_player_id);

create index estimates_opponent_idx on public.estimates (opponent_player_id);

create trigger estimates_touch
  before update on public.estimates
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Droits d'accès
-- ---------------------------------------------------------------------------

-- Toutes ces fonctions remontent jusqu'au tournoi par des tables tierces, jamais par la
-- table protégée elle-même : une sous-requête sur sa propre table ne verrait pas la ligne
-- insérée par la commande en cours, et casserait les INSERT ... RETURNING (cf. 0005).

create function public.tournament_of_player(player uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tm.tournament_id
  from public.players p
  join public.teams tm on tm.id = p.team_id
  where p.id = player;
$$;

create function public.owns_player(player uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.id = player and p.user_id = auth.uid()
  );
$$;

/*
 * La phase d'estimation est-elle ouverte pour cet adversaire ?
 *
 * L'estimé vise un joueur adverse, dont l'équipe est rattachée à une ronde. C'est le
 * statut de cette ronde qui fait foi, et le serveur seul (§18) : une ronde sans statut
 * connu reste modifiable, une ronde verrouillée ne l'est plus.
 *
 * Tant qu'aucune ronde ne référence l'équipe adverse, la saisie est libre : on est encore
 * en préparation.
 */
create function public.estimates_open_for(opponent_player uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    bool_and(r.status in ('PREPARATION', 'ESTIMATES_OPEN')),
    true
  )
  from public.players p
  join public.rounds r on r.opponent_team_id = p.team_id
  where p.id = opponent_player;
$$;

alter table public.rounds enable row level security;
alter table public.estimates enable row level security;

create policy rounds_select
  on public.rounds for select
  using (public.can_read_tournament(tournament_id));

create policy rounds_write
  on public.rounds for all
  using (public.can_manage_tournament(tournament_id))
  with check (public.can_manage_tournament(tournament_id));

-- Lecture : tout participant au tournoi. Le coach voit la matrice complète (§20), le
-- joueur a besoin de relire les siens.
create policy estimates_select
  on public.estimates for select
  using (public.can_read_tournament(public.tournament_of_player(player_id)));

-- Écriture : uniquement ses propres estimés, et uniquement phase ouverte (§8, §12, §18).
-- Le coach ne saisit pas à la place de ses joueurs.
create policy estimates_write
  on public.estimates for all
  using (
    public.is_admin()
    or (public.owns_player(player_id) and public.estimates_open_for(opponent_player_id))
  )
  with check (
    public.is_admin()
    or (public.owns_player(player_id) and public.estimates_open_for(opponent_player_id))
  );
