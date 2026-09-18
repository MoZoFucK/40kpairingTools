-- Journal de pairing et matchs — cahier des charges §10.7, §10.8, §28, §29, §41.
--
-- L'état du pairing n'est jamais stocké : il est reconstruit en rejouant les actions
-- (§29, stratégie 1). Cette table est donc la seule source de vérité, et l'undo se réduit
-- à supprimer la dernière action puis à rejouer.

create type public.pairing_action_type as enum (
  'SELECT_DEFENDER',
  'PROPOSE_ATTACKERS',
  'RETAIN_ATTACKER'
);

create table public.pairing_actions (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references public.rounds (id) on delete cascade,
  -- Rang dans le déroulé, à partir de 0. L'historique se lit dans cet ordre (§28).
  sequence   integer not null check (sequence >= 0),
  type       public.pairing_action_type not null,
  -- Le côté concerné : celui qui désigne son défenseur, ou celui qui défend face aux
  -- attaquants proposés. Voir lib/pairing/types.ts pour cette convention.
  side       text not null check (side in ('US', 'THEM')),
  -- Un joueur pour un défenseur ou un attaquant retenu, deux pour une proposition.
  player_ids uuid[] not null check (array_length(player_ids, 1) between 1 and 2),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Gestion de concurrence (§41), sans verrou applicatif : deux coachs qui agissent au même
-- instant calculent le même `sequence`, et la base en rejette un. Le client perdant
-- recharge l'état plutôt que de produire un pairing incohérent.
create unique index pairing_actions_sequence
  on public.pairing_actions (round_id, sequence);

create index pairing_actions_round_idx on public.pairing_actions (round_id, sequence);

-- Matchs définitifs, écrits une fois le pairing complet. Ils portent le numéro de table,
-- seule donnée du pairing qui ne se déduise pas des actions (§30).
create type public.match_origin as enum (
  'SELECTED',
  'REJECTED_PAIR',
  'REMAINING_PAIR'
);

create table public.matches (
  id                 uuid primary key default gen_random_uuid(),
  round_id           uuid not null references public.rounds (id) on delete cascade,
  our_player_id      uuid not null references public.players (id) on delete cascade,
  opponent_player_id uuid not null references public.players (id) on delete cascade,
  origin             public.match_origin not null,
  step_index         integer not null,
  table_number       integer check (table_number > 0),
  created_at         timestamptz not null default now()
);

-- Un joueur n'apparaît qu'une fois par ronde, de chaque côté (§31).
create unique index matches_unique_our_player on public.matches (round_id, our_player_id);
create unique index matches_unique_opponent on public.matches (round_id, opponent_player_id);

-- ---------------------------------------------------------------------------
-- Droits d'accès
-- ---------------------------------------------------------------------------

create function public.tournament_of_round(round uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tournament_id from public.rounds where id = round;
$$;

-- Une ronde verrouillée n'est plus modifiable, par personne (§39).
create function public.round_is_open(round uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select r.status <> 'LOCKED' from public.rounds r where r.id = round),
    false
  );
$$;

alter table public.pairing_actions enable row level security;
alter table public.matches enable row level security;

create policy pairing_actions_select
  on public.pairing_actions for select
  using (public.can_read_tournament(public.tournament_of_round(round_id)));

create policy pairing_actions_write
  on public.pairing_actions for all
  using (
    public.can_manage_tournament(public.tournament_of_round(round_id))
    and public.round_is_open(round_id)
  )
  with check (
    public.can_manage_tournament(public.tournament_of_round(round_id))
    and public.round_is_open(round_id)
  );

create policy matches_select
  on public.matches for select
  using (public.can_read_tournament(public.tournament_of_round(round_id)));

create policy matches_write
  on public.matches for all
  using (
    public.can_manage_tournament(public.tournament_of_round(round_id))
    and public.round_is_open(round_id)
  )
  with check (
    public.can_manage_tournament(public.tournament_of_round(round_id))
    and public.round_is_open(round_id)
  );
